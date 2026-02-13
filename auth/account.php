<?php
/**
 * 1n2.org User Account Page
 * View/edit profile, manage app connections.
 */
require_once __DIR__ . '/config.php';

$auth = createAuth();
$user = $auth->requireLogin('/auth/login.php');

$message = '';
$messageType = '';

// Handle profile updates
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_name') {
        $name = trim($_POST['display_name'] ?? '');
        if ($name) {
            $auth->updateDisplayName($user['id'], $name);
            $user['display_name'] = $name;
            $message = 'Display name updated!';
            $messageType = 'success';
        }
    } elseif ($action === 'update_medialog') {
        $auth->setProfile($user['id'], 'medialog', 'goodreads_username', trim($_POST['goodreads_username'] ?? ''));
        $auth->setProfile($user['id'], 'medialog', 'letterboxd_username', trim($_POST['letterboxd_username'] ?? ''));
        $message = 'MediaLog settings saved!';
        $messageType = 'success';
    } elseif ($action === 'update_tweetster') {
        $auth->setProfile($user['id'], 'tweetster', 'twitter_handle', trim($_POST['twitter_handle'] ?? ''));
        $message = 'Tweetster settings saved!';
        $messageType = 'success';
    }
}

// Load all profile data
$medialogProfile = $auth->getAllProfiles($user['id'], 'medialog');
$tweetsterProfile = $auth->getAllProfiles($user['id'], 'tweetster');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Account — 1n2.org</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
            padding: 30px 20px;
        }
        .container { max-width: 700px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 20px;
            padding: 35px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            margin-bottom: 25px;
        }
        .card h2 {
            font-size: 1.5em;
            margin-bottom: 20px;
            color: #333;
        }
        .card h2 .icon { margin-right: 10px; }
        .form-row {
            margin-bottom: 18px;
        }
        .form-row label {
            display: block;
            font-size: 0.85em;
            font-weight: 600;
            color: #555;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .form-row input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 1em;
            outline: none;
            transition: border-color 0.3s;
        }
        .form-row input:focus {
            border-color: #667eea;
        }
        .form-row input[readonly] {
            background: #f5f5f5;
            color: #888;
        }
        .save-btn {
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 0.95em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .save-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        .header-bar h1 {
            color: white;
            font-size: 2em;
            font-weight: 800;
        }
        .header-bar a {
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            font-weight: 600;
            padding: 10px 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 10px;
            transition: all 0.3s;
        }
        .header-bar a:hover {
            background: rgba(255,255,255,0.1);
            border-color: white;
            color: white;
        }
        .message {
            padding: 14px 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 0.9em;
            font-weight: 500;
        }
        .message.success { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
        .message.error { background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
        .user-badge {
            display: inline-block;
            padding: 4px 12px;
            background: #667eea;
            color: white;
            border-radius: 20px;
            font-size: 0.75em;
            font-weight: 700;
            text-transform: uppercase;
            margin-left: 10px;
        }
        .meta-info {
            color: #888;
            font-size: 0.85em;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        .app-card {
            border: 2px solid #f0f0f0;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 15px;
            transition: border-color 0.3s;
        }
        .app-card:hover {
            border-color: #667eea;
        }
        .app-card h3 {
            font-size: 1.2em;
            margin-bottom: 15px;
        }
        .nav-links {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        .nav-links a {
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            font-size: 0.9em;
            font-weight: 600;
        }
        .nav-links a:hover { color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-bar">
            <div>
                <h1>My Account</h1>
                <div class="nav-links" style="margin-top: 8px;">
                    <a href="/">← 1n2.org</a>
                    <a href="/medialog/">MediaLog</a>
                    <a href="/tweetster/">Tweetster</a>
                    <a href="/checklister/">Checklister</a>
                </div>
            </div>
            <a href="/auth/logout.php?return=/">Sign Out</a>
        </div>
        
        <?php if ($message): ?>
            <div class="message <?= $messageType ?>"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>
        
        <!-- Profile Card -->
        <div class="card">
            <h2><span class="icon">👤</span>Profile<?php if ($user['is_admin']): ?><span class="user-badge">Admin</span><?php endif; ?></h2>
            <form method="POST">
                <input type="hidden" name="action" value="update_name">
                <div class="form-row">
                    <label>Email</label>
                    <input type="email" value="<?= htmlspecialchars($user['email']) ?>" readonly>
                </div>
                <div class="form-row">
                    <label>Display Name</label>
                    <input type="text" name="display_name" value="<?= htmlspecialchars($user['display_name'] ?? '') ?>" placeholder="How should we call you?">
                </div>
                <button type="submit" class="save-btn">Save Name</button>
            </form>
            <div class="meta-info">
                Member since <?= date('F j, Y', strtotime($user['created_at'])) ?>
                <?php if ($user['last_login_at']): ?>
                &middot; Last login: <?= date('M j, Y g:ia', strtotime($user['last_login_at'])) ?>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- App Connections -->
        <div class="card">
            <h2><span class="icon">🔗</span>Connected Apps</h2>
            
            <form method="POST">
                <input type="hidden" name="action" value="update_medialog">
                <div class="app-card">
                    <h3>📚🎬 MediaLog</h3>
                    <div class="form-row">
                        <label>Goodreads Username</label>
                        <input type="text" name="goodreads_username" value="<?= htmlspecialchars($medialogProfile['goodreads_username'] ?? '') ?>" placeholder="e.g. thunt">
                    </div>
                    <div class="form-row">
                        <label>Letterboxd Username</label>
                        <input type="text" name="letterboxd_username" value="<?= htmlspecialchars($medialogProfile['letterboxd_username'] ?? '') ?>" placeholder="e.g. thunt">
                    </div>
                    <button type="submit" class="save-btn">Save MediaLog Settings</button>
                </div>
            </form>
            
            <form method="POST">
                <input type="hidden" name="action" value="update_tweetster">
                <div class="app-card">
                    <h3>🐦 Tweetster</h3>
                    <div class="form-row">
                        <label>Twitter Handle</label>
                        <input type="text" name="twitter_handle" value="<?= htmlspecialchars($tweetsterProfile['twitter_handle'] ?? '') ?>" placeholder="e.g. MadBitcoins">
                    </div>
                    <button type="submit" class="save-btn">Save Tweetster Settings</button>
                </div>
            </form>
            
            <div class="app-card">
                <h3>✅ Checklister</h3>
                <p style="color: #888; font-size: 0.9em;">Checklister uses local browser storage. No server-side settings needed.</p>
            </div>
        </div>
    </div>
</body>
</html>
