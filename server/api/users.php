<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Origin, Accept");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../config/jwt.php';

$response = array('status' => 'error', 'message' => 'Une erreur est survenue.');

// Vérifier si la méthode est GET
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    // METHODE 1 : Récupérer le token depuis les headers
    $authHeader = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } 
    elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        }
    }
    
    // METHODE 2 : Récupérer le token depuis les paramètres GET (pour Android)
    $token = null;
    if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        error_log("Token reçu via header: " . $token);
    } 
    elseif (isset($_GET['token'])) {
        $token = $_GET['token'];
        error_log("Token reçu via paramètre GET: " . $token);
    }
    
    if (!empty($token)) {
        // Valider le token
        $jwt = new JwtHandler();
        $user_data = $jwt->validateToken($token);
        
        if ($user_data) {
            // Connexion à la base de données
            $database = new Database();
            $db = $database->getConnection();
            
            // Récupérer tous les utilisateurs sauf l'utilisateur connecté
            $query = "SELECT id, name, email, profile_picture, status, last_seen FROM users WHERE id != ? ORDER BY name ASC";
            $stmt = $db->prepare($query);
            $stmt->bindParam(1, $user_data->id);
            $stmt->execute();
            
            $users = array();
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $users[] = $row;
            }
            
            $response['status'] = 'success';
            $response['message'] = 'Liste des utilisateurs récupérée.';
            $response['users'] = $users;
        } else {
            $response['message'] = 'Token invalide.';
            error_log("Token invalide: " . $token);
        }
    } else {
        $response['message'] = 'Token manquant.';
        error_log("Aucun token reçu");
    }
} else {
    $response['message'] = 'Méthode non autorisée.';
}

// Retourner la réponse JSON
echo json_encode($response);
?>