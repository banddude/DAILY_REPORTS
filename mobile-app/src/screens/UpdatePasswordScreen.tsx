import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient'; 
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Note: This screen is typically rendered directly by the AppNavigator when
// the AuthContext detects the PASSWORD_RECOVERY state. It doesn't need navigation props itself.
export default function UpdatePasswordScreen() {
  // We don't use useNavigation here as it's rendered conditionally at the root
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if user is already in a password recovery state when screen mounts
  // (This handles the case where the user lands directly on the page)
  // Supabase client might automatically handle the session fragment from the URL
  useEffect(() => {
    // You might not need this effect if the AppNavigator logic is robust,
    // but it can be a fallback.
    // Supabase listener in AuthContext should handle the session state.
  }, []);

  const handleUpdatePassword = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!password) {
        setError("Please enter a new password.");
        return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      if (!session) {
        console.error("UpdatePasswordScreen Error: No active session found when attempting update. Cannot update password.");
        throw new Error("Auth session missing!");
      }

      console.log("UpdatePasswordScreen: Attempting to update password with session:", session);
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      console.log("UpdatePasswordScreen: Password updated successfully.");
      // Alert the user and they will be navigated away automatically
      // by the AuthContext state change (isPasswordRecovery will become false)
      Alert.alert(
        "Password Updated",
        "Your password has been successfully updated. You can now log in."
      );
      // No explicit navigation needed here, AuthContext state change handles it.

    } catch (err: any) {
      console.error('UpdatePasswordScreen Error:', err.message);
      setError(err.message || 'Failed to update password. Please try again.');
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
        extraScrollHeight={150} // Adjusted scroll height
      >

        <Text style={styles.title}>Update Password</Text>
        <Text style={styles.subtitle}>Enter and confirm your new password.</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {/* Removed success message display as Alert is used */}

        <TextInput
          style={styles.input}
          placeholder="New Password (min 6 chars)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={colors.textSecondary}
          editable={!isLoading}
        />
         <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="go"
          onSubmitEditing={handleUpdatePassword}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.disabledButton]}
          onPress={handleUpdatePassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>

      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// --- Styles (Copied and adapted from ResetPasswordScreen) --- //
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
    color: colors.background, // Assuming primary button background contrasts with main background
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
}); 