import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme, { colors } from '../theme/theme';
import { supabase } from '../utils/supabaseClient'; // Import Supabase client
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Linking from 'expo-linking'; // Import Linking

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePasswordResetRequest = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Dynamically generate the redirect URL based on the current environment
    const redirectUrl = Linking.createURL(''); // Create base URL for current environment
    console.log(`ResetPasswordScreen: Using redirect URL for Supabase: ${redirectUrl}`);

    try {
      console.log(`ResetPasswordScreen: Requesting password reset for ${email}`);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // Use the dynamically generated redirect URL
        redirectTo: redirectUrl,
      });

      if (resetError) {
        throw resetError;
      }

      console.log(`ResetPasswordScreen: Password reset email sent successfully to ${email}`);
      setSuccessMessage('If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).');
      setEmail(''); // Clear email field on success

    } catch (err: any) {
      console.error('ResetPasswordScreen Error:', err.message);
      setError(err.message || 'An error occurred. Please try again.');
      // Don't show generic error if Supabase specifically says "User not found",
      // as that might leak user existence info. Keep the success message.
      if (!err.message?.toLowerCase().includes('user not found')) {
           setSuccessMessage(null); // Clear success message if it wasn't a "user not found" type error
      } else {
           // Still show success message even if user not found, for security
           setSuccessMessage('If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).');
           setError(null); // Clear specific error
      }

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.keyboardAwareScrollViewContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={100}
      >
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your account email address and we'll send you a link to reset your password.</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="go"
          onSubmitEditing={handlePasswordResetRequest}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.disabledButton]}
          onPress={handlePasswordResetRequest}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// --- Add Styles --- //
// Borrowing heavily from Login/SignUp screens theme structure if available,
// otherwise define basic styles here. Using LoginScreen theme for now.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAwareScrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40, // Now Platform is defined
      left: 20,
      zIndex: 1,
      padding: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.borderLight,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: colors.background, // Changed from primaryForeground
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    marginHorizontal: 10,
  },
   successText: {
    color: colors.success, // Assuming success color exists in theme
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    marginHorizontal: 10,
  },
}); 