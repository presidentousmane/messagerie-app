// _layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext'; // chemin correct
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <Stack>
            <Stack.Screen name="screens/SplashScreen" options={{ headerShown: false }} />
            <Stack.Screen name="screens/LoginScreen" options={{ headerShown: false }} />
            <Stack.Screen name="screens/RegisterScreen" options={{ headerShown: false }} />
            <Stack.Screen name="screens/ContactsScreen" options={{ headerShown: false }} />
            <Stack.Screen name="screens/ChatScreen" options={{ headerShown: false }} />
            <Stack.Screen name="screens/ProfileScreen" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
