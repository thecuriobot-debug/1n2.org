<?php
/**
 * 1n2.org Universal Login Page
 * 
 * Any app can redirect here with ?return=/app/page.php
 * After login, user is sent back to the return URL.
 */
require_once __DIR__ . '/config.php';

$auth = createAuth();

// Already logged in? Redirect back
$user = $auth->getCurrentUser();
$returnUrl = $_GET['return'] ?? $_POST['return'] ?? '/';
if ($user) {
    header('Location: ' . $returnUrl);
    exit;
}

$step = 'email';  // 'email' or 'code'
$email = $_POST['email'] ?? $_GET['email'] ?? '';
$message = '';
$messageType = '';

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'send_code') {
        $email = $_POST['email'] ?? '';
        $result = $auth->sendLoginCode($email);
        if ($result['success']) {
            $step = 'code';
            $message = $result['message'];
            $messageType = 'success';
        } else {
            $message = $result['message'];
            $messageType = 'error';
        }
    } elseif ($action === 'verify_code') {
        $email = $_POST['email'] ?? '';
        $code = $_POST['code'] ?? '';
        $result = $auth->verifyCodeAndLogin($email, $code);
        if ($result['success']) {
            header('Location: ' . $returnUrl);
            exit;
        } else {
            $step = 'code';
            $message = $result['message'];
            $messageType = 'error';
        }
    } elseif ($action === 'back') {
        $step = 'email';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In — 1n2.org</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .login-container {
            width: 100%;
            max-width: 420px;
        }
        
        .login-card {
            background: white;
            border-radius: 24px;
            padding: 50px 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
        }
        
        .brand {
            margin-bottom: 30px;
        }
        
        .brand h1 {
            font-size: 2em;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }
        
        .brand p {
            color: #888;
            font-size: 0.95em;
        }
        
        .step-indicator {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 30px;
        }
        
        .step-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #ddd;
            transition: all 0.3s ease;
        }
        
        .step-dot.active {
            background: #667eea;
            transform: scale(1.3);
        }
        
        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }
        
        .form-group label {
            display: block;
            font-size: 0.85em;
            font-weight: 600;
            color: #555;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .form-group input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 14px;
            font-size: 1.1em;
            outline: none;
            transition: all 0.3s ease;
            background: #fafafa;
        }
        
        .form-group input:focus {
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }
        
        .form-group input.code-input {
            text-align: center;
            font-size: 2em;
            letter-spacing: 10px;
            font-weight: 700;
            font-family: monospace;
            padding: 20px;
        }
        
        .submit-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 14px;
            font-size: 1.1em;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }
        
        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        .submit-btn:active {
            transform: translateY(0);
        }
        
        .message {
            padding: 14px 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        .message.success {
            background: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #c8e6c9;
        }
        
        .message.error {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #ffcdd2;
        }
        
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #667eea;
            text-decoration: none;
            font-size: 0.9em;
            font-weight: 600;
        }
        
        .back-link:hover {
            text-decoration: underline;
        }
        
        .email-display {
            background: #f5f5f5;
            padding: 12px 20px;
            border-radius: 10px;
            color: #333;
            font-weight: 600;
            margin-bottom: 20px;
            font-size: 0.95em;
        }
        
        .resend-text {
            margin-top: 20px;
            color: #888;
            font-size: 0.85em;
        }
        
        .resend-text button {
            background: none;
            border: none;
            color: #667eea;
            font-weight: 600;
            cursor: pointer;
            font-size: 0.85em;
        }
        
        .resend-text button:hover {
            text-decoration: underline;
        }
        
        .footer-text {
            margin-top: 25px;
            color: #aaa;
            font-size: 0.8em;
        }
        
        .footer-text a {
            color: #667eea;
            text-decoration: none;
        }
        
        /* Gentle animation */
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .login-card {
            animation: slideIn 0.4s ease;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="brand">
                <h1>1n2.org</h1>
                <p>Sign in to continue</p>
            </div>
            
            <div class="step-indicator">
                <div class="step-dot active"></div>
                <div class="step-dot <?= $step === 'code' ? 'active' : '' ?>"></div>
            </div>
            
            <?php if ($message): ?>
                <div class="message <?= $messageType ?>"><?= $message ?></div>
            <?php endif; ?>
            
            <?php if ($step === 'email'): ?>
                <!-- STEP 1: Enter Email -->
                <form method="POST">
                    <input type="hidden" name="action" value="send_code">
                    <input type="hidden" name="return" value="<?= htmlspecialchars($returnUrl) ?>">
                    
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" 
                               name="email" 
                               placeholder="you@example.com" 
                               value="<?= htmlspecialchars($email) ?>"
                               required 
                               autofocus
                               autocomplete="email">
                    </div>
                    
                    <button type="submit" class="submit-btn">Send Login Code</button>
                </form>
                
                <p class="footer-text">
                    No password needed. We'll email you a code.<br>
                    <a href="/">← Back to 1n2.org</a>
                </p>
                
            <?php else: ?>
                <!-- STEP 2: Enter Code -->
                <div class="email-display">
                    📧 <?= htmlspecialchars($email) ?>
                </div>
                
                <form method="POST" id="codeForm">
                    <input type="hidden" name="action" value="verify_code">
                    <input type="hidden" name="email" value="<?= htmlspecialchars($email) ?>">
                    <input type="hidden" name="return" value="<?= htmlspecialchars($returnUrl) ?>">
                    
                    <div class="form-group">
                        <label>Enter 6-Digit Code</label>
                        <input type="text" 
                               name="code" 
                               class="code-input"
                               placeholder="000000" 
                               maxlength="6" 
                               pattern="[0-9]{6}"
                               inputmode="numeric"
                               required 
                               autofocus
                               autocomplete="one-time-code">
                    </div>
                    
                    <button type="submit" class="submit-btn">Verify & Sign In</button>
                </form>
                
                <div class="resend-text">
                    Didn't get the code? 
                    <form method="POST" style="display:inline">
                        <input type="hidden" name="action" value="send_code">
                        <input type="hidden" name="email" value="<?= htmlspecialchars($email) ?>">
                        <input type="hidden" name="return" value="<?= htmlspecialchars($returnUrl) ?>">
                        <button type="submit">Resend code</button>
                    </form>
                </div>
                
                <form method="POST">
                    <input type="hidden" name="action" value="back">
                    <input type="hidden" name="return" value="<?= htmlspecialchars($returnUrl) ?>">
                    <a href="#" onclick="this.closest('form').submit(); return false;" class="back-link">← Use a different email</a>
                </form>
                
            <?php endif; ?>
        </div>
    </div>
    
    <script>
        // Auto-submit when 6 digits entered
        const codeInput = document.querySelector('.code-input');
        if (codeInput) {
            codeInput.addEventListener('input', function() {
                // Only allow digits
                this.value = this.value.replace(/\D/g, '');
                if (this.value.length === 6) {
                    document.getElementById('codeForm').submit();
                }
            });
        }
    </script>
</body>
</html>
