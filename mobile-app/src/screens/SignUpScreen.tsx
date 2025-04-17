import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import theme, { colors } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
};

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, signInWithGoogle, loading: authLoading } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignUp = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }

    setLocalLoading(true);
    try {
      console.log('SignUpScreen: Attempting email sign up...');
      await signUp(email, password);
      console.log('SignUpScreen: Email sign up initiated.');
      Alert.alert(
        "Check Your Email",
        "Sign up initiated! Please check your email for a confirmation link to complete registration.",
        [{ text: "OK", onPress: () => navigation.navigate('Login') }]
      );
      setEmail('');
      setPassword('');
      setConfirmPassword('');

    } catch (err: any) {
      console.error("SignUpScreen Email Error:", err.message);
      setError(err.message || 'An error occurred during sign up.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    try {
      console.log('SignUpScreen: Attempting Google Sign Up...');
      await signInWithGoogle();
      console.log('SignUpScreen: Google Sign Up initiated.');
    } catch (err: any) {
      console.error('SignUpScreen Google Error:', err.message);
      setError(err.message || 'Could not initiate Google Sign Up.');
    }
  };

  const isProcessing = authLoading || localLoading;

  return (
    <SafeAreaView style={theme.screens.signUpScreen.safeArea}>
      <KeyboardAwareScrollView
        contentContainerStyle={theme.screens.signUpScreen.keyboardAwareScrollViewContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={180}
      >
        <View style={theme.screens.signUpScreen.marketingCard}>
          <Text style={theme.screens.signUpScreen.marketingHeadline}>Create Your Account</Text>
          <Text style={theme.screens.signUpScreen.marketingSubheadline}>Sign up to start generating instant, professional reports from your field videos.</Text>
          <View style={theme.screens.signUpScreen.marketingWorkflowRow}>
            <View style={theme.screens.signUpScreen.workflowStep}>
              <Ionicons name="person-add-outline" size={28} color={colors.textPrimary} style={theme.screens.signUpScreen.workflowIcon} />
              <Text style={theme.screens.signUpScreen.workflowLabel}>Sign up</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.borderLight} style={theme.screens.signUpScreen.workflowArrow} />
            <View style={theme.screens.signUpScreen.workflowStep}>
              <Ionicons name="videocam-outline" size={28} color={colors.textPrimary} style={theme.screens.signUpScreen.workflowIcon} />
              <Text style={theme.screens.signUpScreen.workflowLabel}>Upload a video</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.borderLight} style={theme.screens.signUpScreen.workflowArrow} />
            <View style={theme.screens.signUpScreen.workflowStep}>
              <Ionicons name="document-text-outline" size={28} color={colors.textPrimary} style={theme.screens.signUpScreen.workflowIcon} />
              <Text style={theme.screens.signUpScreen.workflowLabel}>Get your report</Text>
            </View>
          </View>
        </View>

        <Text style={theme.screens.signUpScreen.title}>Sign Up</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          style={theme.screens.signUpScreen.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.textSecondary}
          editable={!isProcessing}
        />
        <TextInput
          style={theme.screens.signUpScreen.input}
          placeholder="Password (min 6 chars)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
          editable={!isProcessing}
        />
         <TextInput
          style={theme.screens.signUpScreen.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
          editable={!isProcessing}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[theme.screens.signUpScreen.button, isProcessing && styles.disabledButton]}
            onPress={handleEmailSignUp}
            disabled={isProcessing}
          >
            {localLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={theme.screens.signUpScreen.buttonText}>Sign Up with Email</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, isProcessing && styles.disabledButton]}
            onPress={handleGoogleSignUp}
            disabled={isProcessing}
          >
            {authLoading && !localLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.textPrimary} style={styles.googleIcon}/>
                <Text style={styles.googleButtonText}>Sign Up with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={theme.screens.signUpScreen.loginLinkContainer}
            onPress={() => navigation.navigate('Login')}
            disabled={isProcessing}
          >
            <Text style={theme.screens.signUpScreen.loginLinkText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    width: '100%',
    marginTop: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    marginHorizontal: 10,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 15,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: colors.textPrimary,
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
    marginHorizontal: 20,
  },
}); 