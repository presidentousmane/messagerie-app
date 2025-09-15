<?php
require_once 'config/jwt.php';

// Testez avec le token qui fonctionne pour users.php
$token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0IiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdCIsImlhdCI6MTc1NzMxMjg2OCwiZXhwIjoxNzU3MzE2NDY4LCJkYXRhIjp7ImlkIjoiMyIsImVtYWlsIjoia29uZXQub3VzbWFuZUBnbWFpbC5jb20ifX0.A2x8zXpoorUIt3mL7i8i8_xKKnGzMoeOs_NvbJ0kiCE";

$jwt = new JwtHandler();
$result = $jwt->validateToken($token);

echo "Token testé: " . $token . "<br><br>";
echo "Résultat validation: " . ($result ? "VALIDE" : "INVALIDE") . "<br><br>";
echo "Détails: " . print_r($result, true);
?>