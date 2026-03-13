<?php
/**
 * Tweetster Tweet Fetcher API
 * 
 * Fetches tweets from @MadBitcoins' home timeline using Twitter's web GraphQL API.
 * Stores tweets in data/tweets.json with full user attribution.
 * 
 * Endpoints:
 *   GET  ?action=tweets          — Return cached tweets
 *   GET  ?action=refresh         — Fetch fresh tweets from Twitter (requires auth tokens)
 *   GET  ?action=status          — Show status info
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$DATA_DIR = __DIR__ . '/../data';
$TWEETS_FILE = "$DATA_DIR/tweets.json";
$FOLLOWING_FILE = "$DATA_DIR/following.json";
$CONFIG_FILE = __DIR__ . '/config.php';

if (file_exists($CONFIG_FILE)) {
    require_once $CONFIG_FILE;
}

$action = $_GET['action'] ?? 'tweets';

switch ($action) {
    case 'tweets':   serveTweets($TWEETS_FILE, $FOLLOWING_FILE); break;
    case 'refresh':  refreshTweets($DATA_DIR, $TWEETS_FILE, $FOLLOWING_FILE); break;
    case 'status':   showStatus($TWEETS_FILE, $FOLLOWING_FILE); break;
    case 'cdn-refresh': cdnRefresh(); break;
    default:         json_response(['error' => 'Unknown action'], 400);
}

// ═══════════════════════════════════════════
function serveTweets($tweetsFile, $followingFile) {
    if (!file_exists($tweetsFile)) {
        json_response(['error' => 'No tweets cached yet', 'tweets' => []], 200);
        return;
    }
    $tweets = json_decode(file_get_contents($tweetsFile), true) ?: [];
    $following = json_decode(file_get_contents($followingFile), true) ?: [];
    
    $followingMap = [];
    foreach ($following as $acct) {
        $handle = strtolower(ltrim($acct['handle'] ?? '', '@'));
        if ($handle) $followingMap[$handle] = $acct;
    }
    foreach ($tweets as &$tweet) {
        $handle = strtolower($tweet['user_handle'] ?? '');
        if (isset($followingMap[$handle]) && empty($tweet['user_avatar'])) {
            $tweet['user_avatar'] = $followingMap[$handle]['img'] ?? '';
        }
    }
    
    usort($tweets, function($a, $b) { return ($b['sort_ts'] ?? 0) - ($a['sort_ts'] ?? 0); });
    
    $topic = $_GET['topic'] ?? 'all';
    $search = $_GET['search'] ?? '';
    
    if ($topic !== 'all') {
        $tweets = array_values(array_filter($tweets, function($t) use ($topic) {
            return in_array($topic, $t['topics'] ?? []);
        }));
    }
    if ($search) {
        $q = strtolower($search);
        $tweets = array_values(array_filter($tweets, function($t) use ($q) {
            return stripos($t['text'] ?? '', $q) !== false 
                || stripos($t['user_name'] ?? '', $q) !== false
                || stripos($t['user_handle'] ?? '', $q) !== false;
        }));
    }
    
    $limit = min((int)($_GET['limit'] ?? 200), 500);
    $offset = max((int)($_GET['offset'] ?? 0), 0);
    
    json_response([
        'tweets' => array_slice($tweets, $offset, $limit),
        'total' => count($tweets),
        'cached_at' => @filemtime($tweetsFile) ?: null
    ]);
}

// ═══════════════════════════════════════════
function refreshTweets($dataDir, $tweetsFile, $followingFile) {
    $authToken = defined('TWITTER_AUTH_TOKEN') ? TWITTER_AUTH_TOKEN : ($_POST['auth_token'] ?? '');
    $csrfToken = defined('TWITTER_CSRF_TOKEN') ? TWITTER_CSRF_TOKEN : ($_POST['csrf_token'] ?? '');
    $cookie    = defined('TWITTER_COOKIE') ? TWITTER_COOKIE : ($_POST['cookie'] ?? '');
    
    if (!$authToken || !$csrfToken) {
        json_response(['error' => 'Twitter auth tokens required. Set in config.php or POST auth_token + csrf_token + cookie.'], 401);
        return;
    }
    
    $tweets = fetchHomeTimeline($authToken, $csrfToken, $cookie);
    if (isset($tweets['error'])) {
        json_response($tweets, 500);
        return;
    }
    
    // Load existing and merge
    $existing = file_exists($tweetsFile) ? (json_decode(file_get_contents($tweetsFile), true) ?: []) : [];
    $byId = [];
    foreach ($existing as $t) $byId[$t['id']] = $t;
    
    $newCount = 0;
    foreach ($tweets as $tweet) {
        if (!isset($byId[$tweet['id']])) $newCount++;
        $byId[$tweet['id']] = $tweet;
    }
    
    $allTweets = array_values($byId);
    
    // Classify topics
    $following = json_decode(file_get_contents($followingFile), true) ?: [];
    $followingMap = [];
    foreach ($following as $acct) {
        $handle = strtolower(ltrim($acct['handle'] ?? '', '@'));
        if ($handle) $followingMap[$handle] = $acct;
    }
    foreach ($allTweets as &$tweet) {
        $tweet['topics'] = classifyTweet($tweet, $followingMap);
    }
    
    usort($allTweets, function($a, $b) { return ($b['sort_ts'] ?? 0) - ($a['sort_ts'] ?? 0); });
    file_put_contents($tweetsFile, json_encode($allTweets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    json_response([
        'success' => true,
        'new_tweets' => $newCount,
        'total_tweets' => count($allTweets),
        'fetched' => count($tweets)
    ]);
}

// ═══════════════════════════════════════════
function fetchHomeTimeline($authToken, $csrfToken, $cookie) {
    $queryId = 'HJFjzBgCs16TqxewQOeLNg';
    $endpoint = "https://x.com/i/api/graphql/$queryId/HomeTimeline";
    
    $variables = json_encode([
        "count" => 40,
        "includePromotedContent" => false,
        "latestControlAvailable" => true,
        "requestContext" => "launch",
        "withCommunity" => true,
    ]);
    $features = json_encode([
        "rweb_tipjar_consumption_enabled" => true,
        "responsive_web_graphql_exclude_directive_enabled" => true,
        "verified_phone_label_enabled" => false,
        "creator_subscriptions_tweet_preview_api_enabled" => true,
        "responsive_web_graphql_timeline_navigation_enabled" => true,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled" => false,
        "communities_web_enable_tweet_community_results_fetch" => true,
        "c9s_tweet_anatomy_moderator_badge_enabled" => true,
        "articles_preview_enabled" => true,
        "responsive_web_edit_tweet_api_enabled" => true,
        "graphql_is_translatable_rweb_tweet_is_translatable_enabled" => true,
        "view_counts_everywhere_api_enabled" => true,
        "longform_notetweets_consumption_enabled" => true,
        "responsive_web_twitter_article_tweet_consumption_enabled" => true,
        "tweet_awards_web_tipping_enabled" => false,
        "creator_subscriptions_quote_tweet_preview_enabled" => false,
        "freedom_of_speech_not_reach_fetch_enabled" => true,
        "standardized_nudges_misinfo" => true,
        "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled" => true,
        "rweb_video_timestamps_enabled" => true,
        "longform_notetweets_rich_text_read_enabled" => true,
        "longform_notetweets_inline_media_enabled" => true,
        "responsive_web_enhance_cards_enabled" => false,
    ]);
    
    $url = $endpoint . '?' . http_build_query(['variables' => $variables, 'features' => $features]);
    
    $headers = [
        'Authorization: Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        'X-Csrf-Token: ' . $csrfToken,
        'Cookie: ' . $cookie,
        'Content-Type: application/json',
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer: https://x.com/home',
        'X-Twitter-Active-User: yes',
        'X-Twitter-Auth-Type: OAuth2Session',
        'X-Twitter-Client-Language: en',
    ];
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) return ['error' => "CURL error: $curlError"];
    if ($httpCode !== 200) return ['error' => "Twitter API HTTP $httpCode", 'body' => substr($response, 0, 500)];
    
    $data = json_decode($response, true);
    if (!$data) return ['error' => 'Failed to parse Twitter response'];
    
    return parseTimelineResponse($data);
}

// ═══════════════════════════════════════════
function parseTimelineResponse($data) {
    $tweets = [];
    $instructions = $data['data']['home']['home_timeline_urt']['instructions'] ?? [];
    
    foreach ($instructions as $instruction) {
        if (($instruction['type'] ?? '') !== 'TimelineAddEntries') continue;
        foreach ($instruction['entries'] ?? [] as $entry) {
            $content = $entry['content'] ?? [];
            if (($content['entryType'] ?? '') === 'TimelineTimelineItem') {
                $tweet = extractTweet($content['itemContent']['tweet_results']['result'] ?? []);
                if ($tweet) $tweets[] = $tweet;
            }
            if (($content['entryType'] ?? '') === 'TimelineTimelineModule') {
                foreach ($content['items'] ?? [] as $item) {
                    $tweet = extractTweet($item['item']['itemContent']['tweet_results']['result'] ?? []);
                    if ($tweet) $tweets[] = $tweet;
                }
            }
        }
    }
    return $tweets;
}

function extractTweet($result) {
    if (!$result) return null;
    if (isset($result['tweet'])) $result = $result['tweet'];
    
    $legacy = $result['legacy'] ?? [];
    $core = $result['core']['user_results']['result'] ?? [];
    $userLegacy = $core['legacy'] ?? [];
    if (!$legacy || !$userLegacy) return null;
    
    $fullText = $legacy['full_text'] ?? $legacy['text'] ?? '';
    $media = [];
    foreach ($legacy['extended_entities']['media'] ?? $legacy['entities']['media'] ?? [] as $m) {
        $media[] = [
            'url' => $m['media_url_https'] ?? '',
            'type' => $m['type'] ?? 'photo',
        ];
    }
    
    $createdAt = $legacy['created_at'] ?? '';
    $ts = strtotime($createdAt);
    
    return [
        'id' => $legacy['id_str'] ?? $result['rest_id'] ?? '',
        'text' => $fullText,
        'created_at' => $createdAt,
        'sort_ts' => $ts ?: 0,
        'user_handle' => $userLegacy['screen_name'] ?? '',
        'user_name' => $userLegacy['name'] ?? '',
        'user_avatar' => $userLegacy['profile_image_url_https'] ?? '',
        'user_verified' => !empty($core['is_blue_verified']),
        'retweet_count' => $legacy['retweet_count'] ?? 0,
        'favorite_count' => $legacy['favorite_count'] ?? 0,
        'reply_count' => $legacy['reply_count'] ?? 0,
        'views' => $result['views']['count'] ?? '0',
        'is_retweet' => strpos($fullText, 'RT @') === 0,
        'media' => $media,
        'topics' => [],
    ];
}

// ═══════════════════════════════════════════
function classifyTweet($tweet, $followingMap = []) {
    $text = strtolower(($tweet['text'] ?? '') . ' ' . ($tweet['user_name'] ?? '') . ' ' . ($tweet['user_handle'] ?? ''));
    $handle = strtolower($tweet['user_handle'] ?? '');
    if (isset($followingMap[$handle])) {
        $text .= ' ' . strtolower($followingMap[$handle]['description'] ?? '');
    }
    
    $topics = [];
    $btc = ['bitcoin','btc','satoshi','lightning network','crypto','blockchain','hodl','sats','#bitcoin','nostr','web3','defi','eth','ethereum','mining','halving','wallet','stablecoin','mempool'];
    $sports = ['nfl','nba','mlb','nhl','super bowl','touchdown','quarterback','playoffs','championship','baseball','football','basketball','hockey','soccer','world cup','olympics','athlete','coach','draft','roster','raiders','chiefs','seahawks','patriots','lakers','celtics','yankees','dodgers'];
    $tech = ['ai ','artificial intelligence','machine learning','gpt','openai','claude','anthropic','programming','software','startup','silicon valley','developer','github','coding','api','saas','cloud','cybersecurity','robotics','quantum','spacex','tesla','apple ','google','microsoft','nvidia'];
    $politics = ['trump','biden','congress','senate','democrat','republican','election','vote ','legislation','policy','governor','president','supreme court','political','gop','dnc','rnc','impeach','partisan','liberal','conservative','tariff','epstein','white house','doge ','maga'];
    
    foreach ($btc as $kw) { if (strpos($text, $kw) !== false) { $topics[] = 'bitcoin'; break; } }
    foreach ($sports as $kw) { if (strpos($text, $kw) !== false) { $topics[] = 'sports'; break; } }
    foreach ($tech as $kw) { if (strpos($text, $kw) !== false) { $topics[] = 'tech'; break; } }
    foreach ($politics as $kw) { if (strpos($text, $kw) !== false) { $topics[] = 'politics'; break; } }
    
    return $topics ?: ['general'];
}

// ═══════════════════════════════════════════
function showStatus($tweetsFile, $followingFile) {
    $tc = 0; $lu = null;
    if (file_exists($tweetsFile)) {
        $tc = count(json_decode(file_get_contents($tweetsFile), true) ?: []);
        $lu = date('Y-m-d H:i:s', filemtime($tweetsFile));
    }
    $fc = file_exists($followingFile) ? count(json_decode(file_get_contents($followingFile), true) ?: []) : 0;
    json_response(['tweets_cached' => $tc, 'following_count' => $fc, 'last_update' => $lu, 'auth_configured' => defined('TWITTER_AUTH_TOKEN')]);
}

function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}


// ═══════════════════════════════════════════
function cdnRefresh() {
    $script = __DIR__ . '/cdn-fetch.py';
    if (!file_exists($script)) {
        json_response(['error' => 'cdn-fetch.py not found'], 500);
        return;
    }
    
    // Check if already running
    $lockFile = __DIR__ . '/../data/.cdn-fetch.lock';
    if (file_exists($lockFile) && (time() - filemtime($lockFile)) < 300) {
        json_response(['status' => 'already_running', 'message' => 'Fetch already in progress. Check back in a few minutes.']);
        return;
    }
    
    // Create lock
    file_put_contents($lockFile, time());
    
    // Run in background
    $cmd = 'cd ' . escapeshellarg(__DIR__) . ' && /usr/bin/python3 cdn-fetch.py > /dev/null 2>&1 &';
    exec($cmd);
    
    // Also try immediate small batch via direct PHP
    $tweetsFile = __DIR__ . '/../data/tweets.json';
    $tweets = json_decode(file_get_contents($tweetsFile), true) ?: [];
    
    json_response([
        'status' => 'started',
        'message' => 'CDN fetch started in background. Tweets will refresh automatically.',
        'current_count' => count($tweets),
    ]);
}
