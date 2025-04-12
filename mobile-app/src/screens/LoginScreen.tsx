import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
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
    <SafeAreaView style={styles.safeArea}>
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
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Sign Up Link */}
        <TouchableOpacity 
          style={styles.signUpLinkContainer}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.signUpLinkText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold as 'bold',
    lineHeight: typography.lineHeightXL,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightNormal as 'normal',
    lineHeight: typography.lineHeightM,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borders.radiusMedium,
    marginBottom: spacing.md,
    borderWidth: borders.widthThin,
    borderColor: colors.borderLight,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    borderTopWidth: borders.widthHairline,
    borderBottomWidth: borders.widthHairline,
    borderTopColor: colors.borderLight,
    borderBottomColor: colors.borderLight,
    minHeight: 44,
  },
  buttonText: {
    fontSize: typography.fontSizeM,
    color: colors.primary,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizeS,
    lineHeight: typography.lineHeightS,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  signUpLinkContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  signUpLinkText: {
    fontSize: typography.fontSizeS,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
}); 