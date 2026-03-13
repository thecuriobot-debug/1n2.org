<?php
/**
 * Tweetster Ingest API
 * Receives tweet IDs and fetches full tweet data from Twitter's syndication API.
 * The syndication API (cdn.syndication.twimg.com) works from server IPs even though
 * x.com itself blocks datacenter IPs via Cloudflare.
 * 
 * Endpoints:
 *   GET  ?ids=123,456,789    - Fetch tweets by comma-separated IDs
 *   POST (JSON body)         - Fetch tweets by IDs in JSON: {"ids": ["123","456"]}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$DATA_DIR = __DIR__ . '/../data';
$TWEETS_FILE = "$DATA_DIR/tweets.json";
$FOLLOWING_FILE = "$DATA_DIR/following.json";
$LOG_FILE = "$DATA_DIR/ingest-log.json";

// Parse incoming IDs
$ids = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $ids = $input['ids'] ?? [];
} else {
    $idsStr = $_GET['ids'] ?? '';
    if ($idsStr) {
        $ids = array_filter(explode(',', $idsStr));
    }
}

// Validate IDs
$ids = array_filter($ids, function($id) {
    return preg_match('/^\d{5,25}$/', trim($id));
});
$ids = array_map('trim', $ids);
$ids = array_unique($ids);

if (empty($ids)) {
    echo json_encode(['error' => 'No valid tweet IDs provided', 'usage' => 'GET ?ids=123,456 or POST {"ids":["123","456"]}']);
    exit;
}

// Load existing tweets
$existing = [];
if (file_exists($TWEETS_FILE)) {
    $existing = json_decode(file_get_contents($TWEETS_FILE), true) ?: [];
}
$existingById = [];
foreach ($existing as $t) {
    if (!empty($t['id'])) $existingById[$t['id']] = $t;
}

// Load following for classification
$following = [];
$followingMap = [];
if (file_exists($FOLLOWING_FILE)) {
    $following = json_decode(file_get_contents($FOLLOWING_FILE), true) ?: [];
    foreach ($following as $f) {
        $h = strtolower(ltrim($f['handle'] ?? '', '@'));
        if ($h) $followingMap[$h] = $f;
    }
}

// Fetch tweets from syndication API
$fetched = 0;
$errors = 0;
$newTweets = [];
$skipped = 0;

foreach ($ids as $id) {
    // Skip if we already have this tweet
    if (isset($existingById[$id])) {
        $skipped++;
        continue;
    }
    
    $tweet = fetchTweetFromSyndication($id);
    if ($tweet && empty($tweet['error'])) {
        // Classify
        $tweet['topics'] = classifyTweet($tweet, $followingMap);
        $newTweets[] = $tweet;
        $existingById[$id] = $tweet;
        $fetched++;
    } else {
        $errors++;
    }
    
    // Rate limit: small delay
    usleep(100000); // 100ms
}

// Merge and save
if ($fetched > 0) {
    $all = array_values($existingById);
    usort($all, function($a, $b) {
        return ($b['sort_ts'] ?? 0) - ($a['sort_ts'] ?? 0);
    });
    $all = array_slice($all, 0, 2000);
    file_put_contents($TWEETS_FILE, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Log
$log = [
    'timestamp' => date('Y-m-d H:i:s'),
    'ids_received' => count($ids),
    'fetched' => $fetched,
    'skipped' => $skipped,
    'errors' => $errors,
    'total_tweets' => count($existingById),
];
file_put_contents($LOG_FILE, json_encode($log, JSON_PRETTY_PRINT));

echo json_encode([
    'fetched' => $fetched,
    'skipped' => $skipped,
    'errors' => $errors,
    'total' => count($existingById),
    'tweets' => array_map(function($t) {
        return ['id' => $t['id'], 'text' => substr($t['text'] ?? '', 0, 80), 'user' => $t['user_handle'] ?? ''];
    }, $newTweets),
]);


/**
 * Fetch a single tweet from Twitter's syndication API.
 * This endpoint is FREE, requires no auth, and works from server IPs.
 * It's the same API used by Vercel's react-tweet package.
 */
function fetchTweetFromSyndication($tweetId) {
    $url = "https://cdn.syndication.twimg.com/tweet-result?id={$tweetId}&token=!&lang=en";
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept: application/json',
        ],
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 || !$response) {
        return ['error' => "HTTP $httpCode"];
    }
    
    $data = json_decode($response, true);
    if (!$data || !isset($data['__typename'])) {
        return ['error' => 'Invalid response'];
    }
    
    if ($data['__typename'] === 'TweetTombstone') {
        return ['error' => 'Tombstoned'];
    }
    
    $user = $data['user'] ?? [];
    
    // Extract media
    $media = [];
    foreach ($data['mediaDetails'] ?? [] as $m) {
        $media[] = [
            'url' => $m['media_url_https'] ?? '',
            'type' => $m['type'] ?? 'photo',
        ];
    }
    foreach ($data['photos'] ?? [] as $p) {
        $media[] = [
            'url' => $p['url'] ?? '',
            'type' => 'photo',
        ];
    }
    
    // Parse timestamp
    $sortTs = 0;
    $createdAt = $data['created_at'] ?? '';
    if ($createdAt) {
        $ts = strtotime($createdAt);
        if ($ts) $sortTs = $ts;
    }
    
    return [
        'id' => $data['id_str'] ?? $tweetId,
        'text' => $data['text'] ?? '',
        'created_at' => $createdAt,
        'sort_ts' => $sortTs,
        'user_handle' => $user['screen_name'] ?? '',
        'user_name' => $user['name'] ?? '',
        'user_avatar' => $user['profile_image_url_https'] ?? '',
        'user_verified' => $user['is_blue_verified'] ?? false,
        'retweet_count' => $data['retweet_count'] ?? 0,
        'favorite_count' => $data['favorite_count'] ?? 0,
        'reply_count' => $data['reply_count'] ?? 0,
        'views' => isset($data['views']) && is_array($data['views']) ? ($data['views']['count'] ?? '0') : ($data['views'] ?? '0'),
        'is_retweet' => str_starts_with($data['text'] ?? '', 'RT @'),
        'media' => $media,
        'topics' => [],
        'source' => 'syndication',
    ];
}


/**
 * Classify a tweet into topic categories
 */
function classifyTweet($tweet, $followingMap = []) {
    $text = strtolower(implode(' ', [
        $tweet['text'] ?? '',
        $tweet['user_name'] ?? '',
        $tweet['user_handle'] ?? '',
    ]));
    
    $handle = strtolower($tweet['user_handle'] ?? '');
    if (isset($followingMap[$handle])) {
        $text .= ' ' . strtolower($followingMap[$handle]['description'] ?? '');
    }
    
    $topics = [];
    $categories = [
        'bitcoin' => ['bitcoin','btc','satoshi','lightning network','crypto','blockchain','hodl','sats','#bitcoin','nostr','web3','defi','eth','ethereum','mining','halving','wallet','stablecoin','mempool','₿'],
        'sports' => ['nfl','nba','mlb','nhl','super bowl','touchdown','quarterback','playoffs','championship','baseball','football','basketball','hockey','soccer','world cup','olympics','athlete','coach','draft','roster','raiders','chiefs','seahawks','patriots','lakers','celtics','yankees','dodgers','ufc','mma'],
        'tech' => ['ai ','artificial intelligence','machine learning','gpt','openai','claude','anthropic','programming','software','startup','silicon valley','developer','github','coding','api','saas','cloud','cybersecurity','robotics','quantum','spacex','tesla','apple ','google','microsoft','nvidia','llm'],
        'politics' => ['trump','biden','congress','senate','democrat','republican','election','vote ','legislation','policy','governor','president','supreme court','political','gop','dnc','rnc','partisan','liberal','conservative','tariff','white house','doge ','maga','executive order'],
    ];
    
    foreach ($categories as $cat => $keywords) {
        foreach ($keywords as $kw) {
            if (str_contains($text, $kw)) {
                $topics[] = $cat;
                break;
            }
        }
    }
    
    return $topics ?: ['general'];
}
