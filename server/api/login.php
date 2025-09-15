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
require_once '../config/database.php';
require_once '../config/jwt.php';

// Réponse par défaut
$response = array('status' => 'error', 'message' => 'Une erreur est survenue.');

// Vérifier si la méthode est POST
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Récupérer les données POST
    $data = json_decode(file_get_contents("php://input"));
    
    // Valider les données
    if (!empty($data->email) && !empty($data->password)) {
        // Nettoyer les données
        $email = htmlspecialchars(strip_tags($data->email));
        $password = htmlspecialchars(strip_tags($data->password));
        
        // Connexion à la base de données
        $database = new Database();
        $db = $database->getConnection();
        
        // Rechercher l'utilisateur par email
        $query = "SELECT id, name, email, password, profile_picture, status, last_seen FROM users WHERE email = ?";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $email);
        $stmt->execute();
        
        if ($stmt->rowCount() == 1) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $id = $row['id'];
            $name = $row['name'];
            $email = $row['email'];
            $hashed_password = $row['password'];
            $profile_picture = $row['profile_picture'];
            $status = $row['status'];
            
            // Vérifier le mot de passe
            if (password_verify($password, $hashed_password)) {
                // Mettre à jour le statut de l'utilisateur
                $update_query = "UPDATE users SET status='online', last_seen=NOW() WHERE id=?";
                $update_stmt = $db->prepare($update_query);
                $update_stmt->bindParam(1, $id);
                $update_stmt->execute();
                
                // Générer un token JWT
                $jwt = new JwtHandler();
                $token = $jwt->generateToken($id, $email);
                
                $response['status'] = 'success';
                $response['message'] = 'Connexion réussie.';
                $response['token'] = $token;
                $response['user'] = array(
                    'id' => $id,
                    'name' => $name,
                    'email' => $email,
                    'profile_picture' => $profile_picture,
                    'status' => 'online'
                );
            } else {
                $response['message'] = 'Mot de passe incorrect.';
            }
        } else {
            $response['message'] = 'Aucun utilisateur trouvé avec cet email.';
        }
    } else {
        $response['message'] = 'Email et mot de passe requis.';
    }
} else {
    $response['message'] = 'Méthode non autorisée.';
}

// Retourner la réponse JSON
echo json_encode($response);
?>