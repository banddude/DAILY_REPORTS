import React, { useState, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- Marketing Card --- */}
        <View style={styles.marketingCard}>
          <Text style={styles.marketingHeadline}>Transform Your Field Videos Into Instant, Professional Reports</Text>
          <Text style={styles.marketingSubheadline}>AI-powered daily reporting for construction, inspection, and fieldwork.</Text>

          {/* Workflow Horizontal Row */}
          <View style={styles.marketingWorkflowRow}>
            <View style={styles.workflowStep}>
              <Ionicons name="videocam-outline" size={28} color={colors.textPrimary} style={styles.workflowIcon} />
              <Text style={styles.workflowLabel}>Record a video</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.borderLight} style={styles.workflowArrow} />
            <View style={styles.workflowStep}>
              <Ionicons name="cloud-upload-outline" size={28} color={colors.textPrimary} style={styles.workflowIcon} />
              <Text style={styles.workflowLabel}>Upload</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.borderLight} style={styles.workflowArrow} />
            <View style={styles.workflowStep}>
              <Ionicons name="document-text-outline" size={28} color={colors.textPrimary} style={styles.workflowIcon} />
              <Text style={styles.workflowLabel}>Get your report</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.marketingDivider} />

          {/* Features List */}
          <View style={styles.marketingFeatureList}>
            <View style={styles.marketingFeatureRow}>
              <Ionicons name="mic-outline" size={18} color={colors.textSecondary} style={styles.marketingFeatureIcon} />
              <Text style={styles.marketingFeatureText}>Accurate AI transcription</Text>
            </View>
            <View style={styles.marketingFeatureRow}>
              <Ionicons name="images-outline" size={18} color={colors.textSecondary} style={styles.marketingFeatureIcon} />
              <Text style={styles.marketingFeatureText}>Automatic image extraction</Text>
            </View>
            <View style={styles.marketingFeatureRow}>
              <Ionicons name="construct-outline" size={18} color={colors.textSecondary} style={styles.marketingFeatureIcon} />
              <Text style={styles.marketingFeatureText}>Customizable, structured reports</Text>
            </View>
            <View style={styles.marketingFeatureRow}>
              <Ionicons name="cloud-done-outline" size={18} color={colors.textSecondary} style={styles.marketingFeatureIcon} />
              <Text style={styles.marketingFeatureText}>Secure cloud storage</Text>
            </View>
          </View>

          <Text style={styles.marketingCTA}>Sign in to get started and experience the future of field reporting.</Text>
        </View>
        {/* ---------------------- */}

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
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          blurOnSubmit={false}
        />

        <TextInput
          ref={passwordInputRef}
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
          returnKeyType="go"
          onSubmitEditing={handleLoginAttempt}
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
    paddingBottom: spacing.xl * 1.5,
  },
  title: {
    fontSize: typography.fontSizeL,
    fontWeight: typography.fontWeightMedium as '500',
    lineHeight: typography.lineHeightL,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    borderTopWidth: borders.widthHairline,
    borderBottomWidth: borders.widthHairline,
    borderTopColor: colors.borderLight,
    borderBottomColor: colors.borderLight,
    minHeight: 44,
  },
  buttonText: {
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: typography.fontWeightNormal as 'normal',
    flex: 0,
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
  // --- Marketing Text Styles ---
  marketingCard: {
    backgroundColor: colors.surfaceAlt || '#f7f7f9',
    padding: spacing.lg,
    borderRadius: borders.radiusLarge,
    marginBottom: spacing.md,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  marketingHeadline: {
    fontSize: typography.fontSizeL,
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  marketingSubheadline: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  marketingWorkflowRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
    width: '100%',
  },
  workflowStep: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 80,
    flex: 1,
    maxWidth: 120,
  },
  workflowIcon: {
    marginBottom: spacing.xxs,
  },
  workflowLabel: {
    fontSize: typography.fontSizeS,
    color: colors.textPrimary,
    textAlign: 'center',
    minHeight: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowArrow: {
    marginHorizontal: spacing.xs,
    alignSelf: 'center',
  },
  marketingDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 1,
  },
  marketingFeatureList: {
    marginBottom: spacing.lg,
  },
  marketingFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  marketingFeatureIcon: {
    marginRight: spacing.sm,
  },
  marketingFeatureText: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    textAlign: 'left',
  },
  marketingCTA: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: typography.fontWeightBold as 'bold',
  },
  // --------------------------
}); 