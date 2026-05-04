import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UseAuthReturn {
  isGuest: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  setIsGuest: (value: boolean) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [isGuest, setIsGuestState] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load auth state on mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const guestMode = await AsyncStorage.getItem('guestMode');
        const token = await AsyncStorage.getItem('token');
        
        setIsGuestState(guestMode === 'true');
        setIsAuthenticated(!!token && guestMode !== 'true');
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuthState();
  }, []);

  // Set guest mode and persist to storage
  const setIsGuest = async (value: boolean) => {
    try {
      if (value) {
        // Clear any auth tokens when entering guest mode
        await AsyncStorage.setItem('guestMode', 'true');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setIsGuestState(true);
        setIsAuthenticated(false);
      } else {
        // Exit guest mode
        await AsyncStorage.removeItem('guestMode');
        setIsGuestState(false);
      }
    } catch (error) {
      console.error('Error setting guest mode:', error);
    }
  };

  return {
    isGuest,
    isAuthenticated,
    loading,
    setIsGuest,
  };
}
