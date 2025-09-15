/**
 * Écran de profil utilisateur
 * Permet de voir et modifier les informations du profil
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { Appbar, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

const ProfileScreen: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Changer la photo de profil
  const changeProfilePicture = async () => {
    try {
      // Demander la permission d'accéder à la galerie
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire pour changer la photo de profil.');
        return;
      }

      // Ouvrir la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsUploading(true);
        const response = await api.uploadFile(result.assets[0].uri);

        if (response.status === 'success') {
          updateUser({ profile_picture: response.filename });
          Alert.alert('Succès', 'Photo de profil mise à jour avec succès.');
        } else {
          Alert.alert('Erreur', 'Échec du téléchargement de l\'image.');
        }
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Une erreur s\'est produite lors du changement de photo.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  // Prendre une photo
  const takePhoto = async () => {
    try {
      // Demander la permission d'accéder à la caméra
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire pour prendre une photo.');
        return;
      }

      // Ouvrir la caméra
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsUploading(true);
        const response = await api.uploadFile(result.assets[0].uri);

        if (response.status === 'success') {
          updateUser({ profile_picture: response.filename });
          Alert.alert('Succès', 'Photo de profil mise à jour avec succès.');
        } else {
          Alert.alert('Erreur', 'Échec du téléchargement de l\'image.');
        }
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Une erreur s\'est produite lors de la prise de photo.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  // Mettre à jour le profil
  const updateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis.');
      return;
    }

    setIsLoading(true);
    try {
      // Ici, vous devriez implémenter un endpoint API pour mettre à jour le profil
      // Pour l'instant, on met juste à jour localement
      updateUser({ name: name.trim() });
      Alert.alert('Succès', 'Profil mis à jour avec succès.');
    } catch (error: any) {
      Alert.alert('Erreur', 'Échec de la mise à jour du profil.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Mon Profil" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                user?.profile_picture
                  ? { uri: `http://192.168.1.7/server/uploads/${user.profile_picture}` }
                  : require('../../assets/images/default-avatar.png')
              }
              style={styles.avatar}
            />

            {isUploading ? (
              <ActivityIndicator style={styles.uploadIndicator} color="#6A11CB" />
            ) : (
              <View style={styles.avatarActions}>
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={changeProfilePicture}
                >
                  <Ionicons name="image" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {user?.status === 'online' ? 'En ligne' : 'Hors ligne'}
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <TextInput
            label="Nom complet"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: '#6A11CB' } }}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            theme={{ colors: { primary: '#6A11CB' } }}
            disabled={true}
          />

          <Button
            mode="contained"
            onPress={updateProfile}
            loading={isLoading}
            disabled={isLoading}
            style={styles.saveButton}
            contentStyle={styles.buttonContent}
          >
            Enregistrer les modifications
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  uploadIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 60,
  },
  avatarActions: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
  },
  avatarButton: {
    backgroundColor: '#6A11CB',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
  },
  saveButton: {
    marginTop: 10,
    backgroundColor: '#6A11CB',
  },
  buttonContent: {
    height: 50,
  },
});

export default ProfileScreen;