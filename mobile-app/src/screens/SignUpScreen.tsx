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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import theme, { colors } from '../theme/theme';
import { API_BASE_URL } from '../config';
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
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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

      if (response.ok) {
        const data = await response.json();
        if (response.status === 201) {
          console.log('Signup successful, attempting auto-login...');
          try {
            await login(email, password);
            console.log('Auto-login successful after signup.');
          } catch (loginError: any) {
            console.error("Auto-login Error after signup:", loginError);
            Alert.alert(
              'Account Created, Login Failed',
              `Your account was created, but auto-login failed: ${loginError.message}. Please try logging in manually.`,
              [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
          }
        } else {
          console.warn('Unexpected success status from signup:', response.status);
          Alert.alert('Sign Up Info', data.message || 'Account created, but received unexpected status.');
          navigation.navigate('Login'); 
        }
      } else {
        let errorMessage = 'An unknown error occurred during sign up.';
        let errorStatus = response.status;
        
        try {
          const errorText = await response.text();
          
          try {
            const errorData = JSON.parse(errorText); 
            errorMessage = errorData.message || errorText || errorMessage;
          } catch (jsonParseError) {
            errorMessage = errorText || errorMessage;
          }
        } catch (readError) {
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
      
        <TextInput
          style={theme.screens.signUpScreen.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={theme.screens.signUpScreen.input}
          placeholder="Password (min 6 chars)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
        />
         <TextInput
          style={theme.screens.signUpScreen.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
        />

        <TouchableOpacity
          style={theme.screens.signUpScreen.button}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={theme.screens.signUpScreen.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={theme.screens.signUpScreen.loginLinkContainer}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
        >
          <Text style={theme.screens.signUpScreen.loginLinkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
} 