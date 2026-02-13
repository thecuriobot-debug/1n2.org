<?php
/**
 * =============================================
 * 1n2.org Modular Auth System
 * =============================================
 * 
 * Passwordless email login: enter email → get code → enter code → logged in.
 * 
 * USAGE IN ANY APP:
 *   require_once __DIR__ . '/../auth/Auth.php';
 *   $auth = new Auth(getDB());
 * 
 *   // Check if logged in
 *   $user = $auth->getCurrentUser();
 * 
 *   // Require login (redirects if not authenticated)
 *   $user = $auth->requireLogin('/auth/login.php');
 * 
 *   // Send login code
 *   $auth->sendLoginCode('user@example.com');
 * 
 *   // Verify code and login
 *   $auth->verifyCodeAndLogin('user@example.com', '123456');
 * 
 *   // Logout
 *   $auth->logout();
 * 
 *   // Get/set per-app profile data
 *   $auth->setProfile($userId, 'medialog', 'goodreads_url', 'https://...');
 *   $val = $auth->getProfile($userId, 'medialog', 'goodreads_url');
 * 
 * EMAIL BACKENDS:
 *   'log'       — Dev mode: shows code on screen, logs to /tmp (DEFAULT)
 *   'php_mail'  — Uses PHP mail() function (needs working MTA)
 *   'sendgrid'  — SendGrid HTTP API (set email_api_key)
 *   'brevo'     — Brevo/Sendinblue HTTP API (set email_api_key)
 *   'mailgun'   — Mailgun HTTP API (set email_api_key + email_api_domain)
 */

class Auth {
    private PDO $db;
    private string $cookieName = '1n2_auth_token';
    private int $sessionDays = 30;
    private int $codeMinutes = 10;
    private int $codeLength = 6;
    private string $fromEmail = 'noreply@1n2.org';
    private string $fromName = '1n2.org';
    
    // Email backend config
    private string $emailBackend = 'log';
    private string $emailApiKey = '';
    private string $emailApiDomain = '';  // For Mailgun
    
    // Dev mode: store last code for display
    public ?string $lastCode = null;
    
    // Rate limits
    private int $maxCodesPerHour = 5;
    private int $maxAttemptsPerHour = 10;
    
    public function __construct(PDO $db, array $config = []) {
        $this->db = $db;
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (isset($config['email_backend']))    $this->emailBackend = $config['email_backend'];
        if (isset($config['email_api_key']))    $this->emailApiKey = $config['email_api_key'];
        if (isset($config['email_api_domain'])) $this->emailApiDomain = $config['email_api_domain'];
        if (isset($config['from_email']))       $this->fromEmail = $config['from_email'];
        if (isset($config['from_name']))        $this->fromName = $config['from_name'];
    }
    
    // =========================================
    // PUBLIC API
    // =========================================
    
    public function getCurrentUser(): ?array {
        $token = $_COOKIE[$this->cookieName] ?? null;
        if (!$token) return null;
        
        $stmt = $this->db->prepare("
            SELECT u.* FROM auth_users u
            JOIN auth_sessions s ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > NOW()
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            $this->clearCookie();
            return null;
        }
        return $user;
    }
    
    public function requireLogin(string $loginUrl = '/auth/login.php', ?string $returnTo = null): array {
        $user = $this->getCurrentUser();
        if ($user) return $user;
        
        $returnTo = $returnTo ?? $_SERVER['REQUEST_URI'];
        header('Location: ' . $loginUrl . '?return=' . urlencode($returnTo));
        exit;
    }
    
    public function sendLoginCode(string $email): array {
        $email = strtolower(trim($email));
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Please enter a valid email address.'];
        }
        
        if ($this->isRateLimited($email, 'code_request', $this->maxCodesPerHour)) {
            return ['success' => false, 'message' => 'Too many login attempts. Please try again in an hour.'];
        }
        
        $user = $this->findOrCreateUser($email);
        
        // Invalidate existing unused codes
        $this->db->prepare("UPDATE auth_login_codes SET used = 1 WHERE user_id = ? AND used = 0")
                 ->execute([$user['id']]);
        
        $code = $this->generateCode();
        
        $stmt = $this->db->prepare("
            INSERT INTO auth_login_codes (user_id, code, expires_at)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
        ");
        $stmt->execute([$user['id'], $code, $this->codeMinutes]);
        
        $this->recordRateLimit($email, 'code_request');
        $this->lastCode = $code;
        
        // Send via configured backend
        $sent = $this->sendCodeEmail($email, $code);
        
        if ($this->emailBackend === 'log') {
            return [
                'success' => true,
                'message' => "Your login code is: <strong>$code</strong><br><small style='color:#888'>Email delivery is being configured. Code shown here temporarily.</small>"
            ];
        }
        
        if (!$sent) {
            return ['success' => false, 'message' => 'Failed to send email. Please try again.'];
        }
        
        return ['success' => true, 'message' => 'Login code sent! Check your email.'];
    }
    
    public function verifyCodeAndLogin(string $email, string $code): array {
        $email = strtolower(trim($email));
        $code = trim($code);
        
        if ($this->isRateLimited($email, 'code_verify', $this->maxAttemptsPerHour)) {
            return ['success' => false, 'message' => 'Too many attempts. Please request a new code.', 'user' => null];
        }
        
        $this->recordRateLimit($email, 'code_verify');
        
        $stmt = $this->db->prepare("SELECT id FROM auth_users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return ['success' => false, 'message' => 'Invalid code.', 'user' => null];
        }
        
        $stmt = $this->db->prepare("
            SELECT id FROM auth_login_codes 
            WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$user['id'], $code]);
        $loginCode = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$loginCode) {
            return ['success' => false, 'message' => 'Invalid or expired code. Please try again.', 'user' => null];
        }
        
        $this->db->prepare("UPDATE auth_login_codes SET used = 1 WHERE id = ?")
                 ->execute([$loginCode['id']]);
        
        $this->db->prepare("UPDATE auth_users SET last_login_at = NOW() WHERE id = ?")
                 ->execute([$user['id']]);
        
        $token = $this->createSession($user['id']);
        $this->setCookie($token);
        
        $stmt = $this->db->prepare("SELECT * FROM auth_users WHERE id = ?");
        $stmt->execute([$user['id']]);
        $fullUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return ['success' => true, 'message' => 'Welcome back!', 'user' => $fullUser];
    }
    
    public function logout(): void {
        $token = $_COOKIE[$this->cookieName] ?? null;
        if ($token) {
            $this->db->prepare("DELETE FROM auth_sessions WHERE token = ?")->execute([$token]);
        }
        $this->clearCookie();
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }
    
    // =========================================
    // PROFILE DATA (per-app key-value store)
    // =========================================
    
    public function getProfile(int $userId, string $appName, string $key): ?string {
        $stmt = $this->db->prepare("
            SELECT profile_value FROM auth_user_profiles
            WHERE user_id = ? AND app_name = ? AND profile_key = ?
        ");
        $stmt->execute([$userId, $appName, $key]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['profile_value'] : null;
    }
    
    public function setProfile(int $userId, string $appName, string $key, ?string $value): void {
        $stmt = $this->db->prepare("
            INSERT INTO auth_user_profiles (user_id, app_name, profile_key, profile_value)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE profile_value = VALUES(profile_value)
        ");
        $stmt->execute([$userId, $appName, $key, $value]);
    }
    
    public function getAllProfiles(int $userId, string $appName): array {
        $stmt = $this->db->prepare("
            SELECT profile_key, profile_value FROM auth_user_profiles
            WHERE user_id = ? AND app_name = ?
        ");
        $stmt->execute([$userId, $appName]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result = [];
        foreach ($rows as $row) {
            $result[$row['profile_key']] = $row['profile_value'];
        }
        return $result;
    }
    
    public function deleteProfile(int $userId, string $appName, string $key): void {
        $this->db->prepare("DELETE FROM auth_user_profiles WHERE user_id = ? AND app_name = ? AND profile_key = ?")
                 ->execute([$userId, $appName, $key]);
    }
    
    public function isAdmin(?array $user = null): bool {
        $user = $user ?? $this->getCurrentUser();
        return $user && ($user['is_admin'] ?? 0) == 1;
    }
    
    public function updateDisplayName(int $userId, string $name): void {
        $this->db->prepare("UPDATE auth_users SET display_name = ? WHERE id = ?")
                 ->execute([trim($name), $userId]);
    }
    
    public function cleanup(): void {
        $this->db->exec("DELETE FROM auth_sessions WHERE expires_at < NOW()");
        $this->db->exec("DELETE FROM auth_login_codes WHERE expires_at < NOW()");
        $this->db->exec("DELETE FROM auth_rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 2 HOUR)");
    }
    
    // =========================================
    // PRIVATE HELPERS
    // =========================================
    
    private function findOrCreateUser(string $email): array {
        $stmt = $this->db->prepare("SELECT * FROM auth_users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) return $user;
        
        $this->db->prepare("INSERT INTO auth_users (email) VALUES (?)")->execute([$email]);
        $stmt = $this->db->prepare("SELECT * FROM auth_users WHERE id = ?");
        $stmt->execute([$this->db->lastInsertId()]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    private function generateCode(): string {
        return str_pad(random_int(0, 999999), $this->codeLength, '0', STR_PAD_LEFT);
    }
    
    private function createSession(int $userId): string {
        $token = bin2hex(random_bytes(64));
        $this->db->prepare("
            INSERT INTO auth_sessions (user_id, token, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
        ")->execute([
            $userId, $token,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
            $this->sessionDays
        ]);
        return $token;
    }
    
    private function setCookie(string $token): void {
        setcookie($this->cookieName, $token, [
            'expires'  => time() + ($this->sessionDays * 86400),
            'path'     => '/',
            'secure'   => true,
            'httponly'  => true,
            'samesite' => 'Lax'
        ]);
        $_COOKIE[$this->cookieName] = $token;
    }
    
    private function clearCookie(): void {
        setcookie($this->cookieName, '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'secure'   => true,
            'httponly'  => true,
            'samesite' => 'Lax'
        ]);
        unset($_COOKIE[$this->cookieName]);
    }
    
    // =========================================
    // EMAIL SENDING (multi-backend)
    // =========================================
    
    private function sendCodeEmail(string $email, string $code): bool {
        $subject = "Your 1n2.org login code: $code";
        $html = $this->buildCodeEmailHtml($code);
        
        switch ($this->emailBackend) {
            case 'sendgrid':  return $this->sendViaSendGrid($email, $subject, $html);
            case 'brevo':     return $this->sendViaBrevo($email, $subject, $html);
            case 'mailgun':   return $this->sendViaMailgun($email, $subject, $html);
            case 'php_mail':  return $this->sendViaPhpMail($email, $subject, $html);
            case 'log':
            default:
                file_put_contents('/tmp/1n2_auth_codes.log',
                    date('Y-m-d H:i:s') . " | $email | $code\n", FILE_APPEND);
                return true;
        }
    }
    
    private function buildCodeEmailHtml(string $code): string {
        return <<<HTML
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 40px 20px;">
<div style="max-width: 420px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">1n2.org</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Human + AI</p>
    </div>
    <div style="padding: 40px 30px; text-align: center;">
        <p style="color: #333; font-size: 16px; margin-bottom: 25px;">Your login code is:</p>
        <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #667eea; font-family: monospace;">$code</span>
        </div>
        <p style="color: #888; font-size: 13px; margin-bottom: 5px;">This code expires in 10 minutes.</p>
        <p style="color: #aaa; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="background: #f8f9fa; padding: 15px 30px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 11px; margin: 0;">&copy; 2026 1n2.org</p>
    </div>
</div>
</body>
</html>
HTML;
    }
    
    private function sendViaPhpMail(string $email, string $subject, string $html): bool {
        $headers  = "From: {$this->fromName} <{$this->fromEmail}>\r\n";
        $headers .= "Reply-To: {$this->fromEmail}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        return mail($email, $subject, $html, $headers, "-f{$this->fromEmail}");
    }
    
    private function sendViaSendGrid(string $to, string $subject, string $html): bool {
        $data = [
            'personalizations' => [['to' => [['email' => $to]]]],
            'from' => ['email' => $this->fromEmail, 'name' => $this->fromName],
            'subject' => $subject,
            'content' => [['type' => 'text/html', 'value' => $html]]
        ];
        $ch = curl_init('https://api.sendgrid.com/v3/mail/send');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->emailApiKey,
                'Content-Type: application/json'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $code >= 200 && $code < 300;
    }
    
    private function sendViaBrevo(string $to, string $subject, string $html): bool {
        $data = [
            'sender' => ['name' => $this->fromName, 'email' => $this->fromEmail],
            'to' => [['email' => $to]],
            'subject' => $subject,
            'htmlContent' => $html
        ];
        $ch = curl_init('https://api.brevo.com/v3/smtp/email');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'api-key: ' . $this->emailApiKey,
                'Content-Type: application/json',
                'Accept: application/json'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $code >= 200 && $code < 300;
    }
    
    private function sendViaMailgun(string $to, string $subject, string $html): bool {
        $domain = $this->emailApiDomain;
        $ch = curl_init("https://api.mailgun.net/v3/$domain/messages");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_USERPWD => 'api:' . $this->emailApiKey,
            CURLOPT_POSTFIELDS => [
                'from' => "{$this->fromName} <{$this->fromEmail}>",
                'to' => $to,
                'subject' => $subject,
                'html' => $html
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $code === 200;
    }
    
    // =========================================
    // RATE LIMITING
    // =========================================
    
    private function isRateLimited(string $identifier, string $action, int $maxAttempts): bool {
        $stmt = $this->db->prepare("
            SELECT SUM(attempts) as total FROM auth_rate_limits
            WHERE identifier = ? AND action = ? AND window_start > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $stmt->execute([$identifier, $action]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return ($row['total'] ?? 0) >= $maxAttempts;
    }
    
    private function recordRateLimit(string $identifier, string $action): void {
        $this->db->prepare("INSERT INTO auth_rate_limits (identifier, action) VALUES (?, ?)")
                 ->execute([$identifier, $action]);
    }
}
