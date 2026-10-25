<?php
// MySQL connection settings. Change these if your local MySQL setup is different.
$DB_HOST = 'localhost';
$DB_NAME = 'peopleflow';
$DB_USER = 'root';
$DB_PASSWORD = '';

$dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASSWORD, $options);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Cannot connect to MySQL. Check config.php and make sure MySQL is running.']);
    exit;
}
