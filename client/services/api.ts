import axios from 'axios';
import { Platform } from 'react-native';

// URL de base de l'API - CORRIGÉ
const API_BASE_URL = 'http://192.168.1.27//messenger-app/server/api';

// Interface pour les réponses API
export interface ApiResponse {
  status: 'success' | 'error';
  message: string;
  [key: string]: any;
}

// Classe de service API - CORRIGÉE
class ApiService {
  private authToken: string | null = null;

  // Définir le token d'authentification
  setAuthToken(token: string | null) {
    this.authToken = token;
    console.log('Token défini dans apiService:', token);
  }

  // Méthode pour construire l'URL complète - NOUVEAU
  private buildUrl(endpoint: string): string {
    // Supprimer le slash initial si présent
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
  }

  // Méthode générique GET - CORRIGÉE
  async get(endpoint: string, params?: any): Promise<ApiResponse> {
    try {
      const url = this.buildUrl(endpoint);
      console.log('GET request to:', url, 'with token:', this.authToken);

      const config: any = {
        params: { ...params },
        headers: {},
        timeout: 10000, // Ajout d'un timeout
      };

      // Ajouter token si présent
      if (this.authToken) {
        if (Platform.OS === 'android') {
          config.params.token = this.authToken;
          console.log('Token ajouté comme paramètre GET pour Android');
        } else {
          config.headers['Authorization'] = `Bearer ${this.authToken}`;
          console.log('Authorization header set pour iOS/Web');
        }
      }

      const response = await axios.get(url, config);
      return response.data;
    } catch (error: any) {
      console.error('GET Error:', error);
      throw this.handleError(error);
    }
  }

  // Méthode générique POST - CORRIGÉE
  async post(endpoint: string, data?: any): Promise<ApiResponse> {
    try {
      const url = this.buildUrl(endpoint);
      console.log('POST request to:', url, 'with token:', this.authToken);

      const config: any = {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      };

      let finalUrl = url;

      // Ne pas envoyer de token pour inscription / connexion
      const skipToken = endpoint.includes('register.php') || endpoint.includes('login.php');

      if (!skipToken && this.authToken) {
        if (Platform.OS === 'android') {
          // Token en paramètre GET pour Android
          const urlParams = new URLSearchParams();
          urlParams.append('token', this.authToken);
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + urlParams.toString();
        } else {
          // Token dans header pour iOS/Web
          config.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
      }

      const response = await axios.post(finalUrl, data, config);
      return response.data;
    } catch (error: any) {
      console.error('POST Error:', error);
      throw this.handleError(error);
    }
  }

  // Méthode pour uploader des fichiers - CORRIGÉE
  async uploadFile(fileUri: string, fieldName: string = 'image'): Promise<ApiResponse> {
    try {
      const url = this.buildUrl('upload.php');
      
      // Créer FormData correctement
      const formData = new FormData();
      
      // Extraire le nom de fichier de l'URI
      const filename = fileUri.split('/').pop() || 'file.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append(fieldName, {
        uri: fileUri,
        type: type,
        name: filename,
      } as any);

      const config: any = {
        headers: { 
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // Timeout plus long pour les uploads
      };

      if (this.authToken) {
        config.headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await axios.post(url, formData, config);
      return response.data;
    } catch (error: any) {
      console.error('Upload Error:', error);
      throw this.handleError(error);
    }
  }

  // Gestion des erreurs améliorée - CORRIGÉE
  private handleError(error: any): Error {
    console.error('API Error Details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
    });

    if (error.response) {
      // Erreur du serveur (4xx, 5xx)
      const serverMessage = error.response.data?.message || error.response.data?.error;
      return new Error(serverMessage || `Erreur serveur (${error.response.status})`);
    } else if (error.request) {
      // Pas de réponse du serveur
      if (error.code === 'ECONNABORTED') {
        return new Error('Timeout: Le serveur ne répond pas');
      }
      return new Error('Network Error: Impossible de se connecter au serveur');
    } else {
      // Erreur de configuration
      return new Error('Erreur de configuration de la requête: ' + error.message);
    }
  }
}

// Exporter une instance unique du service
export const api = new ApiService();