<?php

$dirs = [
    '/app/bootstrap/cache',
    '/app/storage/app',
    '/app/storage/app/public',
    '/app/storage/framework/cache',
    '/app/storage/framework/cache/data',
    '/app/storage/framework/sessions',
    '/app/storage/framework/testing',
    '/app/storage/framework/views',
    '/app/storage/logs',
];

foreach ($dirs as $dir) {
    if (! is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
}

passthru('php -t /app/public -S localhost:8080 /app/wasmer-router.php', $exitCode);
exit($exitCode);
