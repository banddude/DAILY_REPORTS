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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme, { colors } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for password input
  const passwordInputRef = useRef<TextInput>(null);

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
        />

        {/* Button and Sign Up link in a View for spacing */}
        <View>
          <TouchableOpacity 
            style={theme.screens.loginScreen.button}
            onPress={handleLoginAttempt}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={theme.screens.loginScreen.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={theme.screens.loginScreen.signUpLinkContainer}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={theme.screens.loginScreen.signUpLinkText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
} 