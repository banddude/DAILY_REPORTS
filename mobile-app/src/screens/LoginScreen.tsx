import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme, { colors } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { signInWithPassword, signInWithGoogle, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordInputRef = useRef<TextInput>(null);

  const handleLoginAttempt = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
        console.log(`LoginScreen: Attempting password login for ${email}`);
        await signInWithPassword(email, password);
        console.log(`LoginScreen: Context signInWithPassword succeeded for ${email}`);
    } catch (err: any) {
      console.error('LoginScreen Password Error:', err.message);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      console.log('LoginScreen: Attempting Google Sign In...');
      await signInWithGoogle();
      console.log('LoginScreen: Google Sign In initiated.');
    } catch (err: any) {
      console.error('LoginScreen Google Error:', err.message);
      setError(err.message || 'Could not initiate Google Sign In.');
    }
  };

  const isProcessing = authLoading || isLoading;

  return (
    <SafeAreaView style={theme.screens.loginScreen.safeArea}>
      <KeyboardAwareScrollView
        contentContainerStyle={theme.screens.loginScreen.keyboardAwareScrollViewContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={150}
      >
        {/* --- Marketing Card --- */}
        <View style={theme.screens.loginScreen.marketingCard}>
          <Text style={theme.screens.loginScreen.marketingHeadline}>Transform Your Field Videos Into Instant, Professional Reports</Text>
          <Text style={theme.screens.loginScreen.marketingSubheadline}>AI-powered daily reporting for construction, inspection, and fieldwork.</Text>

          {/* Workflow Horizontal Row */}
          <View style={theme.screens.loginScreen.marketingWorkflowRow}>
            <View style={theme.screens.loginScreen.workflowStep}>
              <Ionicons name="videocam-outline" size={28} color={colors.textPrimary} style={theme.screens.loginScreen.workflowIcon} />
              <Text style={theme.screens.loginScreen.workflowLabel}>Record a video</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.borderLight} style={theme.screens.loginScreen.workflowArrow} />
            <View style={theme.screens.loginScreen.workflowStep}>
              <Ionicons name="cloud-upload-outline" size={28} color={colors.textPrimary} style={theme.screens.loginScreen.workflowIcon} />
              <Text style={theme.screens.loginScreen.workflowLabel}>Upload</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.borderLight} style={theme.screens.loginScreen.workflowArrow} />
            <View style={theme.screens.loginScreen.workflowStep}>
              <Ionicons name="document-text-outline" size={28} color={colors.textPrimary} style={theme.screens.loginScreen.workflowIcon} />
              <Text style={theme.screens.loginScreen.workflowLabel}>Get your report</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={theme.screens.loginScreen.marketingDivider} />

          {/* Features List */}
          <View style={theme.screens.loginScreen.marketingFeatureList}>
            <View style={theme.screens.loginScreen.marketingFeatureRow}>
              <Ionicons name="mic-outline" size={18} color={colors.textSecondary} style={theme.screens.loginScreen.marketingFeatureIcon} />
              <Text style={theme.screens.loginScreen.marketingFeatureText}>Accurate AI transcription</Text>
            </View>
            <View style={theme.screens.loginScreen.marketingFeatureRow}>
              <Ionicons name="images-outline" size={18} color={colors.textSecondary} style={theme.screens.loginScreen.marketingFeatureIcon} />
              <Text style={theme.screens.loginScreen.marketingFeatureText}>Automatic image extraction</Text>
            </View>
            <View style={theme.screens.loginScreen.marketingFeatureRow}>
              <Ionicons name="construct-outline" size={18} color={colors.textSecondary} style={theme.screens.loginScreen.marketingFeatureIcon} />
              <Text style={theme.screens.loginScreen.marketingFeatureText}>Customizable, structured reports</Text>
            </View>
            <View style={theme.screens.loginScreen.marketingFeatureRow}>
              <Ionicons name="cloud-done-outline" size={18} color={colors.textSecondary} style={theme.screens.loginScreen.marketingFeatureIcon} />
              <Text style={theme.screens.loginScreen.marketingFeatureText}>Secure cloud storage</Text>
            </View>
          </View>

          <Text style={theme.screens.loginScreen.marketingCTA}>Sign in to get started and experience the future of field reporting.</Text>
        </View>
        {/* ---------------------- */}

        <Text style={theme.screens.loginScreen.title}>Login</Text>
        
        {error && <Text style={theme.screens.loginScreen.errorText}>{error}</Text>}

        <TextInput
          style={theme.screens.loginScreen.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          blurOnSubmit={false}
          editable={!isProcessing}
        />

        <TextInput
          ref={passwordInputRef}
          style={theme.screens.loginScreen.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
          returnKeyType="go"
          onSubmitEditing={handleLoginAttempt}
          editable={!isProcessing}
        />

        {/* Button Container */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[theme.screens.loginScreen.button, isProcessing && styles.disabledButton]}
            onPress={handleLoginAttempt}
            disabled={isProcessing}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={theme.screens.loginScreen.buttonText}>Login with Email</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, isProcessing && styles.disabledButton]}
            onPress={handleGoogleSignIn}
            disabled={isProcessing}
          >
            {authLoading && !isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.textPrimary} style={styles.googleIcon}/>
                <Text style={styles.googleButtonText}>Sign In with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={theme.screens.loginScreen.signUpLinkContainer}
            onPress={() => navigation.navigate('SignUp')}
            disabled={isProcessing}
          >
            <Text style={theme.screens.loginScreen.signUpLinkText}>Don't have an account? Sign Up</Text>
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
}); 