<?php
/**
 * Gestion des tokens JWT pour l'authentification
 * Utilise la bibliothèque firebase/php-jwt
 */

require_once __DIR__ . '/../vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtHandler {
    protected $secret_key;
    protected $issued_at;
    protected $expire_time;

    // Constructeur pour initialiser les paramètres JWT
    public function __construct() {
        $this->secret_key = "9e5f9707a82b609c4d21bcc8927c9685d70b285a0c34c8fffd42644ad4004535";
        $this->issued_at = time();
        $this->expire_time = $this->issued_at + (60 * 60); // Token valide 1 heure
    }

    // Génération d'un token JWT
    public function generateToken($user_id, $email) {
        $payload = array(
            "iss" => "http://localhost",
            "aud" => "http://localhost",
            "iat" => $this->issued_at,
            "exp" => $this->expire_time,
            "data" => array(
                "id" => (int)$user_id, // S'assurer que c'est un integer
                "email" => $email
            )
        );

        return JWT::encode($payload, $this->secret_key, 'HS256');
    }

    // Vérification et décodage du token JWT
    public function validateToken($token) {
        try {
            $decoded = JWT::decode($token, new Key($this->secret_key, 'HS256'));
            
            // Conversion en object simple pour éviter les problèmes
            $user_data = (object)[
                'id' => (int)$decoded->data->id, // S'assurer que c'est un integer
                'email' => $decoded->data->email
            ];
            
            error_log("Token VALIDE - User ID: " . $user_data->id . ", Email: " . $user_data->email);
            return $user_data;
            
        } catch (Exception $e) {
            error_log("Erreur validation JWT: " . $e->getMessage());
            error_log("Token qui a échoué: " . $token);
            return false;
        }
    }
}
?>