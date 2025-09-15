// /screens/ChatScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, KeyboardAvoidingView,
  Platform, Alert, TouchableOpacity, SafeAreaView, Linking,
  Image, Animated, Easing
} from 'react-native';
import { TextInput, ActivityIndicator, Menu } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, Entypo, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import EmojiSelector from 'react-native-emoji-selector';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  sender_picture: string | null;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text.replace(/&#(\d+);/g, (_, num) =>
    String.fromCharCode(parseInt(num))
  );
}

// Fonction de formatage de date simple
const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Aujourd'hui";
  } else if (diffDays === 1) {
    return 'Hier';
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
};

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const contact = JSON.parse(params.contact as string);
  const typingAnimation = useRef(new Animated.Value(0)).current;

  const startTypingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnimation, {
          toValue: 1,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(typingAnimation, {
          toValue: 0,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopTypingAnimation = () => {
    typingAnimation.stopAnimation();
  };

  useEffect(() => {
    if (isTyping) {
      startTypingAnimation();
    } else {
      stopTypingAnimation();
    }
  }, [isTyping]);

  const handleInputChange = (text: string) => {
    setNewMessage(text);

    if (typingTimeout) clearTimeout(typingTimeout);

    if (text.length > 0) {
      setIsTyping(true);

      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 2000);

      setTypingTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await api.get('/messages.php', {
        userA: user?.id,
        userB: contact.id
      });
      if (response.status === 'success') {
        setMessages(response.messages);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les messages');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      const response = await api.post('/messages.php', {
        receiver_id: contact.id,
        content: newMessage.trim()
      });
      if (response.status === 'success') {
        const tempMessage: Message = {
          id: response.message_id,
          sender_id: user!.id,
          receiver_id: contact.id,
          content: newMessage.trim(),
          message_type: 'text',
          is_read: false,
          created_at: new Date().toISOString(),
          sender_name: user!.name,
          sender_picture: user!.profile_picture
        };
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        setTimeout(loadMessages, 100);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setIsSending(false);
    }
  };

  const sendFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        const formData = new FormData();
        formData.append("receiver_id", contact.id);
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        } as any);

        const response = await api.post('/messages.php', formData);

        if (response.status === "success") {
          setMessages(prev => [...prev, {
            id: response.message_id,
            sender_id: user!.id,
            receiver_id: contact.id,
            content: file.uri,
            message_type: "file",
            is_read: false,
            created_at: new Date().toISOString(),
            sender_name: user!.name,
            sender_picture: user!.profile_picture
          }]);
        }
      }

    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer le fichier");
    }
  };

  const sendImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];

        const formData = new FormData();
        formData.append("receiver_id", contact.id);
        formData.append("image", {
          uri: image.uri,
          name: 'image.jpg',
          type: 'image/jpeg',
        } as any);

        const response = await api.post('/messages.php', formData);

        if (response.status === "success") {
          setMessages(prev => [...prev, {
            id: response.message_id,
            sender_id: user!.id,
            receiver_id: contact.id,
            content: image.uri,
            message_type: "image",
            is_read: false,
            created_at: new Date().toISOString(),
            sender_name: user!.name,
            sender_picture: user!.profile_picture
          }]);
        }
      }
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer l'image");
    }
  };

  const deleteMessage = async (messageId: number) => {
    try {
      const response = await api.post('/delete_message.php', {
        message_id: messageId,
        user_id: user?.id
      });
      if (response.status === 'success') {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        Alert.alert('Erreur', response.message || 'Impossible de supprimer le message');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer le message');
    } finally {
      setMenuVisible(false);
      setSelectedMessage(null);
    }
  };

  const openMenu = (message: Message, anchor: any) => {
    if (message.sender_id === user?.id) {
      setSelectedMessage(message);
      setMenuAnchor(anchor);
      setMenuVisible(true);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [contact.id]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const shouldShowDateHeader = (index: number) => {
    if (index === 0) return true;

    const currentDate = new Date(messages[index].created_at).toDateString();
    const previousDate = new Date(messages[index - 1].created_at).toDateString();

    return currentDate !== previousDate;
  };

  const renderDateHeader = (date: string) => {
  const formattedDate = formatDate(date);

  return (
    <View style={styles.dateHeaderContainer}>
      <Text style={styles.dateHeaderText}>
        {formattedDate === "Aujourd'hui" && { backgroundColor: '#588ebbff' } || formattedDate === "Hier"  && { backgroundColor: '#313874ff' }
          ? formattedDate
          : formattedDate}
      </Text>
    </View>
  );
};

  // Modifier la fonction renderMessage
const renderMessage = ({ item, index }: { item: Message; index: number }) => {
  const isOwnMessage = item.sender_id === user?.id;
  let content;

  if (item.message_type === 'file') {
    content = (
      <TouchableOpacity
        onPress={() => Linking.openURL(item.content)}
        style={styles.fileContainer}
      >
        <MaterialIcons name="insert-drive-file" size={24} color="#12148cff" />
        <Text style={styles.fileText} numberOfLines={1}>
          📎 Fichier
        </Text>
      </TouchableOpacity>
    );
  } else if (item.message_type === 'image') {
    content = (
      <TouchableOpacity
        onPress={() => {
          Alert.alert('Fonctionnalité', 'Visionneuse d\'image à implémenter');
        }}
      >
        <Image
          source={{ uri: item.content }}
          style={styles.imageMessage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  } else {
    content = (
      <Text style={[styles.messageText, isOwnMessage ? styles.ownText : styles.otherText]}>
        {decodeHtmlEntities(item.content)}
      </Text>
    );
  }

  return (
    <View>
      {shouldShowDateHeader(index) && renderDateHeader(item.created_at)}

      <View style={[styles.messageRow, isOwnMessage ? styles.ownRow : styles.otherRow]}>
        {!isOwnMessage && (
          <Image
            source={
              item.sender_picture
                ? { uri: item.sender_picture }
                : require('../../assets/images/default-avatar.png')
            }
            style={styles.messageAvatar}
          />
        )}

        <View style={[styles.bubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          {!isOwnMessage && <Text style={styles.senderName}>{item.sender_name}</Text>}
          {content}
          <Text style={isOwnMessage ? styles.ownTime : styles.otherTime}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
};


  const renderMenu = () => (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={menuAnchor}
    >
      <Menu.Item
        onPress={() => selectedMessage && deleteMessage(selectedMessage.id)}
        title="Supprimer"
        leadingIcon="delete"
      />
      <Menu.Item
        onPress={() => setMenuVisible(false)}
        title="Annuler"
        leadingIcon="close"
      />
    </Menu>
  );

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={[styles.messageContainer, styles.otherContainer]}>
        <View style={[styles.messageContent, styles.otherContent]}>
          <View style={[styles.bubble, styles.otherBubble, styles.typingBubble]}>
            <View style={styles.typingContainer}>
              <Animated.View
                style={[
                  styles.typingDot,
                  {
                    transform: [
                      {
                        translateY: typingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -5]
                        })
                      }
                    ]
                  }
                ]}
              />
              <Animated.View
                style={[
                  styles.typingDot,
                  {
                    transform: [
                      {
                        translateY: typingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -5]
                        })
                      }
                    ]
                  }
                ]}
              />
              <Animated.View
                style={[
                  styles.typingDot,
                  {
                    transform: [
                      {
                        translateY: typingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -5]
                        })
                      }
                    ]
                  }
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2116beff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.contactInfo}>
            <View style={styles.contactAvatar}>
              {contact.profile_picture ? (
                <Image source={{ uri: contact.profile_picture }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={24} color="#fff" />
              )}
            </View>
            <View>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactStatus}>
                {contact.status === 'online' ? 'En ligne' : 'Hors ligne'}
              </Text>
            </View>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.messagesBackground}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderTypingIndicator}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
              }
            }}
          />
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={() => {
              Alert.alert(
                "Envoyer un fichier",
                "Choisissez une option",
                [
                  {
                    text: "Fichier",
                    onPress: sendFile
                  },
                  {
                    text: "Image",
                    onPress: sendImage
                  },
                  {
                    text: "Annuler",
                    style: "cancel"
                  }
                ]
              );
            }}
          >
            <Entypo name="attachment" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.emojiButton} onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
            <Ionicons name="happy-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TextInput
            value={newMessage}
            onChangeText={handleInputChange}
            placeholder="Tapez un message"
            style={styles.textInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isSending}>
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {showEmojiPicker && (
          <View style={styles.emojiSelector}>
            <EmojiSelector
              onEmojiSelected={(emoji: string) => setNewMessage((prev) => prev + emoji)}
              showSearchBar={false}
              columns={8}
            />
          </View>
        )}

        {renderMenu()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Correction des styles - syntaxe valide pour React Native
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#e5ddd5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4864b3ff',
    paddingTop: Platform.OS === 'android' ? 25 : 70, // Ajuste pour Android/iOS
  },
  backButton: {
    padding: 4,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  contactName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactStatus: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  messagesBackground: {
    flex: 1,
    backgroundColor: '#e5ddd5',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  ownRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 6,
    backgroundColor: '#ccc', // Couleur par défaut si aucune image n'est disponible
  },
  bubble: {
    maxWidth: '75%', // Ajuste la largeur des bulles
    padding: 10,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#DCF8C6', // Vert clair pour les messages envoyés
    alignSelf: 'flex-end', // Aligne à droite
    borderBottomRightRadius: 0, // Coin inférieur droit carré
    marginLeft: 40, // Laisse de la place à gauche
  },
  otherBubble: {
    backgroundColor: '#FFFFFF', // Blanc pour les messages reçus
    alignSelf: 'flex-start', // Aligne à gauche
    borderBottomLeftRadius: 0, // Coin inférieur gauche carré
    marginRight: 40, // Laisse de la place à droite
  },
  senderName: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: '#000', // Texte noir pour les messages envoyés
  },
  otherText: {
    color: '#000', // Texte noir pour les messages reçus
  },
  ownTime: {
    fontSize: 10,
    color: '#66757F', // Gris pour l'heure des messages envoyés
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  otherTime: {
    fontSize: 10,
    color: '#66757F', // Gris pour l'heure des messages reçus
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  typingBubble: {
    padding: 12,
    paddingHorizontal: 16,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
    marginHorizontal: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 4,
  },
  emojiButton: {
    padding: 8,
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    maxHeight: 100,
    fontSize: 16,
    paddingTop: 10,
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileText: {
    marginLeft: 8,
    color: '#128C7E',
    fontWeight: '500',
  },
  imageMessage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    color: 'rgba(0,0,0,0.6)',
    fontSize: 12,
  },
  emojiSelector: {
    height: 250,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    flex: 1,
    flexDirection: 'column',
  },
  otherContent: {
    alignItems: 'flex-start',
  },
});

export default ChatScreen;