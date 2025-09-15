<?php
// DEBUG - Afficher toutes les informations de la requête
error_log("=== DEBUG MESSAGES.PHP ===");
error_log("Méthode: " . $_SERVER['REQUEST_METHOD']);
error_log("Headers: " . print_r(apache_request_headers(), true));
error_log("GET params: " . print_r($_GET, true));
error_log("POST input: " . file_get_contents("php://input"));

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Origin, Accept");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Activer l'affichage des erreurs pour le debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../config/database.php';
require_once '../config/jwt.php';

$response = array('status' => 'error', 'message' => 'Une erreur est survenue.');

try {
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

    if (empty($token)) {
        throw new Exception('Token manquant.');
    }

    // Valider le token
    $jwt = new JwtHandler();
    $user_data = $jwt->validateToken($token);
    
    if (!$user_data) {
        throw new Exception('Token invalide.');
    }

    error_log("User data validé: " . print_r($user_data, true));

    // Connexion à la base de données
    $database = new Database();
    $db = $database->getConnection();
    
    // Gérer les différentes méthodes HTTP
    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        // Envoyer un message
        $input = file_get_contents("php://input");
        error_log("Input POST: " . $input);
        $data = json_decode($input);
        
        if (!$data) {
            throw new Exception('Données JSON invalides');
        }

        if (empty($data->receiver_id)) {
            throw new Exception('Destinataire requis.');
        }

        $receiver_id = (int)htmlspecialchars(strip_tags($data->receiver_id));

        // ===== GESTION DES TYPES DE MESSAGE =====
        if (isset($data->audio_data)) {
            // ===== MESSAGE AUDIO =====
            $audio_data = $data->audio_data;
            
            // Vérifier que les données audio sont présentes
            if (empty($audio_data)) {
                throw new Exception('Données audio manquantes.');
            }

            // Créer le dossier audio s'il n'existe pas
            $audio_dir = '../uploads/audio/';
            if (!file_exists($audio_dir)) {
                if (!mkdir($audio_dir, 0777, true)) {
                    throw new Exception('Impossible de créer le dossier audio.');
                }
            }

            // Générer un nom de fichier unique
            $filename = uniqid() . '_' . time() . '.m4a';
            $filepath = $audio_dir . $filename;

            // Décoder les données base64
            $decoded_audio = base64_decode($audio_data);
            if ($decoded_audio === false) {
                throw new Exception('Erreur décodage données audio.');
            }

            // Sauvegarder le fichier
            if (file_put_contents($filepath, $decoded_audio) === false) {
                throw new Exception('Erreur sauvegarde fichier audio.');
            }

            // Préparer la requête pour message audio
            $content = $filename; // Stocker le nom du fichier
            $message_type = 'audio';

            $query = "INSERT INTO messages SET sender_id=?, receiver_id=?, content=?, message_type=?, audio_filename=?";
            $stmt = $db->prepare($query);
            $stmt->bindParam(1, $user_data->id, PDO::PARAM_INT);
            $stmt->bindParam(2, $receiver_id, PDO::PARAM_INT);
            $stmt->bindParam(3, $content);
            $stmt->bindParam(4, $message_type);
            $stmt->bindParam(5, $filename);

        } else {
            // ===== MESSAGE TEXTE =====
            if (empty($data->content)) {
                throw new Exception('Contenu du message manquant.');
            }

            $content = htmlspecialchars(strip_tags($data->content));
            $message_type = isset($data->message_type) ? $data->message_type : 'text';

            $query = "INSERT INTO messages SET sender_id=?, receiver_id=?, content=?, message_type=?";
            $stmt = $db->prepare($query);
            $stmt->bindParam(1, $user_data->id, PDO::PARAM_INT);
            $stmt->bindParam(2, $receiver_id, PDO::PARAM_INT);
            $stmt->bindParam(3, $content);
            $stmt->bindParam(4, $message_type);
        }
        
        // Exécuter la requête
        if ($stmt->execute()) {
            $response['status'] = 'success';
            $response['message'] = 'Message envoyé.';
            $response['message_id'] = $db->lastInsertId();
            $response['message_type'] = $message_type;
            
            if ($message_type === 'audio') {
                $response['audio_filename'] = $filename;
            }
        } else {
            throw new Exception('Erreur lors de l\'envoi du message: ' . implode(', ', $stmt->errorInfo()));
        }

    } elseif ($_SERVER['REQUEST_METHOD'] == 'GET') {
        // Récupérer les messages entre deux utilisateurs
        if (!isset($_GET['userA']) || !isset($_GET['userB'])) {
            throw new Exception('Paramètres userA et userB requis.');
        }

        $userA = (int)$_GET['userA'];
        $userB = (int)$_GET['userB'];
        
        error_log("Récupération messages entre userA: $userA et userB: $userB (User connecté: " . $user_data->id . ")");
        
        // Vérifier que l'utilisateur connecté fait partie de la conversation
        if ($user_data->id != $userA && $user_data->id != $userB) {
            throw new Exception('Non autorisé à voir ces messages. User connecté: ' . $user_data->id . ', Conversation: ' . $userA . '-' . $userB);
        }

        $query = "SELECT m.*, u.name as sender_name, u.profile_picture as sender_picture 
                  FROM messages m 
                  JOIN users u ON m.sender_id = u.id 
                  WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) 
                  ORDER BY created_at ASC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $userA, PDO::PARAM_INT);
        $stmt->bindParam(2, $userB, PDO::PARAM_INT);
        $stmt->bindParam(3, $userB, PDO::PARAM_INT);
        $stmt->bindParam(4, $userA, PDO::PARAM_INT);
        
        if (!$stmt->execute()) {
            throw new Exception('Erreur lors de la récupération des messages: ' . implode(', ', $stmt->errorInfo()));
        }
        
        $messages = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $messages[] = $row;
        }
        
        // Marquer les messages comme lus
        $update_query = "UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE";
        $update_stmt = $db->prepare($update_query);
        $update_stmt->bindParam(1, $user_data->id, PDO::PARAM_INT);
        $other_user_id = ($user_data->id == $userA) ? $userB : $userA;
        $update_stmt->bindParam(2, $other_user_id, PDO::PARAM_INT);
        $update_stmt->execute();
        
        $response['status'] = 'success';
        $response['message'] = 'Messages récupérés.';
        $response['messages'] = $messages;
    } else {
        throw new Exception('Méthode non autorisée.');
    }

} catch (Exception $e) {
    error_log("Erreur messages.php: " . $e->getMessage());
    $response['message'] = $e->getMessage();
    http_response_code(500);
}

// Retourner la réponse JSON
echo json_encode($response);
?>