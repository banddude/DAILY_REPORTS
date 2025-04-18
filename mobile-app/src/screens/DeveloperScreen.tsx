import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme, { colors } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../navigation/AppNavigator';
import { useIsFocused } from '@react-navigation/native';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Developer'>;

const Row = ({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress: () => void; }) => (
  <TouchableOpacity onPress={onPress} style={theme.screens.profileScreen.rowContainer}>
    <View style={theme.screens.profileScreen.iconContainer}>
      <Ionicons name={icon} size={22} color={colors.textSecondary} />
    </View>
    <Text style={theme.screens.profileScreen.rowLabel}>{label}</Text>
    <View style={theme.screens.profileScreen.valueContainer}>
      <Text style={theme.screens.profileScreen.valueText}>{value ?? 'Not Set'}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={theme.screens.profileScreen.disclosureIcon} />
    </View>
  </TouchableOpacity>
);

export default function DeveloperScreen({ navigation }: Props): React.ReactElement {
  const { session, isAuthenticated } = useAuth();
  const [config, setConfig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFocused = useIsFocused();

  const fetchConfig = useCallback(async () => {
    if (!session || !isAuthenticated) { setLoading(false); return; }
    try {
      const token = session.access_token;
      const res = await fetch(`${API_BASE_URL}/api/master-config`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session, isAuthenticated]);

  useEffect(() => {
    if (isFocused) {
      fetchConfig();
    }
  }, [isFocused, fetchConfig]);

  if (loading) return <SafeAreaView style={[theme.screens.profileScreen.safeArea, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;

  return (
    <SafeAreaView style={theme.screens.profileScreen.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={theme.screens.profileScreen.scrollViewContent} contentContainerStyle={theme.screens.profileScreen.contentContainer}>
        {error && <Text style={[theme.screens.profileScreen.errorText, { marginBottom: 16 }]}>{error}</Text>}
        <View style={theme.screens.profileScreen.section}>
          <Text style={theme.screens.profileScreen.sectionHeader}>Developer Tools</Text>
          <Row icon="chatbubbles-outline" label="Chat Model" value="View/Edit" onPress={() => navigation.navigate('EditChatModel')} />
          <Row icon="reader-outline" label="System Prompt" value={config?.config_system_prompt ? 'View/Edit' : undefined} onPress={() => navigation.navigate('EditSystemPrompt')} />
          <Row icon="document-text-outline" label="Report Schema" value={config?.config_report_json_schema ? 'View/Edit' : undefined} onPress={() => navigation.navigate('EditReportSchema')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 