import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router'; // <-- importer le router

const SplashScreen: React.FC = () => {
  const spinValue = new Animated.Value(0);
  const router = useRouter(); // <-- utiliser le router pour naviguer

  // Animation de rotation
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Redirection après 3 secondes (ou remplacer par vérification token)
    const timer = setTimeout(() => {
      // Exemple : navigation vers LoginScreen
      router.replace('/screens/LoginScreen'); 
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient colors={['#6A11CB', '#2575FC']} style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="chatbubbles" size={80} color="white" />
        </Animated.View>
        <Text style={styles.title}>Messenger App</Text>
        <Text style={styles.subtitle}>Connexion en cours...</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', marginTop: 20 },
  subtitle: { fontSize: 16, color: 'white', marginTop: 10, opacity: 0.8 },
});

export default SplashScreen;
