<?php
/**
 * Tweetster Multi-Provider Tweet Fetcher
 * 
 * Fetches tweets from multiple third-party Twitter APIs (no official X API needed).
 * Tries providers in order until one works. Stores results in data/tweets.json.
 *
 * Providers (in priority order):
 *   1. TwitterAPI.io  — Free $0.10 credits on signup, user/last_tweets endpoint
 *   2. GetXAPI.com    — Free $0.50 credits on signup, user tweets endpoint
 *   3. RapidAPI Old Bird V2 — Free tier available
 *
 * Usage:
 *   php multi-fetch.php                    — Fetch tweets from top accounts
 *   php multi-fetch.php --provider=twitterapiio  — Force specific provider
 *   php multi-fetch.php --accounts=20      — Fetch from top 20 accounts
 *   php multi-fetch.php --test             — Test API connectivity only
 *   
 * Config: Set API keys in config.php:
 *   define('TWITTERAPIIO_KEY', 'your_key');
 *   define('GETXAPI_KEY', 'your_key');
 *   define('RAPIDAPI_KEY', 'your_key');
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

$DATA_DIR = __DIR__ . '/../data';
$TWEETS_FILE = "$DATA_DIR/tweets.json";
$FOLLOWING_FILE = "$DATA_DIR/following.json";
$LOG_FILE = "$DATA_DIR/fetch-log.json";
$CONFIG_FILE = __DIR__ . '/config.php';

if (file_exists($CONFIG_FILE)) {
    require_once $CONFIG_FILE;
}

// Parse CLI args
$isTest = in_array('--test', $argv ?? []);
$forceProvider = null;
$maxAccounts = 30; // Default: top 30 accounts

foreach ($argv ?? [] as $arg) {
    if (str_starts_with($arg, '--provider=')) $forceProvider = substr($arg, 11);
    if (str_starts_with($arg, '--accounts=')) $maxAccounts = (int)substr($arg, 11);
}

// Also handle HTTP requests
if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    $isTest = isset($_GET['test']);
    $forceProvider = $_GET['provider'] ?? null;
    $maxAccounts = min((int)($_GET['accounts'] ?? 30), 100);
}

// ══════════════════════════════════════════════════════════════
// PROVIDER DEFINITIONS
// ══════════════════════════════════════════════════════════════

function getProviders() {
    return [
        'twitterapiio' => [
            'name' => 'TwitterAPI.io',
            'key' => defined('TWITTERAPIIO_KEY') ? TWITTERAPIIO_KEY : '',
            'signup' => 'https://twitterapi.io — Free $0.10 credits, no credit card',
            'fetchFn' => 'fetchFromTwitterAPIio',
        ],
        'getxapi' => [
            'name' => 'GetXAPI',
            'key' => defined('GETXAPI_KEY') ? GETXAPI_KEY : '',
            'signup' => 'https://getxapi.com — Free $0.50 credits, no credit card',
            'fetchFn' => 'fetchFromGetXAPI',
        ],
        'rapidapi' => [
            'name' => 'RapidAPI Old Bird V2',
            'key' => defined('RAPIDAPI_KEY') ? RAPIDAPI_KEY : '',
            'signup' => 'https://rapidapi.com/omarmhaimdat/api/twitter-v24 — Free tier',
            'fetchFn' => 'fetchFromRapidAPI',
        ],
    ];
}

// ══════════════════════════════════════════════════════════════
// PROVIDER: TwitterAPI.io
// ══════════════════════════════════════════════════════════════

function fetchFromTwitterAPIio($username, $apiKey) {
    $url = "https://api.twitterapi.io/twitter/user/last_tweets?userName=" . urlencode($username);
    $response = httpGet($url, ['X-API-Key: ' . $apiKey]);
    if (!$response['ok']) return ['error' => $response['error']];
    
    $data = json_decode($response['body'], true);
    if (!$data || !isset($data['tweets'])) {
        return ['error' => 'Invalid response: ' . substr($response['body'], 0, 200)];
    }
    
    $tweets = [];
    foreach ($data['tweets'] as $t) {
        $tweets[] = [
            'id' => $t['id'] ?? '',
            'text' => $t['text'] ?? '',
            'created_at' => $t['createdAt'] ?? '',
            'sort_ts' => strtotime($t['createdAt'] ?? '') ?: 0,
            'user_handle' => $t['author']['userName'] ?? $username,
            'user_name' => $t['author']['name'] ?? '',
            'user_avatar' => $t['author']['profilePicture'] ?? '',
            'user_verified' => !empty($t['author']['isBlueVerified']),
            'retweet_count' => $t['retweetCount'] ?? 0,
            'favorite_count' => $t['likeCount'] ?? 0,
            'reply_count' => $t['replyCount'] ?? 0,
            'views' => $t['viewCount'] ?? 0,
            'is_retweet' => str_starts_with($t['text'] ?? '', 'RT @'),
            'media' => extractMediaTwitterAPIio($t),
            'topics' => [],
        ];
    }
    return $tweets;
}

function extractMediaTwitterAPIio($tweet) {
    $media = [];
    foreach ($tweet['media'] ?? $tweet['extendedEntities']['media'] ?? [] as $m) {
        $media[] = [
            'url' => $m['media_url_https'] ?? $m['mediaUrl'] ?? $m['url'] ?? '',
            'type' => $m['type'] ?? 'photo',
        ];
    }
    return $media;
}

// ══════════════════════════════════════════════════════════════
// PROVIDER: GetXAPI
// ══════════════════════════════════════════════════════════════

function fetchFromGetXAPI($username, $apiKey) {
    $url = "https://api.getxapi.com/v1/user/tweets?username=" . urlencode($username) . "&limit=20";
    $response = httpGet($url, ['Authorization: Bearer ' . $apiKey]);
    if (!$response['ok']) return ['error' => $response['error']];
    
    $data = json_decode($response['body'], true);
    if (!$data) return ['error' => 'Invalid response: ' . substr($response['body'], 0, 200)];
    
    // GetXAPI may return tweets under different keys
    $rawTweets = $data['tweets'] ?? $data['data'] ?? $data;
    if (!is_array($rawTweets)) return ['error' => 'No tweets in response'];
    
    $tweets = [];
    foreach ($rawTweets as $t) {
        $tweets[] = [
            'id' => $t['id'] ?? $t['id_str'] ?? '',
            'text' => $t['text'] ?? $t['full_text'] ?? '',
            'created_at' => $t['created_at'] ?? $t['createdAt'] ?? '',
            'sort_ts' => strtotime($t['created_at'] ?? $t['createdAt'] ?? '') ?: 0,
            'user_handle' => $t['user']['screen_name'] ?? $t['author']['userName'] ?? $username,
            'user_name' => $t['user']['name'] ?? $t['author']['name'] ?? '',
            'user_avatar' => $t['user']['profile_image_url_https'] ?? $t['author']['profilePicture'] ?? '',
            'user_verified' => false,
            'retweet_count' => $t['retweet_count'] ?? $t['retweetCount'] ?? 0,
            'favorite_count' => $t['favorite_count'] ?? $t['likeCount'] ?? 0,
            'reply_count' => $t['reply_count'] ?? $t['replyCount'] ?? 0,
            'views' => $t['view_count'] ?? $t['viewCount'] ?? 0,
            'is_retweet' => str_starts_with($t['text'] ?? $t['full_text'] ?? '', 'RT @'),
            'media' => [],
            'topics' => [],
        ];
    }
    return $tweets;
}

// ══════════════════════════════════════════════════════════════
// PROVIDER: RapidAPI Old Bird V2
// ══════════════════════════════════════════════════════════════

function fetchFromRapidAPI($username, $apiKey) {
    $url = "https://twitter-v24.p.rapidapi.com/user/tweets?username=" . urlencode($username) . "&limit=20";
    $response = httpGet($url, [
        'x-rapidapi-key: ' . $apiKey,
        'x-rapidapi-host: twitter-v24.p.rapidapi.com',
    ]);
    if (!$response['ok']) return ['error' => $response['error']];
    
    $data = json_decode($response['body'], true);
    if (!$data) return ['error' => 'Invalid response: ' . substr($response['body'], 0, 200)];
    
    $rawTweets = $data['results'] ?? $data['tweets'] ?? $data['data'] ?? [];
    if (!is_array($rawTweets)) return ['error' => 'No tweets in response'];
    
    $tweets = [];
    foreach ($rawTweets as $t) {
        $tweets[] = [
            'id' => $t['tweet_id'] ?? $t['id'] ?? '',
            'text' => $t['text'] ?? $t['full_text'] ?? '',
            'created_at' => $t['creation_date'] ?? $t['created_at'] ?? '',
            'sort_ts' => strtotime($t['creation_date'] ?? $t['created_at'] ?? '') ?: 0,
            'user_handle' => $t['user']?? $username,
            'user_name' => $t['user_full_name'] ?? '',
            'user_avatar' => $t['user_profile_image'] ?? '',
            'user_verified' => false,
            'retweet_count' => $t['retweet_count'] ?? 0,
            'favorite_count' => $t['favorite_count'] ?? 0,
            'reply_count' => $t['reply_count'] ?? 0,
            'views' => $t['views'] ?? 0,
            'is_retweet' => str_starts_with($t['text'] ?? '', 'RT @'),
            'media' => [],
            'topics' => [],
        ];
    }
    return $tweets;
}

// ══════════════════════════════════════════════════════════════
// HTTP HELPER
// ══════════════════════════════════════════════════════════════

function httpGet($url, $headers = []) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array_merge(['Accept: application/json'], $headers),
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT => 'Tweetster/1.0',
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    
    if ($err) return ['ok' => false, 'error' => "CURL: $err", 'body' => ''];
    if ($code < 200 || $code >= 300) return ['ok' => false, 'error' => "HTTP $code", 'body' => $body];
    return ['ok' => true, 'error' => null, 'body' => $body];
}

// ══════════════════════════════════════════════════════════════
// TOPIC CLASSIFICATION (same as fetch-tweets.php)
// ══════════════════════════════════════════════════════════════

function classifyTweet($tweet, $followingMap = []) {
    $text = strtolower(($tweet['text'] ?? '') . ' ' . ($tweet['user_name'] ?? '') . ' ' . ($tweet['user_handle'] ?? ''));
    $handle = strtolower($tweet['user_handle'] ?? '');
    if (isset($followingMap[$handle])) {
        $text .= ' ' . strtolower($followingMap[$handle]['description'] ?? '');
    }
    
    $topics = [];
    $btc = ['bitcoin','btc','satoshi','lightning network','crypto','blockchain','hodl','sats','#bitcoin','nostr','web3','defi','eth','ethereum','mining','halving','wallet','stablecoin','mempool','₿'];
    $sports = ['nfl','nba','mlb','nhl','super bowl','touchdown','quarterback','playoffs','championship','baseball','football','basketball','hockey','soccer','world cup','olympics','athlete','coach','draft','roster','raiders','chiefs','seahawks','patriots','lakers','celtics','yankees','dodgers','ufc','mma'];
    $tech = ['ai ','artificial intelligence','machine learning','gpt','openai','claude','anthropic','programming','software','startup','silicon valley','developer','github','coding','api','saas','cloud','cybersecurity','robotics','quantum','spacex','tesla','apple ','google','microsoft','nvidia','llm'];
    $politics = ['trump','biden','congress','senate','democrat','republican','election','vote ','legislation','policy','governor','president','supreme court','political','gop','dnc','rnc','partisan','liberal','conservative','tariff','white house','doge ','maga','executive order'];
    
    foreach ($btc as $kw) { if (strpos($text, $kw) !== false) { $topics[] = 'bitcoin'; break; } }
    foreach ($sports as $kw) { if (strpos($text, $kw) !== false) { $topics[] = 'sports'; break; } }
    foreach ($tech as $kw) { if (strpos($text, $kw) !== false) { $topics[] = 'tech'; break; } }
    foreach ($politics as $kw) { if (strpos($text, $kw) !== false) { $topics[] = 'politics'; break; } }
    
    return $topics ?: ['general'];
}

// ══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ══════════════════════════════════════════════════════════════

function main($isTest, $forceProvider, $maxAccounts, $followingFile, $tweetsFile, $logFile) {
    $providers = getProviders();
    $log = ['started' => date('c'), 'results' => []];
    
    // Check which providers have keys
    $available = [];
    $missing = [];
    foreach ($providers as $id => $p) {
        if ($p['key']) {
            $available[$id] = $p;
        } else {
            $missing[$id] = $p;
        }
    }
    
    if (empty($available)) {
        $msg = "No API keys configured! Sign up for free credits at any of these:\n\n";
        foreach ($providers as $id => $p) {
            $msg .= "  • {$p['name']}: {$p['signup']}\n";
        }
        $msg .= "\nThen add the key to /var/www/html/tweetster/api/config.php:\n";
        $msg .= "  define('TWITTERAPIIO_KEY', 'your_key_here');\n";
        $msg .= "  define('GETXAPI_KEY', 'your_key_here');\n";
        $msg .= "  define('RAPIDAPI_KEY', 'your_key_here');\n";
        output(['error' => 'No API keys configured', 'instructions' => $msg, 'providers' => array_map(fn($p) => $p['signup'], $providers)]);
        return;
    }
    
    // If forcing a provider
    if ($forceProvider && !isset($available[$forceProvider])) {
        output(['error' => "Provider '$forceProvider' not available", 'available' => array_keys($available)]);
        return;
    }
    
    // Load following list, sort by followers (highest first)
    $following = json_decode(file_get_contents($followingFile), true) ?: [];
    usort($following, fn($a, $b) => ($b['followers'] ?? 0) - ($a['followers'] ?? 0));
    $topAccounts = array_slice($following, 0, $maxAccounts);
    
    $followingMap = [];
    foreach ($following as $acct) {
        $handle = strtolower(ltrim($acct['handle'] ?? '', '@'));
        if ($handle) $followingMap[$handle] = $acct;
    }
    
    // Test mode
    if ($isTest) {
        $testAccount = ltrim($topAccounts[0]['handle'] ?? 'MadBitcoins', '@');
        $results = [];
        foreach ($available as $id => $p) {
            logMsg("Testing {$p['name']} with @$testAccount...");
            $fn = $p['fetchFn'];
            $tweets = $fn($testAccount, $p['key']);
            if (isset($tweets['error'])) {
                $results[$id] = ['status' => 'FAIL', 'error' => $tweets['error']];
            } else {
                $results[$id] = ['status' => 'OK', 'tweets_returned' => count($tweets), 'sample' => isset($tweets[0]) ? substr($tweets[0]['text'], 0, 80) : ''];
            }
        }
        output(['test_results' => $results, 'missing_keys' => array_map(fn($p) => $p['signup'], $missing)]);
        return;
    }
    
    // Fetch tweets from top accounts
    $allNewTweets = [];
    $errors = [];
    $providerUsed = null;
    
    $providerOrder = $forceProvider ? [$forceProvider => $available[$forceProvider]] : $available;
    
    foreach ($providerOrder as $providerId => $provider) {
        logMsg("Trying {$provider['name']}...");
        $fn = $provider['fetchFn'];
        $apiKey = $provider['key'];
        $providerErrors = 0;
        $providerTweets = 0;
        
        foreach ($topAccounts as $i => $account) {
            $handle = ltrim($account['handle'] ?? '', '@');
            if (!$handle) continue;
            
            logMsg("  [{$i}/" . count($topAccounts) . "] Fetching @$handle...");
            
            $tweets = $fn($handle, $apiKey);
            
            if (isset($tweets['error'])) {
                $providerErrors++;
                $errors[] = "{$provider['name']}/@$handle: " . $tweets['error'];
                logMsg("    Error: " . $tweets['error']);
                
                // If we get 3 consecutive errors, this provider is likely down
                if ($providerErrors >= 3 && $providerTweets === 0) {
                    logMsg("  {$provider['name']} seems down, trying next provider...");
                    break;
                }
                continue;
            }
            
            $providerTweets += count($tweets);
            $allNewTweets = array_merge($allNewTweets, $tweets);
            logMsg("    Got " . count($tweets) . " tweets");
            
            // Rate limit courtesy: small delay between requests
            usleep(200000); // 200ms
        }
        
        if ($providerTweets > 0) {
            $providerUsed = $provider['name'];
            logMsg("Success with {$provider['name']}: $providerTweets tweets from " . count($topAccounts) . " accounts");
            break; // Don't try other providers if this one worked
        }
    }
    
    if (empty($allNewTweets)) {
        output(['error' => 'All providers failed', 'errors' => $errors]);
        return;
    }
    
    // Classify topics
    foreach ($allNewTweets as &$tweet) {
        $tweet['topics'] = classifyTweet($tweet, $followingMap);
    }
    
    // Merge with existing tweets
    $existing = file_exists($tweetsFile) ? (json_decode(file_get_contents($tweetsFile), true) ?: []) : [];
    $byId = [];
    foreach ($existing as $t) {
        if (!empty($t['id'])) $byId[$t['id']] = $t;
    }
    
    $newCount = 0;
    foreach ($allNewTweets as $tweet) {
        if (!empty($tweet['id']) && !isset($byId[$tweet['id']])) $newCount++;
        if (!empty($tweet['id'])) $byId[$tweet['id']] = $tweet;
    }
    
    // Sort by timestamp, newest first
    $allTweets = array_values($byId);
    usort($allTweets, fn($a, $b) => ($b['sort_ts'] ?? 0) - ($a['sort_ts'] ?? 0));
    
    // Keep max 2000 tweets to avoid bloat
    $allTweets = array_slice($allTweets, 0, 2000);
    
    file_put_contents($tweetsFile, json_encode($allTweets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    // Save log
    $log['completed'] = date('c');
    $log['provider'] = $providerUsed;
    $log['new_tweets'] = $newCount;
    $log['total_tweets'] = count($allTweets);
    $log['accounts_fetched'] = $maxAccounts;
    $log['errors'] = $errors;
    file_put_contents($logFile, json_encode($log, JSON_PRETTY_PRINT));
    
    output([
        'success' => true,
        'provider' => $providerUsed,
        'new_tweets' => $newCount,
        'total_tweets' => count($allTweets),
        'accounts_fetched' => $maxAccounts,
        'errors' => count($errors),
    ]);
}

function logMsg($msg) {
    if (php_sapi_name() === 'cli') {
        echo $msg . "\n";
    }
}

function output($data) {
    if (php_sapi_name() === 'cli') {
        echo json_encode($data, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
}

// Run
main($isTest, $forceProvider, $maxAccounts, $FOLLOWING_FILE, $TWEETS_FILE, $LOG_FILE);
