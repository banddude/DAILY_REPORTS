import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/theme';
import { BrowseStackParamList } from '../navigation/AppNavigator';
import { S3_BUCKET_NAME, AWS_REGION } from '../config';

// Define route prop type based on the correct stack
type WebViewerScreenRouteProp = RouteProp<BrowseStackParamList, 'WebViewer'>;

// Define navigation prop type (optional but good practice)
type WebViewerScreenNavigationProp = NativeStackNavigationProp<BrowseStackParamList, 'WebViewer'>;

interface Props {
  route: WebViewerScreenRouteProp;
  navigation: WebViewerScreenNavigationProp;
}

export default function WebViewerScreen() {
  const route = useRoute<WebViewerScreenRouteProp>();
  const navigation = useNavigation<WebViewerScreenNavigationProp>();
  const { url } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("WebViewerScreen: Loading URL:", url);

  // Basic error handling for invalid URL format (optional)
  useEffect(() => {
    if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      console.error("WebViewerScreen: Invalid URL provided:", url);
      setError("Invalid or missing URL for viewer.");
      setIsLoading(false);
    }
  }, [url]);

  // Function to extract the JSON report key from the viewer URL
  const getJsonKeyFromUrl = (viewerUrl: string): string | null => {
    try {
      const urlObject = new URL(viewerUrl);
      const pathSegments = urlObject.pathname.split('/').filter(Boolean); // Remove empty segments

      // Expected path: users/{userId}/{customer}/{project}/{reportFolder}/report-viewer.html
      // Need at least 5 segments for this structure
      if (pathSegments.length >= 5 && pathSegments[pathSegments.length - 1] === 'report-viewer.html') {
        // Reconstruct the base path up to the report folder
        const basePath = pathSegments.slice(0, pathSegments.length - 1).join('/');
        const jsonKey = `${basePath}/daily_report.json`;
        console.log("Derived JSON key:", jsonKey);
        return jsonKey;
      }
    } catch (e) {
      console.error("Error parsing viewer URL:", e);
    }
    console.error("Could not derive JSON key from URL:", viewerUrl);
    return null;
  };

  const reportJsonKey = getJsonKeyFromUrl(url);

  // Add Edit button to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (reportJsonKey) {
              console.log(`Navigating to ReportEditor with key: ${reportJsonKey}`);
              navigation.navigate('ReportEditor', { reportKey: reportJsonKey });
            } else {
              Alert.alert("Cannot Edit", "Could not determine the report data file needed for editing.");
            }
          }}
          style={styles.headerButton}
        >
          {/* <Ionicons name="create-outline" size={24} color={colors.primary} /> */}
          <Text style={styles.headerButtonText}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, reportJsonKey]); // Depend on navigation and the derived key

  // --- Platform Specific Rendering --- 
  const renderContent = () => {
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    if (Platform.OS === 'web') {
      // Use iframe for web
      return (
        <iframe
          src={url}
          style={styles.iframeStyle}
          onLoad={() => setIsLoading(false)}
          onError={() => {
              setError('Failed to load content in iframe.');
              setIsLoading(false);
          }}
          title="Report Viewer"
        />
      );
    } else {
      // Use react-native-webview for native platforms
      return (
        <WebView
          source={{ uri: url }}
          style={{ flex: 1 }}
          onLoadStart={() => setIsLoading(true)} // Keep loading indicators for native
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            setError(`Failed to load content: ${nativeEvent.description || nativeEvent.code}`);
            setIsLoading(false);
          }}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative', // Needed for absolute positioning of loading indicator
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background, // Match theme
  },
  errorText: {
    color: colors.error,
    padding: 20,
    textAlign: 'center',
  },
  // Add basic styles for the iframe on web
  iframeStyle: {
      flex: 1,
      width: '100%',
      height: '100%', // Ensure iframe takes full height
      borderWidth: 0, // Remove iframe border
  },
  headerButton: {
      marginRight: spacing.md,
  },
  headerButtonText: {
      color: colors.primary, // Use theme primary color
      fontSize: 16,
      fontWeight: '600', // Make it bold
  }
}); 