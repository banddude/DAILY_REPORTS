import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity, Alert, Share, Button } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import { BrowseStackParamList } from '../navigation/AppNavigator';
import { S3_BUCKET_NAME, AWS_REGION, API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { WebViewerScreenProps } from '../navigation/AppNavigator';

// Define route prop type based on the correct stack
type WebViewerScreenRouteProp = RouteProp<BrowseStackParamList, 'WebViewer'>;

// Define navigation prop type (optional but good practice)
type WebViewerScreenNavigationProp = NativeStackNavigationProp<BrowseStackParamList, 'WebViewer'>;

interface Props {
  route: WebViewerScreenRouteProp;
  navigation: WebViewerScreenNavigationProp;
}

export default function WebViewerScreen({ route, navigation }: WebViewerScreenProps) {
  const { url } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const webviewRef = useRef<WebView>(null);
  const { userToken } = useAuth();

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

  // Function to fetch and inject JSON data
  const injectReportData = async () => {
    if (!reportJsonKey || !userToken || !webviewRef.current) return;

    try {
      // Fetch JSON data from your API endpoint
      const apiUrl = `${API_BASE_URL}/api/report?key=${encodeURIComponent(reportJsonKey)}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const reportData = await response.json();
      const script = `
        window.reportData = ${JSON.stringify(reportData)};
        if (window.renderReport) {
          window.renderReport(window.reportData);
        } else {
          console.error('window.renderReport function not found in WebView.');
        }
        true; // Required for Android
      `;
      webviewRef.current.injectJavaScript(script);
      console.log('Injected report data into WebView.');
    } catch (error) {
      console.error('Failed to fetch or inject report data:', error);
      Alert.alert('Error', 'Could not load full report details.');
    }
  };

  // --- Share Handler ---
  const handleShare = async () => {
    if (!url) {
      Alert.alert('Error', 'Cannot share report without a URL.');
      return;
    }
    try {
      const result = await Share.share({
        message: url,
        url: url,
        title: 'Daily Report',
      });
      // Optional: Log share result
      console.log('Share result:', result.action);
    } catch (error: any) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', `Failed to share report: ${error.message}`);
    }
  };

  // Add Edit and Share icons to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
         <View style={styles.headerButtonContainer}>
           {/* Edit Icon Button */}
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
             disabled={!reportJsonKey}
           >
             <Ionicons 
               name="pencil-outline" 
               size={22}
               color={!reportJsonKey ? colors.textDisabled : colors.textSecondary}
             />
           </TouchableOpacity>
           {/* Share Icon Button */}
           <TouchableOpacity
             onPress={handleShare}
             style={[styles.headerButton, { marginLeft: spacing.sm }]}
             disabled={isLoading}
           >
             <Ionicons 
               name="share-outline" 
               size={22}
               color={isLoading ? colors.textDisabled : colors.textSecondary}
             />
           </TouchableOpacity>
         </View>
      ),
    });
  }, [navigation, reportJsonKey, handleShare, isLoading]);

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
          style={{ flex: 1, paddingTop: 0, marginTop: 0 }}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => {
             setIsLoading(false);
             // Inject JS after load finishes to remove body margin/padding
             const jsCode = `
               try {
                 document.body.style.marginTop = '0px';
                 document.body.style.paddingTop = '0px';
                 document.documentElement.style.paddingTop = '0px'; // Also try on html element
                 document.documentElement.style.marginTop = '0px';
                 // Optionally find a specific wrapper if body doesn't work:
                 // const wrapper = document.querySelector('.report-container'); // Replace .report-container if needed
                 // if (wrapper) { wrapper.style.paddingTop = '0px'; wrapper.style.marginTop = '0px'; }
               } catch (e) {
                 console.error('Error injecting styles:', e);
               }
               true; // Required for Android
             `;
             webviewRef.current?.injectJavaScript(jsCode);
             console.log('Injected style override JS');
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            setError(`Failed to load content: ${nativeEvent.description || nativeEvent.code}`);
            setIsLoading(false);
          }}
          ref={webviewRef}
          automaticallyAdjustContentInsets={false}
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
    position: 'relative',
    paddingTop: 0,
    marginTop: 0,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.error,
    padding: 20,
    textAlign: 'center',
  },
  iframeStyle: {
      flex: 1,
      width: '100%',
      height: '100%',
      borderWidth: 0,
  },
  headerButton: {
      padding: spacing.xs,
  },
  headerButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 