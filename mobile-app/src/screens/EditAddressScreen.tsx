import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Button,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditAddressScreenProps } from '../navigation/AppNavigator'; // Adjust import

// Define structure for address editing
interface AddressData {
  street?: string;
  unit?: string;
  city?: string;
  state?: string;
  zip?: string;
}

// --- Styles (Similar to other editors, maybe adjust padding/margins) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardAvoidingView: { flex: 1 },
  scrollViewContent: { padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  fieldContainer: { marginBottom: spacing.md }, // Space between fields
  label: { fontSize: typography.fontSizeS, fontWeight: typography.fontWeightMedium as '500', color: colors.textSecondary, marginBottom: spacing.xs, textTransform: 'uppercase' },
  textInput: { backgroundColor: colors.surface, borderRadius: borders.radiusMedium, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.fontSizeM, color: colors.textPrimary, borderWidth: borders.widthThin, borderColor: colors.borderLight },
});

function EditAddressScreen(): React.ReactElement {
  const navigation = useNavigation<EditAddressScreenProps['navigation']>();
  const { userToken } = useAuth();
  const [initialAddress, setInitialAddress] = useState<AddressData>({});
  const [currentAddress, setCurrentAddress] = useState<AddressData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current address
  const fetchCurrentAddress = useCallback(async () => {
    if (!userToken) { /* ... handle no token ... */ return; }
    setIsLoading(true); setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, { 
          method: 'GET',
          headers: { 
              'Authorization': `Bearer ${userToken}`,
              'Accept': 'application/json' 
          }
      });
      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          if (response.status === 404) {
              throw new Error('Profile not found. Cannot edit address.');
          }
          throw new Error(errData.error || 'Fetch failed');
       }
      const data = await response.json();
      // --- FIX: Map snake_case fields from server to local camelCase state --- 
      const address: AddressData = {
          street: data?.company_street,
          unit: data?.company_unit,
          city: data?.company_city,
          state: data?.company_state,
          zip: data?.company_zip,
      };
      setInitialAddress(address);
      setCurrentAddress(address);
    } catch (err: any) { setError(`Load failed: ${err.message}`); }
    finally { setIsLoading(false); }
  }, [userToken]);

  useEffect(() => { fetchCurrentAddress(); }, [fetchCurrentAddress]);

  // Handle input changes for specific address fields
  const handleInputChange = useCallback((field: keyof AddressData, value: string) => {
      setCurrentAddress(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save updated address
  const handleSave = useCallback(async () => {
    const hasChanged = JSON.stringify(currentAddress) !== JSON.stringify(initialAddress);
    if (!userToken || !hasChanged) {
        navigation.goBack();
        return;
    }
    setIsSaving(true); setError(null);
    try {
      // --- FIX: Construct payload mapping local camelCase back to snake_case --- 
      // --- FIX: Allow null in payload type --- 
      const payload: { [key: string]: string | null | undefined } = {
          company_street: currentAddress.street?.trim(),
          company_unit: currentAddress.unit?.trim(),
          company_city: currentAddress.city?.trim(),
          company_state: currentAddress.state?.trim().toUpperCase(), // Ensure state is uppercase
          company_zip: currentAddress.zip?.trim(),
      };
      
      // Optional: Remove fields that haven't actually changed from initial state?
      // Or just send all fields - server update should handle it.
      // Remove undefined/empty fields before sending -> Set to null
      Object.keys(payload).forEach(key => {
          if (payload[key] === undefined || payload[key] === '') {
              payload[key] = null; // Send null to clear field in DB if needed
          }
      });

      console.log("Saving Address:", payload);

      // --- FIX: Send only the address fields to update --- 
      const saveResponse = await fetch(`${API_BASE_URL}/api/profile`, { 
          method: 'POST', 
          headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${userToken}`,
              'Accept': 'application/json'
          }, 
          body: JSON.stringify(payload)
      });

      if (!saveResponse.ok) { 
          const d = await saveResponse.json().catch(() => ({})); 
          throw new Error(d.error || 'Save failed'); 
      }
      
      console.log("Address save successful");
      navigation.goBack(); // Go back after successful save

    } catch (err: any) { 
        setError(`Save failed: ${err.message}`); 
        Alert.alert('Save Failed', err.message); 
    } finally { 
        setIsSaving(false); 
    }
  }, [userToken, currentAddress, initialAddress, navigation]);

  // Header Buttons
  useLayoutEffect(() => {
    const hasChanged = JSON.stringify(currentAddress) !== JSON.stringify(initialAddress);
    navigation.setOptions({
      headerLeft: () => <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined}/>,
      headerRight: () => <Button onPress={handleSave} title={isSaving ? "Saving..." : "Save"} disabled={isLoading || isSaving || !hasChanged} color={Platform.OS === 'ios' ? colors.primary : undefined} />,
    });
  }, [navigation, handleSave, isLoading, isSaving, currentAddress, initialAddress]);

  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollViewContent}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput style={styles.textInput} value={currentAddress.street || ''} onChangeText={text => handleInputChange('street', text)} placeholder="Enter street address" editable={!isSaving} autoCapitalize="words" autoComplete='street-address'/>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Unit / Suite / Etc.</Text>
            <TextInput style={styles.textInput} value={currentAddress.unit || ''} onChangeText={text => handleInputChange('unit', text)} placeholder="(Optional)" editable={!isSaving} />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>City</Text>
            <TextInput style={styles.textInput} value={currentAddress.city || ''} onChangeText={text => handleInputChange('city', text)} placeholder="Enter city" editable={!isSaving} autoCapitalize="words" />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>State</Text>
            <TextInput style={styles.textInput} value={currentAddress.state || ''} onChangeText={text => handleInputChange('state', text)} placeholder="Enter state (e.g., CA)" editable={!isSaving} autoCapitalize="characters" maxLength={2} />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>ZIP Code</Text>
            <TextInput style={styles.textInput} value={currentAddress.zip || ''} onChangeText={text => handleInputChange('zip', text)} placeholder="Enter ZIP code" editable={!isSaving} keyboardType="number-pad" autoComplete='postal-code' maxLength={5} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export default EditAddressScreen; 