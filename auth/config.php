<?php
/**
 * 1n2.org Auth Configuration
 * 
 * Shared database config + email backend settings.
 */

// Try to use existing config if already loaded
if (!function_exists('getDB')) {
    $medialogConfig = __DIR__ . '/../medialog/config.php';
    if (file_exists($medialogConfig)) {
        require_once $medialogConfig;
    } else {
        define('DB_HOST', 'localhost');
        define('DB_USER', 'root');
        define('DB_PASS', '');
        define('DB_NAME', 'myapp_db');

        function getDB() {
            static $pdo = null;
            if ($pdo === null) {
                try {
                    $pdo = new PDO(
                        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                        DB_USER,
                        DB_PASS,
                        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
                    );
                } catch (PDOException $e) {
                    die("Database connection failed: " . $e->getMessage());
                }
            }
            return $pdo;
        }
    }
}

/**
 * Email backend configuration.
 * 
 * Available backends:
 *   'log'       — Dev mode: shows code on screen (DEFAULT, no email sent)
 *   'php_mail'  — PHP mail() function (needs working Postfix/sendmail)
 *   'sendgrid'  — SendGrid API (free tier: 100 emails/day)
 *   'brevo'     — Brevo/Sendinblue API (free tier: 300 emails/day)
 *   'mailgun'   — Mailgun API (free tier: ~100 emails/day sandbox)
 * 
 * To switch backends, change AUTH_EMAIL_BACKEND and set the API key.
 */
if (!defined('AUTH_EMAIL_BACKEND')) {
    define('AUTH_EMAIL_BACKEND', 'log');  // Change to 'sendgrid', 'brevo', etc.
}
if (!defined('AUTH_EMAIL_API_KEY')) {
    define('AUTH_EMAIL_API_KEY', '');     // Your API key here
}
if (!defined('AUTH_EMAIL_API_DOMAIN')) {
    define('AUTH_EMAIL_API_DOMAIN', '');  // Mailgun domain (if using mailgun)
}

/**
 * Helper to create Auth instance with config
 */
function createAuth(): \Auth {
    require_once __DIR__ . '/Auth.php';
    return new Auth(getDB(), [
        'email_backend'    => AUTH_EMAIL_BACKEND,
        'email_api_key'    => AUTH_EMAIL_API_KEY,
        'email_api_domain' => AUTH_EMAIL_API_DOMAIN,
    ]);
}
