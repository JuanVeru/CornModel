import { Platform } from 'react-native';

/**
 * Configure API Endpoint dynamically based on platform and environment.
 * 
 * - iOS Emulator / Web: 'http://localhost:8000'
 * - Android Emulator: 'http://10.0.2.2:8000'
 * - Physical mobile device: Change this to your computer's local IP address (e.g., 'http://192.168.1.15:8000')
 */
const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    }
    return 'http://localhost:8000';
  }
  // Fallback production URL
  return 'http://localhost:8000';
};

export const API_URL = getApiUrl();
