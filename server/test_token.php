<?php
require_once 'config/jwt.php';

$token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0IiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdCIsImlhdCI6MTc1NzI2MzM2NSwiZXhwIjoxNzU3MjY2OTY1LCJkYXRhIjp7ImlkIjoiMSIsImVtYWlsIjoia29uZXQub3VzbWFuZUBnbWFpbC5jb21rIn19.4brfnXA05SOriEDxgYPk_T-dqiisD7Pm01hcvud2pt8";

$jwt = new JwtHandler();
$result = $jwt->validateToken($token);

echo json_encode([
    "token" => $token,
    "is_valid" => $result !== false,
    "decoded" => $result
]);
?>