import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config'; // Import API base URL
import { useAuth } from '../context/AuthContext'; // Import useAuth
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
};

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // Get login function from context

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "The passwords entered do not match.");
      return;
    }

    if (password.length < 6) {
        Alert.alert("Password Too Short", "Password must be at least 6 characters long.");
        return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Check if the response status indicates success before parsing JSON
      if (response.ok) { // Status codes 200-299
        const data = await response.json();
        if (response.status === 201) { // Specifically check for 201 Created
          console.log('Signup successful, attempting auto-login...');
          // --- Auto-login after successful signup ---
          try {
            await login(email, password); // Use the context login function
            console.log('Auto-login successful after signup.');
            // Navigation should be handled by the AuthProvider upon successful login
          } catch (loginError: any) {
            console.error("Auto-login Error after signup:", loginError);
            Alert.alert(
              'Account Created, Login Failed',
              `Your account was created, but auto-login failed: ${loginError.message}. Please try logging in manually.`,
              [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
          }
          // --- End Auto-login ---
        } else {
          // Handle unexpected success statuses if necessary
          console.warn('Unexpected success status from signup:', response.status);
          Alert.alert('Sign Up Info', data.message || 'Account created, but received unexpected status.');
          navigation.navigate('Login'); 
        }
      } else {
        // Handle error responses
        let errorMessage = 'An unknown error occurred during sign up.';
        let errorStatus = response.status; // Store status for clarity
        
        try {
          // Read the response body as text first
          const errorText = await response.text();
          
          try {
            // Attempt to parse the text as JSON
            const errorData = JSON.parse(errorText); 
            errorMessage = errorData.message || errorText || errorMessage; // Use parsed message, fallback to text, then generic
          } catch (jsonParseError) {
            // If JSON parsing fails, use the raw text as the error message
            errorMessage = errorText || errorMessage; // Use text if available, else generic
          }
        } catch (readError) {
            // If even reading text fails, log it and use the generic message
            console.error("Failed to read error response body", readError);
        }

        if (errorStatus === 409) {
          Alert.alert('Sign Up Error', errorMessage || 'This email address is already registered.');
        } else {
          Alert.alert('Sign Up Error', `Error ${errorStatus}: ${errorMessage}`);
        }
      }
    } catch (error: any) {
      console.error("Signup Fetch/Network Error:", error);
      Alert.alert('Sign Up Error', error.message || 'Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- Marketing Card --- */}
        <View style={styles.marketingCard}>
          <Text style={styles.marketingHeadline}>Create Your Account</Text>
          <Text style={styles.marketingSubheadline}>Sign up to start generating instant, professional reports from your field videos.</Text>
          <View style={styles.marketingWorkflowRow}>
            <View style={styles.workflowStep}>
              <Ionicons name="person-add-outline" size={28} color={colors.textPrimary} style={styles.workflowIcon} />
              <Text style={styles.workflowLabel}>Sign up</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.borderLight} style={styles.workflowArrow} />
            <View style={styles.workflowStep}>
              <Ionicons name="videocam-outline" size={28} color={colors.textPrimary} style={styles.workflowIcon} />
              <Text style={styles.workflowLabel}>Upload a video</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.borderLight} style={styles.workflowArrow} />
            <View style={styles.workflowStep}>
              <Ionicons name="document-text-outline" size={28} color={colors.textPrimary} style={styles.workflowIcon} />
              <Text style={styles.workflowLabel}>Get your report</Text>
            </View>
          </View>
        </View>
        {/* ---------------------- */}

        <Text style={styles.title}>Sign Up</Text>
      
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

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginLinkContainer}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
        >
          <Text style={styles.loginLinkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold as 'bold',
    lineHeight: typography.lineHeightXL,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  input: {
    borderColor: colors.borderLight,
    borderWidth: borders.widthThin,
    borderRadius: borders.radiusMedium,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
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
  loginLinkContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  loginLinkText: {
    color: colors.primary,
    fontSize: typography.fontSizeS,
    textDecorationLine: 'underline',
  },
}); 