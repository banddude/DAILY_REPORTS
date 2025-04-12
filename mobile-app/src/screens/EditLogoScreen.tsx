import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/AppNavigator'; // Correct ParamList for Profile stack

// Helper to open links (might not be needed here but copied for SettingsRow consistency)
const openLink = async (url: string) => {
  if (!url) return;
  const prefixedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
  try {
      const supported = await Linking.canOpenURL(prefixedUrl);
      if (supported) {
        await Linking.openURL(prefixedUrl);
      } else {
        Alert.alert("Cannot Open Link", `Don't know how to open this URL: ${prefixedUrl}`);
      }
  } catch (error: any) {
       Alert.alert("Error Opening Link", `Could not open link: ${error.message}`);
  }
};

type EditLogoScreenRouteProp = RouteProp<ProfileStackParamList, 'EditLogo'>;

// --- Styles (Reverted Layout, Aligned Styles) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Use contentContainer style similar to ProfileScreen
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg, // Add some bottom padding
  },
  // Section styles similar to ProfileScreen
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    paddingBottom: spacing.xs,
    marginBottom: spacing.md, // Match spacing before rows
    color: colors.textSecondary,
    fontSize: typography.fontSizeS,
    fontWeight: typography.fontWeightMedium as '500',
    textTransform: 'uppercase',
  },
  // Row styles copied directly from ProfileScreen for consistency
  rowContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    minHeight: 44,
  },
  firstRowInSection: {
    borderTopWidth: borders.widthHairline,
    borderTopColor: colors.borderLight,
  },
  iconContainer: {
    marginRight: spacing.md,
    width: 24, // Match icon container width
    height: 24, // Match icon size
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 24, // Match icon container width
    height: 24, // Match icon size
    borderRadius: borders.radiusSmall,
  },
  rowLabel: {
    flex: 1,
  },
  valueContainer: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  valueText: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  linkValueText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  disclosureIcon: {
     marginLeft: spacing.xs,
  },
  // Status message styles (can be kept similar)
  statusMessageContainer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg, // Add padding like ProfileScreen
    minHeight: 20,
    width: '100%',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontWeight: typography.fontWeightBold as '600',
    fontSize: typography.fontSizeM,
  },
  successText: {
    color: colors.success,
    textAlign: 'center',
    fontWeight: typography.fontWeightBold as '600',
    fontSize: typography.fontSizeM,
  },
  // Style for the large logo preview
  logo: {
    width: '80%',
    aspectRatio: 2, // Maintain 2:1 aspect ratio
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
    alignSelf: 'center', // Center the logo
  },
  // Style for the action button (mimicking a SettingsRow)
  buttonRow: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    borderTopWidth: borders.widthHairline, // Add top border like firstRowInSection
    borderTopColor: colors.borderLight,
    minHeight: 44, // Match row minHeight
  },
  buttonRowText: {
    color: colors.textSecondary, // Match standard value text color
    fontSize: typography.fontSizeM, // Match valueText size
    fontWeight: typography.fontWeightMedium as '500',
    marginLeft: spacing.sm,
    flex: 1, // Allow text to take space
  },
  // Use iconContainer style for the button icon placement
  buttonIconContainer: {
      marginRight: spacing.md,
      width: 24, // Fixed width for alignment
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
  },
});

function EditLogoScreen(): React.ReactElement {
  const navigation = useNavigation();
  const route = useRoute<EditLogoScreenRouteProp>();
  const { userToken } = useAuth();

  // Initial logo URL passed from ProfileScreen (or fetch if needed)
  const initialLogoUrl = route.params?.currentLogoUrl;
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Re-fetch logo URL if needed (e.g., if not passed via params or to confirm update)
  // This ensures the displayed logo is current after potential updates
  useEffect(() => {
      if (userToken) {
          // Use cache buster to ensure freshness
          setLogoUrl(`${API_BASE_URL}/api/logo/${userToken}?t=${Date.now()}`);
      }
  }, [userToken]); // Re-run if token changes (unlikely but safe)

  // --- Logo Upload Logic (Moved from ProfileScreen) ---
  const handleLogoUpload = useCallback(async () => {
    if (!userToken || isUploading) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Access to photos is needed to upload a logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [2, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedImage = result.assets[0];
      setIsUploading(true);

      const formData = new FormData();
      if (Platform.OS === 'web') {
          const response = await fetch(selectedImage.uri);
          const blob = await response.blob();
          const fileExtension = selectedImage.uri.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`;
          formData.append('logo', blob, `logo.${fileExtension}`);
      } else {
          // @ts-ignore
          formData.append('logo', {
              uri: selectedImage.uri,
              type: selectedImage.mimeType || 'image/jpeg',
              name: `logo.${selectedImage.uri.split('.').pop()}`,
          });
      }

      const response = await fetch(`${API_BASE_URL}/api/upload-logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      // Update logo URL state with cache buster and show success
      const newLogoUrl = `${API_BASE_URL}/api/logo/${userToken}?t=${Date.now()}`;
      setLogoUrl(newLogoUrl);
      setSuccessMessage('Logo uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000); // Clear message after 3s

      // Optionally, inform ProfileScreen to refresh if needed,
      // though focus-based refresh might handle it.
      // navigation.navigate('Profile', { logoJustUpdated: true });

    } catch (err: any) {
      console.error("Error uploading logo:", err);
      setError(`Logo upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  }, [userToken, isUploading]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Use ScrollView with standard content container padding */}
      <ScrollView contentContainerStyle={styles.contentContainer}>

        {/* Large Logo Preview */}
        {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.logo}
              resizeMode="contain"
              onError={(e) => {
                console.warn('Error loading logo:', e.nativeEvent.error);
                setError('Could not load current logo.');
                setLogoUrl(null); // Clear invalid URL
              }}
              key={logoUrl} // Force re-render if URL changes
            />
          ) : (
            // Placeholder if no logo
            <View style={[styles.logo, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }]}>
              <Ionicons name="image-outline" size={60} color={colors.borderLight} />
              <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>No Logo Set</Text>
            </View>
          )}

        {/* Actions Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.buttonRow} // Use the new row style
            onPress={handleLogoUpload}
            disabled={isUploading}
          >
            <View style={styles.buttonIconContainer}> 
              {isUploading ? (
                <ActivityIndicator color={colors.textSecondary} size="small" /> // Use secondary color for consistency
              ) : (
                <Ionicons name="cloud-upload-outline" size={22} color={colors.textSecondary} /> // Use secondary color like other icons
              )}
            </View>
            <Text style={styles.buttonRowText}>{isUploading ? 'Uploading...' : 'Replace Logo'}</Text>
          </TouchableOpacity>
        </View>

        {/* Status Messages (Kept below button) */}
        <View style={[styles.statusMessageContainer, {marginTop: 0}]}> 
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

export default EditLogoScreen; 