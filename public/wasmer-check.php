<?php

header('Content-Type: application/json');

$result = [
    'php' => PHP_VERSION,
    'time' => gmdate('c'),
    'env' => [
        'APP_ENV' => getenv('APP_ENV') ?: null,
        'APP_DEBUG' => getenv('APP_DEBUG') ?: null,
        'APP_KEY_present' => (bool) getenv('APP_KEY'),
        'DB_CONNECTION' => getenv('DB_CONNECTION') ?: null,
        'DB_HOST_present' => (bool) getenv('DB_HOST'),
        'DB_DATABASE_present' => (bool) getenv('DB_DATABASE'),
        'DB_USERNAME_present' => (bool) getenv('DB_USERNAME'),
        'DB_PASSWORD_present' => (bool) getenv('DB_PASSWORD'),
        'DB_SSLMODE' => getenv('DB_SSLMODE') ?: null,
    ],
    'extensions' => [
        'pdo' => extension_loaded('pdo'),
        'pdo_pgsql' => extension_loaded('pdo_pgsql'),
        'pgsql' => extension_loaded('pgsql'),
        'openssl' => extension_loaded('openssl'),
        'mbstring' => extension_loaded('mbstring'),
        'fileinfo' => extension_loaded('fileinfo'),
        'gd' => extension_loaded('gd'),
        'zip' => extension_loaded('zip'),
    ],
    'paths' => [
        'storage_logs_writable' => is_writable(__DIR__ . '/../storage/logs'),
        'storage_framework_writable' => is_writable(__DIR__ . '/../storage/framework'),
        'bootstrap_cache_writable' => is_writable(__DIR__ . '/../bootstrap/cache'),
    ],
    'database' => [
        'attempted' => false,
        'ok' => false,
        'error' => null,
    ],
];

if (
    extension_loaded('pdo_pgsql')
    && getenv('DB_HOST')
    && getenv('DB_DATABASE')
    && getenv('DB_USERNAME')
    && getenv('DB_PASSWORD')
) {
    $result['database']['attempted'] = true;

    try {
        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
            getenv('DB_HOST'),
            getenv('DB_PORT') ?: '5432',
            getenv('DB_DATABASE'),
            getenv('DB_SSLMODE') ?: 'require'
        );

        $pdo = new PDO($dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 8,
        ]);

        $result['database']['ok'] = (bool) $pdo->query('select 1')->fetchColumn();
    } catch (Throwable $e) {
        $result['database']['error'] = $e->getMessage();
    }
}

echo json_encode($result, JSON_PRETTY_PRINT);
