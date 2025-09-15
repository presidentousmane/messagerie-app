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
            // Vérifier si un fichier a été uploadé
            if (isset($_FILES['image'])) {
                $file = $_FILES['image'];
                
                // Vérifier les erreurs d'upload
                if ($file['error'] === UPLOAD_ERR_OK) {
                    // Vérifier le type de fichier
                    $fileType = exif_imagetype($file['tmp_name']);
                    $allowedTypes = array(IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF);
                    
                    if (in_array($fileType, $allowedTypes)) {
                        // Vérifier la taille du fichier (max 5MB)
                        if ($file['size'] <= 5 * 1024 * 1024) {
                            // Créer le dossier uploads s'il n'existe pas
                            if (!file_exists('../uploads')) {
                                mkdir('../uploads', 0777, true);
                            }
                            
                            // Générer un nom de fichier unique
                            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                            $filename = uniqid() . '.' . $extension;
                            $destination = '../uploads/' . $filename;
                            
                            // Déplacer le fichier
                            if (move_uploaded_file($file['tmp_name'], $destination)) {
                                // Connexion à la base de données
                                $database = new Database();
                                $db = $database->getConnection();
                                
                                // Mettre à jour le profil de l'utilisateur
                                $query = "UPDATE users SET profile_picture = ? WHERE id = ?";
                                $stmt = $db->prepare($query);
                                $stmt->bindParam(1, $filename);
                                $stmt->bindParam(2, $user_data->id);
                                
                                if ($stmt->execute()) {
                                    $response['status'] = 'success';
                                    $response['message'] = 'Image uploadée avec succès.';
                                    $response['filename'] = $filename;
                                } else {
                                    $response['message'] = 'Erreur lors de la mise à jour du profil.';
                                    // Supprimer le fichier uploadé en cas d'erreur
                                    unlink($destination);
                                }
                            } else {
                                $response['message'] = 'Erreur lors du déplacement du fichier.';
                            }
                        } else {
                            $response['message'] = 'Le fichier est trop volumineux (max 5MB).';
                        }
                    } else {
                        $response['message'] = 'Type de fichier non autorisé. Seuls JPG, PNG et GIF sont acceptés.';
                    }
                } else {
                    $response['message'] = 'Erreur lors de l\'upload du fichier.';
                }
            } else {
                $response['message'] = 'Aucun fichier uploadé.';
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