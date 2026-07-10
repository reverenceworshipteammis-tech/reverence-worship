<?php

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$file = realpath('/app/public' . $path);

if ($file !== false && str_starts_with($file, '/app/public') && is_file($file)) {
    return false;
}

require '/app/public/index.php';
