<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Origin, Accept");

// Autoriser explicitement le header Authorization
if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
    header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Inclure les fichiers de configuration
require_once '../config/database.php';
require_once '../config/jwt.php';

// Réponse par défaut
$response = array('status' => 'error', 'message' => 'Une erreur est survenue.');

// Vérifier si la méthode est POST
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Récupérer le header Authorization
    $headers = apache_request_headers();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : null;
    
    if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        
        // Valider le token
        $jwt = new JwtHandler();
        $user_data = $jwt->validateToken($token);
        
        if ($user_data) {
            // Connexion à la base de données
            $database = new Database();
            $db = $database->getConnection();
            
            // Mettre à jour le statut de l'utilisateur
            $query = "UPDATE users SET status='offline', last_seen=NOW() WHERE id=?";
            $stmt = $db->prepare($query);
            $stmt->bindParam(1, $user_data->id);
            
            if ($stmt->execute()) {
                $response['status'] = 'success';
                $response['message'] = 'Déconnexion réussie.';
            } else {
                $response['message'] = 'Erreur lors de la déconnexion.';
            }
        } else {
            $response['message'] = 'Token invalide.';
        }
    } else {
        $response['message'] = 'Token manquant.';
    }
} else {
    $response['message'] = 'Méthode non autorisée.';
}

// Retourner la réponse JSON
echo json_encode($response);
?>