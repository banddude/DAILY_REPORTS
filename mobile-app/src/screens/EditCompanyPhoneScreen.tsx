import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Alert, Button, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { EditCompanyPhoneScreenProps } from '../navigation/AppNavigator';

interface ProfileCompany { phone?: string; }
interface ProfileData { company?: ProfileCompany; }
const styles = StyleSheet.create({ /* Common editor styles */ safeArea:{flex:1,backgroundColor:colors.background}, container:{flex:1,padding:spacing.lg}, loadingContainer:{flex:1,justifyContent:'center',alignItems:'center'}, errorText:{color:colors.error,textAlign:'center',marginBottom:spacing.md}, label:{fontSize:typography.fontSizeS,fontWeight:typography.fontWeightMedium as '500',color:colors.textSecondary,marginBottom:spacing.sm,textTransform:'uppercase'}, textInput:{backgroundColor:colors.surface,borderRadius:borders.radiusMedium,paddingHorizontal:spacing.md,paddingVertical:spacing.md,fontSize:typography.fontSizeM,color:colors.textPrimary,borderWidth:borders.widthThin,borderColor:colors.borderLight} });

function EditCompanyPhoneScreen(): React.ReactElement {
  const navigation = useNavigation<EditCompanyPhoneScreenProps['navigation']>();
  const { userToken } = useAuth();
  const [initialValue, setInitialValue] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentValue = useCallback(async () => {
    if (!userToken) { setError('Auth required'); setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${userToken}` } });
      if (!response.ok) throw new Error('Fetch failed');
      const data = await response.json();
      const value = data?.company?.phone || '';
      setInitialValue(value);
      setCurrentValue(value);
    } catch (err: any) { setError(`Load failed: ${err.message}`); }
    finally { setIsLoading(false); }
  }, [userToken]);

  useEffect(() => { fetchCurrentValue(); }, [fetchCurrentValue]);

  const handleSave = useCallback(async () => {
    if (!userToken || currentValue === initialValue) { navigation.goBack(); return; }
    setIsSaving(true); setError(null);
    try {
      const profileResponse = await fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${userToken}` } });
      if (!profileResponse.ok) throw new Error('Failed to fetch profile before save');
      const fullProfile = await profileResponse.json();
      const payload = { ...fullProfile, company: { ...(fullProfile.company || {}), phone: currentValue } };
      const saveResponse = await fetch(`${API_BASE_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` }, body: JSON.stringify(payload) });
      if (!saveResponse.ok) { const d = await saveResponse.json().catch(() => ({})); throw new Error(d.error || 'Save failed'); }
      navigation.goBack();
    } catch (err: any) { setError(`Save failed: ${err.message}`); Alert.alert('Save Failed', err.message); }
    finally { setIsSaving(false); }
  }, [userToken, currentValue, initialValue, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <Button onPress={() => navigation.goBack()} title="Cancel" disabled={isSaving} color={Platform.OS === 'ios' ? colors.primary : undefined}/>,
      headerRight: () => <Button onPress={handleSave} title={isSaving ? "Saving..." : "Save"} disabled={isLoading || isSaving || currentValue.trim() === initialValue.trim()} color={Platform.OS === 'ios' ? colors.primary : undefined} />,
    });
  }, [navigation, handleSave, isLoading, isSaving, currentValue, initialValue]);

  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.label}>Company Phone Number</Text>
        <TextInput style={styles.textInput} value={currentValue} onChangeText={setCurrentValue} placeholder="Enter company phone" editable={!isSaving} keyboardType="phone-pad" autoComplete='tel' />
      </ScrollView>
    </SafeAreaView>
  );
}
export default EditCompanyPhoneScreen; 