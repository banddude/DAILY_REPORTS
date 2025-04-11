import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginAttempt = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
        console.log(`LoginScreen: Attempting login for ${email}`);
        await login(email, password);
        console.log(`LoginScreen: Context login function succeeded for ${email}`);
        
    } catch (err: any) {
      console.error('LoginScreen Error:', err.message);
      setError(err.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={colors.textSecondary}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={colors.textSecondary}
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLoginAttempt}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold as 'bold',
    lineHeight: typography.lineHeightXL,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightNormal as 'normal',
    lineHeight: typography.lineHeightM,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radiusMedium,
    marginBottom: spacing.md,
    borderWidth: borders.widthThin,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borders.radiusMedium,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: {
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightMedium as '500',
    lineHeight: typography.lineHeightM,
    color: colors.textOnPrimary,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizeS,
    lineHeight: typography.lineHeightS,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
}); 