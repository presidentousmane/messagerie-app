/**
 * Écran de la liste des contacts
 * Affiche tous les utilisateurs disponibles pour discuter
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Appbar, Searchbar, Avatar, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

interface User {
  id: number;
  name: string;
  email: string;
  profile_picture: string | null;
  status: string;
  last_seen: string;
}

const ContactsScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user, logout } = useAuth();

  // Charger la liste des utilisateurs
  const loadUsers = async () => {
    try {
      const response = await api.get('/users.php');
      if (response.status === 'success') {
        setUsers(response.users);
        setFilteredUsers(response.users);
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
      console.error(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Filtrer les utilisateurs selon la recherche
  const filterUsers = (query: string) => {
    setSearchQuery(query);
    if (query) {
      const filtered = users.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  };

  // Rafraîchir la liste
  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  // Naviguer vers l'écran de chat
  const navigateToChat = (contact: User) => {
    router.push({
      pathname: '/screens/ChatScreen',
      params: { contact: JSON.stringify(contact) }
    });
  };

  // Naviguer vers le profil
  const navigateToProfile = () => {
    router.push('/screens/ProfileScreen');
  };

  // Déconnexion
  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', onPress: logout, style: 'destructive' }
      ]
    );
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigateToChat(item)}
    >
      <Avatar.Image
        size={50}
        source={
          item.profile_picture
            ? { uri: `http://192.168.1.7/server/uploads/${item.profile_picture}` }
            : require('../../assets/images/default-avatar.png')
        }
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: item.status === 'online' ? '#4CAF50' : '#9E9E9E' }
          ]}
        />
        <Text style={styles.statusText}>
          {item.status === 'online' ? 'En ligne' : 'Hors ligne'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6A11CB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Contacts" />
        <Appbar.Action icon="account" onPress={navigateToProfile} />
        <Appbar.Action icon="logout" onPress={handleLogout} />
      </Appbar.Header>

      <Searchbar
        placeholder="Rechercher un contact"
        onChangeText={filterUsers}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={item => item.id.toString()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#CCCCCC" />
            <Text style={styles.emptyText}>Aucun contact trouvé</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    margin: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
});

export default ContactsScreen;