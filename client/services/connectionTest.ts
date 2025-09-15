import { api } from './api';

export const testConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing connection to server...');
    
    // Test 1: Ping simple sans token
    const response = await fetch('http://192.168.1.7/messenger-app/server/api/test.php', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Server response:', data);
      return true;
    } else {
      console.log('Server returned status:', response.status);
      return false;
    }
  } catch (error: any) {
    console.log('Connection test failed:', error.message);
    
    // Test 2: Essayer avec différentes URLs
    const testUrls = [
      'http://192.168.1.7/messenger-app/server/api/test.php',
      'http://192.168.1.7/api/test.php',
      'http://localhost/messenger-app/server/api/test.php',
    ];
    
    for (const testUrl of testUrls) {
      try {
        const testResponse = await fetch(testUrl, { method: 'GET' });
        if (testResponse.ok) {
          console.log('Successful connection to:', testUrl);
          return true;
        }
      } catch (e) {
        console.log('Failed to connect to:', testUrl);
      }
    }
    
    return false;
  }
};

export const testApiService = async (): Promise<void> => {
  try {
    console.log('Testing ApiService...');
    
    // Test sans token
    const testResult = await api.get('test.php');
    console.log('ApiService test result:', testResult);
    
  } catch (error: any) {
    console.error('ApiService test failed:', error.message);
  }
};