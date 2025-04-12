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
interface ProfileData {
  company?: {
    address?: AddressData;
  };
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
      const response = await fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${userToken}` } });
      if (!response.ok) throw new Error('Fetch failed');
      const data = await response.json();
      const address = data?.company?.address || {};
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
    if (!userToken || JSON.stringify(currentAddress) === JSON.stringify(initialAddress)) {
        navigation.goBack();
        return;
    }
    setIsSaving(true); setError(null);
    try {
      const profileResponse = await fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${userToken}` } });
      if (!profileResponse.ok) throw new Error('Failed to fetch profile before save');
      const fullProfile = await profileResponse.json();
      // Ensure company object exists before merging address
      const updatedCompany = { ...(fullProfile.company || {}), address: currentAddress };
      const payload = { ...fullProfile, company: updatedCompany };
      const saveResponse = await fetch(`${API_BASE_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` }, body: JSON.stringify(payload) });
      if (!saveResponse.ok) { const d = await saveResponse.json().catch(() => ({})); throw new Error(d.error || 'Save failed'); }
      navigation.goBack();
    } catch (err: any) { setError(`Save failed: ${err.message}`); Alert.alert('Save Failed', err.message); }
    finally { setIsSaving(false); }
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