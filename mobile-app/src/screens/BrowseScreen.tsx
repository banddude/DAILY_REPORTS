import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  Platform,
  TouchableOpacity // Use TouchableOpacity for better list items
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker'; // Import the picker
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import { colors, spacing, typography, borders } from '../theme/theme'; // <-- Add this import
import { API_BASE_URL } from '../config'; // <-- Import from config

// Define base URL for the API (use your actual backend URL)
// For local development with Expo Go, use your machine's local IP
// For production, use your deployed URL (e.g., reports.shaffercon.com)
// const API_BASE_URL = process.config.API_BASE_URL || 'https://localhost:3000'; // Replace if necessary <-- REMOVE THIS LINE
const S3_BUCKET_NAME = 'shaffer-reports'; // Add S3 Bucket Name
const AWS_REGION = 'us-east-1';        // Add AWS Region

// --- Styles --- (Similar to HomeScreen, but adapted for Browse)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // Use theme token
  },
  container: {
    flex: 1,
    padding: spacing.lg, // Use theme token
  },
  controlsContainer: {
    marginBottom: spacing.lg, // Use theme token
    padding: spacing.md, // Use theme token
    backgroundColor: colors.surface, // Use theme token
    borderRadius: borders.radiusLarge, // Use theme token
    shadowColor: '#000', // Keep existing shadow styles for now
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  controlGroup: {
    marginBottom: spacing.md, // Use theme token
  },
  label: {
    fontSize: typography.fontSizeM, // Use theme token
    fontWeight: typography.fontWeightMedium as '500', // Use theme token and cast
    color: colors.textPrimary, // Use theme token
    marginBottom: spacing.sm, // Use theme token
  },
  pickerWrapper: { // Wrapper to style the Picker border
      borderWidth: borders.widthThin, // Use theme token
      borderColor: colors.borderLight, // Use theme token
      borderRadius: borders.radiusSmall, // Use theme token
      backgroundColor: colors.surface, // Use theme token
      overflow: 'hidden', // Needed for borderRadius on Android
  },
  pickerWrapperDisabled: {
      backgroundColor: colors.background, // Use theme token (close match)
  },
  picker: {
      // Default picker styles are often sufficient
      // On iOS, height might need adjustment
      height: Platform.OS === 'ios' ? 150 : 50, // Keep platform-specific logic
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: spacing.md, // Use theme token
  },
  statusText: {
    marginTop: spacing.xs, // Use theme token
    color: colors.textSecondary, // Use theme token
    fontSize: typography.fontSizeXS, // Use theme token
  },
  errorText: {
    color: colors.error, // Use theme token
    fontWeight: typography.fontWeightBold as '600', // Use theme token and cast
    textAlign: 'center',
    fontSize: typography.fontSizeXS, // Use theme token
  },
  reportList: {
    marginTop: spacing.sm, // Use theme token
  },
  reportItem: {
    backgroundColor: colors.surface, // Use theme token
    padding: spacing.md, // Use theme token
    borderRadius: borders.radiusLarge, // Use theme token
    marginBottom: spacing.sm, // Use theme token
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000', // Keep existing shadow styles for now
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 2,
  },
  reportInfo: {
      flex: 1, // Allow text to take available space
  },
  reportName: {
    fontSize: typography.fontSizeM, // Use theme token
    fontWeight: typography.fontWeightMedium as '500', // Use theme token and cast
    color: colors.textPrimary, // Use theme token
  },
  reportLinks: {
    flexDirection: 'row', // Arrange links horizontally
    marginTop: Platform.OS === 'ios' ? spacing.xs : 0, // Use theme token for spacing
    marginLeft: spacing.sm, // Use theme token
  },
  linkText: {
    color: colors.primary, // Use theme token
    fontWeight: typography.fontWeightMedium as '500', // Use theme token and cast
    marginLeft: spacing.md, // Use theme token
    fontSize: typography.fontSizeXS, // Use theme token
  },
  noReportsText: {
      textAlign: 'center',
      color: colors.textSecondary, // Use theme token
      marginTop: spacing.lg, // Use theme token
      fontStyle: 'italic',
      fontSize: typography.fontSizeXS, // Use theme token
  }
});

// --- Helper Functions ---
const fetchApi = async (endpoint: string): Promise<string[]> => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('Fetching:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Unknown API error' }));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Received:', data);
    // Ensure the result is always an array of strings
    return Array.isArray(data?.items) ? data.items.filter((item: any) => typeof item === 'string') : [];
  } catch (error: any) {
    console.error("API Fetch Error:", error);
    throw error;
  }
};

const openLink = async (url: string) => {
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert("Cannot Open Link", `Don't know how to open this URL: ${url}`);
  }
};

// --- Component ---
function BrowseScreen(): React.ReactElement {
  const navigation = useNavigation<any>(); // Get navigation object, use specific type if available
  const [customers, setCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [reports, setReports] = useState<string[]>([]);
  const [loadingState, setLoadingState] = useState<'idle' | 'customers' | 'projects' | 'reports'>('customers'); // Start loading customers
  const [error, setError] = useState<string | null>(null);

  // Fetch initial customers
  useEffect(() => {
    let isMounted = true;
    setLoadingState('customers');
    setError(null);
    fetchApi('/api/browse-reports')
      .then(fetchedCustomers => {
          if (isMounted) setCustomers(fetchedCustomers);
      })
      .catch(err => {
          if (isMounted) setError(`Failed to load customers: ${err.message}`);
      })
      .finally(() => {
          if (isMounted) setLoadingState('idle');
      });
      return () => { isMounted = false }; // Cleanup on unmount
  }, []);

  // Fetch projects when customer changes
  useEffect(() => {
    if (!selectedCustomer) {
      setProjects([]);
      setSelectedProject(undefined);
      setReports([]);
      return;
    }
    let isMounted = true;
    setLoadingState('projects');
    setError(null);
    setSelectedProject(undefined);
    setReports([]);
    fetchApi(`/api/browse-reports?customer=${encodeURIComponent(selectedCustomer)}`)
      .then(fetchedProjects => {
          if (isMounted) setProjects(fetchedProjects);
      })
      .catch(err => {
          if (isMounted) setError(`Failed to load projects for ${selectedCustomer}: ${err.message}`);
      })
      .finally(() => {
          if (isMounted) setLoadingState('idle');
      });
       return () => { isMounted = false };
  }, [selectedCustomer]);

  // Fetch reports when project changes
  useEffect(() => {
    if (!selectedCustomer || !selectedProject) {
      setReports([]);
      return;
    }
    let isMounted = true;
    setLoadingState('reports');
    setError(null);
    fetchApi(`/api/browse-reports?customer=${encodeURIComponent(selectedCustomer)}&project=${encodeURIComponent(selectedProject)}`)
      .then(fetchedReports => {
          if (isMounted) setReports(fetchedReports);
      })
      .catch(err => {
          if (isMounted) setError(`Failed to load reports for ${selectedCustomer}/${selectedProject}: ${err.message}`);
      })
      .finally(() => {
          if (isMounted) setLoadingState('idle');
      });
       return () => { isMounted = false };
  }, [selectedCustomer, selectedProject]); // selectedCustomer needed for the API call

  // Display loading indicator
  const renderLoading = (section: 'customers' | 'projects' | 'reports') => {
    if (loadingState === section) {
      return (
          <View style={styles.statusContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.statusText}>Loading {section}...</Text>
          </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container}>
        <View style={styles.controlsContainer}>
            {/* Customer Picker */}
            <View style={styles.controlGroup}>
                <Text style={styles.label}>Customer:</Text>
                <View style={[styles.pickerWrapper, loadingState === 'customers' && styles.pickerWrapperDisabled]}>
                    <Picker
                        selectedValue={selectedCustomer}
                        onValueChange={(itemValue) => setSelectedCustomer(itemValue || undefined)}
                        enabled={loadingState !== 'customers'}
                        style={styles.picker}
                        prompt="Select a Customer"
                    >
                        <Picker.Item label="-- Select Customer --" value={undefined} />
                        {customers.map((customer) => (
                            <Picker.Item key={customer} label={customer} value={customer} />
                        ))}
                    </Picker>
                </View>
                 {renderLoading('customers')}
            </View>

            {/* Project Picker */} 
            <View style={styles.controlGroup}>
                <Text style={styles.label}>Project:</Text>
                 <View style={[styles.pickerWrapper, (!selectedCustomer || loadingState === 'projects') && styles.pickerWrapperDisabled]}>
                    <Picker
                        selectedValue={selectedProject}
                        onValueChange={(itemValue) => setSelectedProject(itemValue || undefined)}
                        enabled={!!selectedCustomer && loadingState !== 'projects'}
                        style={styles.picker}
                        prompt="Select a Project"
                    >
                        <Picker.Item label="-- Select Project --" value={undefined} />
                        {projects.map((project) => (
                            <Picker.Item key={project} label={project} value={project} />
                        ))}
                    </Picker>
                 </View>
                 {renderLoading('projects')}
            </View>
        </View>

        {error && (
            <View style={styles.statusContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        )}

        {renderLoading('reports')}

        {selectedCustomer && selectedProject && reports.length > 0 && (
          <View style={styles.reportList}>
            {reports.map((reportFolder) => {
              const reportDate = reportFolder.match(/report_(\d{4}-\d{2}-\d{2})/)?.[1] || reportFolder;
              const baseKey = `${selectedCustomer}/${selectedProject}/${reportFolder}`;
              const jsonKey = `${baseKey}/daily_report.json`;
              // const editorUrl = `${API_BASE_URL}/edit-report?key=${encodeURIComponent(jsonKey)}`;
              // Construct viewer URL - needs adjustment based on actual deployment
              // Option 1: Use a dedicated viewer endpoint on the server
              // const viewerUrl = `${API_BASE_URL}/view-report?key=${encodeURIComponent(jsonKey)}`;
              // Option 2: Direct S3 link (requires public bucket or signed URLs & knowing bucket/region)
               // const viewerS3Key = `${baseKey}/report-viewer.html`;
               // const viewerUrl = `https://your-bucket.s3.your-region.amazonaws.com/${viewerS3Key}`;
               // --- Navigating to the editor screen for both View and Edit for now ---

              const navigateToEditor = () => {
                  console.log(`Navigating to ReportEditor with key: ${jsonKey}`);
                  // Ensure your ReportEditorScreen is registered with the name 'ReportEditor' in your navigator
                  navigation.navigate('ReportEditor', { reportKey: jsonKey });
              };

              const navigateToWebViewer = () => {
                  // Construct the direct S3 URL for the viewer HTML file
                  const viewerKey = `${baseKey}/report-viewer.html`;
                  // Using virtual-hosted style S3 URL
                  const viewerUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${viewerKey}`;

                  console.log(`Navigating to WebViewer with URL: ${viewerUrl}`);
                  navigation.navigate('WebViewer', { url: viewerUrl });
              };

              return (
                <View key={reportFolder} style={styles.reportItem}>
                    <View style={styles.reportInfo}>
                        <Text style={styles.reportName}>Report: {reportDate}</Text>
                    </View>
                  <View style={styles.reportLinks}>
                    {/* Navigate to WebViewer for View and ReportEditorScreen for Edit */}
                    <TouchableOpacity onPress={navigateToWebViewer}><Text style={styles.linkText}>View</Text></TouchableOpacity>
                    <TouchableOpacity onPress={navigateToEditor}><Text style={styles.linkText}>Edit</Text></TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {selectedCustomer && selectedProject && !loadingState && reports.length === 0 && !error && (
             <Text style={styles.noReportsText}>No reports found for this selection.</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

export default BrowseScreen; 