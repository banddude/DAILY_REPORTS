import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/theme';

// Type for navigation props
type WebViewScreenProps = {
  route: {
    params: {
      url: string; // Expect URL to be passed
    };
  };
  navigation: any; // Replace with specific navigation type
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function WebViewScreen({ route }: WebViewScreenProps): React.ReactElement {
  const { url } = route.params;

  if (!url) {
    // Handle missing URL - maybe navigate back or show an error
    // For now, just returning an empty view
    return <SafeAreaView style={styles.safeArea}><View /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <WebView
        style={{ flex: 1 }}
        source={{ uri: url }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        // Optional: Add error handling
        // onError={(syntheticEvent) => {
        //   const { nativeEvent } = syntheticEvent;
        //   console.warn('WebView error: ', nativeEvent);
        //   // Show error message or fallback
        // }}
      />
    </SafeAreaView>
  );
} 