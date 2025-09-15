<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Réponse simple pour tester
echo json_encode([
    "status" => "success", 
    "message" => "API fonctionne correctement!",
    "timestamp" => date('Y-m-d H:i:s'),
    "method" => $_SERVER['REQUEST_METHOD']
]);
?>