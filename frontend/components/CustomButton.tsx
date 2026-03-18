import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function CustomButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: CustomButtonProps) {
  const resolvedVariant: ButtonVariant = disabled ? 'secondary' : variant;

  if (resolvedVariant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[style]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryFaded]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.base, styles.primaryShadow]}
        >
          <Text style={[styles.text, { color: Colors.textSecondary }]}>
            {title}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (resolvedVariant === 'text') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[styles.textButton, style]}
      >
        <Text style={styles.textButtonLabel}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        resolvedVariant === 'outline' && styles.outline,
        resolvedVariant === 'secondary' && styles.secondary,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          resolvedVariant === 'outline' && { color: Colors.text },
          resolvedVariant === 'secondary' && { color: Colors.gray },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  text: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  primaryShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  outline: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondary: {
    backgroundColor: Colors.lightGray,
  },
  textButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
  },
  textButtonLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.gray,
    textAlign: 'center',
  },
});
