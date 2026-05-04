import { useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppFonts } from '@/hooks/useFonts';
import { ToastProvider } from '@/components/ToastProvider';

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#FFFBF0' }} />;
  }

  return (
    <ToastProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="account-type" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="restaurant-signup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(merchant-tabs)" />
        <Stack.Screen
          name="story"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modify-booking"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="booking-confirmation"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="restaurant-detail"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="notifications"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="favorites"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="privacy-security"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="help-support"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="verify-email"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="add-menu-item"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="restaurant-listing"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="manage-stories"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="merchant-settings"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="business-addresses"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="language"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="about"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Oops!' }} />
      </Stack>
    </ToastProvider>
  );
}
