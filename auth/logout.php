<?php
/**
 * 1n2.org Universal Logout
 */
require_once __DIR__ . '/config.php';

$auth = createAuth();
$auth->logout();

$returnUrl = $_GET['return'] ?? '/';
header('Location: ' . $returnUrl);
exit;
