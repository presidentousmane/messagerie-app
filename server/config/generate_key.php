<?php
// Génère 32 octets aléatoires (64 caractères hexadécimaux)
$secret = bin2hex(random_bytes(32));
echo "Ta clé secrète JWT : " . $secret;
?>
