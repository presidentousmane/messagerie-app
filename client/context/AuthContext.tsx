/**
 * Contexte d'authentification pour gérer l'état de l'utilisateur connecté
 * et le token JWT stocké de manière sécurisée
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

// Interface pour les données utilisateur
interface User {
  id: number;
  name: string;
  email: string;
  profile_picture: string | null;
  status: string;
}

// Interface pour le contexte d'authentification
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

// Création du contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personnalisé pour utiliser le contexte
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Props du provider
interface AuthProviderProps {
  children: ReactNode;
}

// Provider d'authentification
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier si un token existe au chargement de l'app
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        console.log('Token retrouvé au démarrage:', token);
        
        if (token) {
          api.setAuthToken(token);
          const userResponse = await api.get('/users.php');
          console.log('Réponse de users.php:', userResponse);
          
          if (userResponse.status === 'success' && userResponse.users) {
            // Récupérer l'email stocké
            const storedEmail = await SecureStore.getItemAsync('userEmail');
            console.log('Email stocké:', storedEmail);

            // Trouver l'utilisateur actuel dans la liste
            let currentUser = null;
            
            // Méthode 1: Recherche par email (insensible à la casse)
            if (storedEmail) {
              currentUser = userResponse.users.find(
                (u: any) => u.email.toLowerCase() === storedEmail.toLowerCase()
              );
            }
            
            // Méthode 2: Si non trouvé, prendre le premier utilisateur (temporaire)
            if (!currentUser && userResponse.users.length > 0) {
              console.log('Utilisateur non trouvé par email, prise du premier utilisateur');
              currentUser = userResponse.users[0];
              
              // Mettre à jour l'email stocké avec le bon email
              if (currentUser.email) {
                await SecureStore.setItemAsync('userEmail', currentUser.email);
                console.log('Email stocké mis à jour:', currentUser.email);
              }
            }

            if (currentUser) {
              console.log('Utilisateur trouvé:', currentUser);
              setUser(currentUser);
            } else {
              console.log('Aucun utilisateur trouvé - déconnexion');
              await SecureStore.deleteItemAsync('userToken');
              await SecureStore.deleteItemAsync('userEmail');
              api.setAuthToken(null);
            }
          } else {
            console.log('Erreur dans la réponse users.php:', userResponse.message);
            // Si token invalide, supprimer les tokens stockés
            if (userResponse.message.includes('invalide') || userResponse.message.includes('manquant')) {
              await SecureStore.deleteItemAsync('userToken');
              await SecureStore.deleteItemAsync('userEmail');
              api.setAuthToken(null);
            }
          }
        } else {
          console.log('Aucun token trouvé');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  // Fonction de connexion
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Tentative de connexion avec:', email);
      const response = await api.post('/login.php', { email, password });
      console.log('Réponse de login.php:', response);

      if (response.status === 'success') {
        console.log('Connexion réussie, token:', response.token);
        
        // Stocker le token et les infos utilisateur
        await SecureStore.setItemAsync('userToken', response.token);
        await SecureStore.setItemAsync('userEmail', email);
        
        // Vérifier le stockage
        const storedToken = await SecureStore.getItemAsync('userToken');
        console.log('Token stocké vérifié:', storedToken);
        
        api.setAuthToken(response.token);
        setUser(response.user);
        return true;
      } else {
        console.log('Échec de connexion:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return false;
    }
  };

  // Fonction d'inscription
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('Tentative d\'inscription:', name, email);
      const response = await api.post('/register.php', { name, email, password });
      console.log('Réponse de register.php:', response);

      if (response.status === 'success') {
        console.log('Inscription réussie, token:', response.token);
        
        // Stocker le token et les infos utilisateur
        await SecureStore.setItemAsync('userToken', response.token);
        await SecureStore.setItemAsync('userEmail', email);
        
        // Vérifier le stockage
        const storedToken = await SecureStore.getItemAsync('userToken');
        console.log('Token stocké vérifié:', storedToken);
        
        api.setAuthToken(response.token);
        setUser(response.user);
        return true;
      } else {
        console.log('Échec d\'inscription:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return false;
    }
  };

  // Fonction de déconnexion
  const logout = async (): Promise<void> => {
    try {
      console.log('Tentative de déconnexion');
      await api.post('/logout.php');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      // Supprimer le token et réinitialiser l'état
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userEmail');
      api.setAuthToken(null);
      setUser(null);
      console.log('Déconnexion terminée');
    }
  };

  // Mettre à jour les informations utilisateur
  const updateUser = (userData: Partial<User>) => {
    console.log('Mise à jour utilisateur:', userData);
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  // Valeur du contexte
  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};