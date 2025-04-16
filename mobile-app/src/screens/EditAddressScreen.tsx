import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
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
import theme, { colors } from '../theme/theme';
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

function EditAddressScreen(): React.ReactElement {
  const navigation = useNavigation<EditAddressScreenProps['navigation']>();
  const { session, isAuthenticated } = useAuth();
  const [initialAddress, setInitialAddress] = useState<AddressData>({});
  const [currentAddress, setCurrentAddress] = useState<AddressData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current address
  const fetchCurrentAddress = useCallback(async () => {
    if (!session || !isAuthenticated) { /* ... handle auth error ... */ return; }
    setIsLoading(true); setError(null);
    const token = session.access_token;
    if (!token) { /* ... handle token error ... */ return; }

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('Fetch failed');
      const data = await response.json();
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
  }, [session, isAuthenticated]);

  useEffect(() => { fetchCurrentAddress(); }, [fetchCurrentAddress]);

  // Handle input changes for specific address fields
  const handleInputChange = useCallback((field: keyof AddressData, value: string) => {
      setCurrentAddress(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save updated address
  const handleSave = useCallback(async () => {
    if (!session || !isAuthenticated || JSON.stringify(currentAddress) === JSON.stringify(initialAddress)) {
        navigation.goBack();
        return;
    }
    setIsSaving(true); setError(null);
    const token = session.access_token;
    if (!token) { /* ... handle token error ... */ return; }

    try {
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

      const saveResponse = await fetch(`${API_BASE_URL}/api/profile`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }, 
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
  }, [session, isAuthenticated, currentAddress, initialAddress, navigation]);

  // Header Buttons
  useLayoutEffect(() => {
    const hasChanged = JSON.stringify(currentAddress) !== JSON.stringify(initialAddress);
    navigation.setOptions({
      headerLeft: () => <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined}/>,
      headerRight: () => <Button onPress={handleSave} title={isSaving ? "Saving..." : "Save"} disabled={isLoading || isSaving || !hasChanged} color={Platform.OS === 'ios' ? colors.primary : undefined} />,
    });
  }, [navigation, handleSave, isLoading, isSaving, currentAddress, initialAddress]);

  if (isLoading) return <View style={theme.screens.editAddressScreen.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={theme.screens.editAddressScreen.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={theme.screens.editAddressScreen.keyboardAvoidingView}
      >
        <ScrollView style={theme.screens.editAddressScreen.scrollViewContent}>
          {error && <Text style={theme.screens.editAddressScreen.errorText}>{error}</Text>}

          <View style={theme.screens.editAddressScreen.fieldContainer}>
            <Text style={theme.screens.editAddressScreen.label}>Street Address</Text>
            <TextInput style={theme.screens.editAddressScreen.textInput} value={currentAddress.street || ''} onChangeText={text => handleInputChange('street', text)} placeholder="Enter street address" editable={!isSaving} autoCapitalize="words" autoComplete='street-address'/>
          </View>

          <View style={theme.screens.editAddressScreen.fieldContainer}>
            <Text style={theme.screens.editAddressScreen.label}>Unit / Suite / Etc.</Text>
            <TextInput style={theme.screens.editAddressScreen.textInput} value={currentAddress.unit || ''} onChangeText={text => handleInputChange('unit', text)} placeholder="(Optional)" editable={!isSaving} />
          </View>

          <View style={theme.screens.editAddressScreen.fieldContainer}>
            <Text style={theme.screens.editAddressScreen.label}>City</Text>
            <TextInput style={theme.screens.editAddressScreen.textInput} value={currentAddress.city || ''} onChangeText={text => handleInputChange('city', text)} placeholder="Enter city" editable={!isSaving} autoCapitalize="words" />
          </View>

          <View style={theme.screens.editAddressScreen.fieldContainer}>
            <Text style={theme.screens.editAddressScreen.label}>State</Text>
            <TextInput style={theme.screens.editAddressScreen.textInput} value={currentAddress.state || ''} onChangeText={text => handleInputChange('state', text)} placeholder="Enter state (e.g., CA)" editable={!isSaving} autoCapitalize="characters" maxLength={2} />
          </View>

          <View style={theme.screens.editAddressScreen.fieldContainer}>
            <Text style={theme.screens.editAddressScreen.label}>ZIP Code</Text>
            <TextInput style={theme.screens.editAddressScreen.textInput} value={currentAddress.zip || ''} onChangeText={text => handleInputChange('zip', text)} placeholder="Enter ZIP code" editable={!isSaving} keyboardType="number-pad" autoComplete='postal-code' maxLength={5} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export default EditAddressScreen; 