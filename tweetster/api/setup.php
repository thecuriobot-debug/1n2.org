<?php
/**
 * Tweetster Setup & Fetch Control Panel
 * Provides a web UI to configure Twitter credentials and trigger fetches.
 */

// Protect with simple auth
$ADMIN_TOKEN = 'tweetster2026'; // Change this!

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$token = $_GET['token'] ?? $_POST['token'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';

if ($token !== $ADMIN_TOKEN && $action !== 'status') {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid admin token. Pass ?token=YOUR_TOKEN']);
    exit;
}

$API_DIR = __DIR__;
$DATA_DIR = __DIR__ . '/../data';
$CREDS_FILE = "$API_DIR/twitter-creds.json";
$COOKIES_FILE = "$API_DIR/twitter-cookies.json";
$TWEETS_FILE = "$DATA_DIR/tweets.json";
$LOG_DIR = $DATA_DIR;

switch ($action) {
    case 'status':
        showStatus();
        break;
    case 'save-creds':
        saveCreds();
        break;
    case 'save-cookies':
        saveCookies();
        break;
    case 'fetch-home':
        runFetch('--home');
        break;
    case 'fetch-accounts':
        $count = max(5, min(100, (int)($_GET['count'] ?? $_POST['count'] ?? 30)));
        runFetch("--fetch=$count");
        break;
    case 'search':
        $q = $_GET['q'] ?? $_POST['q'] ?? 'bitcoin';
        runFetch("--search=" . escapeshellarg($q));
        break;
    case 'login':
        runFetch('--login');
        break;
    default:
        echo json_encode([
            'endpoints' => [
                'GET ?action=status' => 'Show current status',
                'POST ?action=save-creds&token=X' => 'Save Twitter credentials (JSON body: {username, email, password})',
                'POST ?action=save-cookies&token=X' => 'Save browser cookies (JSON body: cookies array)',
                'GET ?action=login&token=X' => 'Login with saved credentials',
                'GET ?action=fetch-home&token=X' => 'Fetch home timeline',
                'GET ?action=fetch-accounts&token=X&count=30' => 'Fetch from top N accounts',
                'GET ?action=search&token=X&q=bitcoin' => 'Search tweets',
            ]
        ]);
}

function showStatus() {
    global $CREDS_FILE, $COOKIES_FILE, $TWEETS_FILE, $LOG_DIR;
    
    $tweets_count = 0;
    $last_update = null;
    if (file_exists($TWEETS_FILE)) {
        $tweets = json_decode(file_get_contents($TWEETS_FILE), true) ?: [];
        $tweets_count = count($tweets);
        $last_update = date('Y-m-d H:i:s', filemtime($TWEETS_FILE));
    }
    
    // Check latest log
    $latest_log = null;
    foreach (['twikit-fetch-log.json', 'syndication-fetch-log.json', 'guest-fetch-log.json', 'fetch-log.json'] as $logfile) {
        $path = "$LOG_DIR/$logfile";
        if (file_exists($path)) {
            $log = json_decode(file_get_contents($path), true);
            if ($log && (!$latest_log || ($log['completed'] ?? '') > ($latest_log['completed'] ?? ''))) {
                $latest_log = $log;
                $latest_log['_file'] = $logfile;
            }
        }
    }
    
    echo json_encode([
        'tweets_cached' => $tweets_count,
        'last_update' => $last_update,
        'has_credentials' => file_exists($CREDS_FILE),
        'has_cookies' => file_exists($COOKIES_FILE),
        'latest_fetch' => $latest_log,
        'setup_instructions' => !file_exists($CREDS_FILE) && !file_exists($COOKIES_FILE) ? [
            'To get tweets flowing, you need to provide Twitter login credentials.',
            'Option A: POST your credentials to ?action=save-creds&token=YOUR_TOKEN',
            'Option B: Export cookies from your browser and POST to ?action=save-cookies&token=YOUR_TOKEN',
            'Then trigger a fetch with ?action=fetch-home&token=YOUR_TOKEN',
        ] : null,
    ], JSON_PRETTY_PRINT);
}

function saveCreds() {
    global $CREDS_FILE;
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['username']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Need JSON body: {username, email, password}']);
        return;
    }
    file_put_contents($CREDS_FILE, json_encode($input, JSON_PRETTY_PRINT));
    chmod($CREDS_FILE, 0600);
    echo json_encode(['success' => true, 'message' => 'Credentials saved. Now run ?action=login to authenticate.']);
}

function saveCookies() {
    global $COOKIES_FILE;
    $input = file_get_contents('php://input');
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Need JSON body with cookies data']);
        return;
    }
    file_put_contents($COOKIES_FILE, $input);
    chmod($COOKIES_FILE, 0600);
    echo json_encode(['success' => true, 'message' => 'Cookies saved. Now try ?action=fetch-home']);
}

function runFetch($args) {
    $script = __DIR__ . '/twikit-fetch.py';
    if (!file_exists($script)) {
        echo json_encode(['error' => 'twikit-fetch.py not found']);
        return;
    }
    
    $cmd = "cd " . escapeshellarg(__DIR__) . " && python3 " . escapeshellarg($script) . " $args 2>&1";
    $output = [];
    $exitCode = 0;
    exec($cmd, $output, $exitCode);
    
    echo json_encode([
        'exit_code' => $exitCode,
        'output' => implode("\n", $output),
    ], JSON_PRETTY_PRINT);
}
