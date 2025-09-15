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

$response = array('status' => 'error', 'message' => 'Une erreur est survenue.');

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (!empty($data->name) && !empty($data->email) && !empty($data->password)) {
        $name = htmlspecialchars(strip_tags($data->name));
        $email = htmlspecialchars(strip_tags($data->email));
        $password = htmlspecialchars(strip_tags($data->password));

        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $database = new Database();
            $db = $database->getConnection(); // PDO ou mysqli

            $query = "SELECT id FROM users WHERE email = ?";
            $stmt = $db->prepare($query);
            $stmt->bindParam(1, $email);
            $stmt->execute();

            if ($stmt->rowCount() == 0) {
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);

                $query = "INSERT INTO users SET name=?, email=?, password=?, status='online'";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $name);
                $stmt->bindParam(2, $email);
                $stmt->bindParam(3, $hashed_password);

                if ($stmt->execute()) {
                    $lastId = $db->lastInsertId(); // ou $db->insert_id si mysqli
                    $jwt = new JwtHandler();
                    $token = $jwt->generateToken($lastId, $email);

                    $response['status'] = 'success';
                    $response['message'] = 'Utilisateur créé avec succès.';
                    $response['token'] = $token;
                    $response['user'] = array(
                        'id' => $lastId,
                        'name' => $name,
                        'email' => $email,
                        'status' => 'online'
                    );
                } else {
                    $response['message'] = 'Erreur lors de la création de l\'utilisateur.';
                }
            } else {
                $response['message'] = 'Cet email est déjà utilisé.';
            }
        } else {
            $response['message'] = 'Email invalide.';
        }
    } else {
        $response['message'] = 'Données manquantes.';
    }
} else {
    $response['message'] = 'Méthode non autorisée.';
}

echo json_encode($response);
?>
