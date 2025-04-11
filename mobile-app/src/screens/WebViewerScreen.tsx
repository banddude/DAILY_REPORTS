import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/theme';
import { BrowseStackParamList } from '../navigation/AppNavigator';

// Define route prop type based on the correct stack
type WebViewerScreenRouteProp = RouteProp<BrowseStackParamList, 'WebViewer'>;

// Define navigation prop type (optional but good practice)
type WebViewerScreenNavigationProp = NativeStackNavigationProp<BrowseStackParamList, 'WebViewer'>;

interface Props {
  route: WebViewerScreenRouteProp;
  navigation: WebViewerScreenNavigationProp;
}

export default function WebViewerScreen({ route }: Props) {
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
        <ActivityIndicator
          style={styles.loadingIndicator}
          size="large"
          color={colors.primary}
        />
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
  loadingIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent overlay
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
  }
}); 