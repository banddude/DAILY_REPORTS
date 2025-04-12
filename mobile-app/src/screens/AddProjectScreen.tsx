import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, borders } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { RootStackParamList } from '../navigation/AppNavigator';

// Define the type for the route params
type AddProjectScreenRouteProp = RouteProp<
  { AddProjectScreen: { customer?: string } },
  'AddProjectScreen'
>;

// Define the navigation prop type
type AddProjectScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddProject'
>;

const AddProjectScreen: React.FC = () => {
  const navigation = useNavigation<AddProjectScreenNavigationProp>();
  const route = useRoute<AddProjectScreenRouteProp>();
  const { userToken } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get customer from route parameters
  const customerName = route.params?.customer;

  const handleSave = useCallback(async () => {
    if (!customerName) {
      Alert.alert('Error', 'Customer context is missing.');
      navigation.goBack();
      return;
    }
    if (!projectName.trim()) {
      Alert.alert('Validation Error', 'Please enter a project name.');
      return;
    }
     if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again.');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // REMOVED fetch call

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 200));

      const newProjectName = projectName.trim();
      console.log(`AddProjectScreen: Saving project locally: ${newProjectName} for customer ${customerName}`);

      // Navigate back to HomeScreen, passing the new project name and the customer it belongs to
      navigation.getParent()?.setParams({ 
          newProjectForCustomer: customerName, // Indicate which customer this is for
          newProjectName: newProjectName       // Pass the new project name
      });
      navigation.goBack();

    } catch (err: any) {
      const errorMessage = `Failed to process project name: ${err?.message || 'Unknown error'}`;
      console.error("AddProjectScreen Error:", errorMessage, err);
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [customerName, projectName, userToken, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <Text style={styles.title}>Add New Project</Text>
        <Text style={styles.customerContext}>For Customer: {customerName || 'Unknown'}</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Project Name"
          placeholderTextColor={colors.textSecondary}
          value={projectName}
          onChangeText={setProjectName}
          editable={!isLoading}
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading || !customerName}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Save Project</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  customerContext: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radiusMedium,
    borderWidth: borders.widthThin,
    borderColor: colors.borderLight,
    fontSize: typography.fontSizeM,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borders.radiusMedium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: colors.textDisabled, // Using textDisabled as a fallback
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightBold as 'bold',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizeS,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});

export default AddProjectScreen; 