import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { colors, spacing, typography, borders } from '../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
};

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    // <<< DISABLE SIGNUP FOR DEBUG MODE >>>
    Alert.alert("Sign Up Disabled", "Account creation is currently disabled in this debug setup.");
    return;
    /*
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Sign Up Error', error.message);
    } else {
      Alert.alert('Sign Up Successful', 'Please check your email for verification.');
      navigation.navigate('Login'); // Navigate to Login after successful sign-up
    }
    setLoading(false);
    */
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Create Account</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 chars)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
        />
         <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
        />

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.buttonSpacing} />
        ) : (
          <TouchableOpacity style={[styles.button, styles.buttonSpacing]} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
          <Text style={styles.switchText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Using the same styles as LoginScreen for consistency
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md, // Use corrected spacing
  },
  title: {
    fontSize: typography.fontSizeXXL,
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: colors.border,
    borderWidth: borders.widthThin,
    borderRadius: borders.radiusMedium,
    marginBottom: spacing.md, // Use corrected spacing
    paddingHorizontal: spacing.md, // Use corrected spacing
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md, // Use corrected spacing
    paddingHorizontal: spacing.xl,
    borderRadius: borders.radiusMedium,
    alignItems: 'center',
    width: '100%',
  },
  buttonSpacing: {
    marginTop: spacing.md, // Use corrected spacing
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.fontSizeL,
    fontWeight: typography.fontWeightBold as 'bold',
  },
  switchText: {
    color: colors.primary,
    marginTop: spacing.lg, // Use corrected spacing
    fontSize: typography.fontSizeM,
  },
}); 