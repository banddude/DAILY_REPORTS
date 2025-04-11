import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from './BrowseScreen';

// Basic type for the result object expected from the server
interface ReportResult {
  editorUrl: string;
  viewerUrl: string;
}

// Type for the result state, including message and type (success, error, loading, null)
type ResultState = {
  message: string;
  type: 'success' | 'error' | 'loading' | null;
  data?: ReportResult | null;
};

// Define a unified asset type for state
interface SelectedAsset {
  uri: string;
  name: string;
  size?: number;
}

// Add API Base URL (or import from a config file)
// const API_BASE_URL = process.env.API_BASE_URL || 'https://localhost:3000'; // <-- REMOVE THIS LINE

// Type for loading state for different data types
type LoadingState = 'customers' | 'projects' | false;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { userToken } = useAuth();
  const [selectedFile, setSelectedFile] =
    useState<SelectedAsset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ResultState>({ message: '', type: null, data: null });

  // State for pickers
  const [customers, setCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [loadingState, setLoadingState] = useState<LoadingState>(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Log token value on every render
  console.log(`HomeScreen Render: userToken is ${userToken ? 'present' : 'null'}`);

  // Fetch customers - Back to Simplest Logic
  useEffect(() => {
    let isMounted = true;
    console.log(`HomeScreen Customer Effect Triggered: userToken is ${userToken ? 'present' : 'null'}`);

    const fetchCustomers = async () => {
      // Check token *inside* the async function right before fetch
      if (!userToken) { 
        console.log('FetchCustomers ABORTED: No userToken at time of execution.');
        setCustomers([]);
        if(isMounted) setLoadingState(false); // Ensure loading stops if aborted
        return;
      }
      
      setLoadingState('customers');
      setPickerError(null);
      console.log('HomeScreen: INSIDE fetchCustomers async func - Attempting fetchApi call...'); // Log before the call
      try {
        const fetchedCustomers = await fetchApi('/api/browse-reports', userToken);
        if (isMounted) {
          console.log('HomeScreen: Successfully fetched customers (simple effect).', fetchedCustomers);
          setCustomers(fetchedCustomers);
        }
      } catch (err: any) {
        const errorMessage = `Failed to load customers: ${err.message}`;
        if (isMounted) {
            console.error("HomeScreen Fetch customers error (simple effect):", errorMessage, err); // Log full error
            setPickerError(errorMessage);
            setCustomers([]);
        }
      } finally {
        if (isMounted) setLoadingState(false);
      }
    };

    // Directly call the async function if token exists
    if (userToken) {
        fetchCustomers();
    } else {
        // Clear customers if token is null (e.g., on logout)
        setCustomers([]);
    }

    return () => { isMounted = false; };
  }, [userToken]); // Depend ONLY on userToken

  // Fetch projects - Needs token check
  useEffect(() => {
    let isMounted = true;
    if (!selectedCustomer || !userToken) {
        setProjects([]); 
        setSelectedProject(undefined);
        return; 
    }
    
    const fetchProjects = async () => {
      setLoadingState('projects');
      setPickerError(null);
      setProjects([]);
      setSelectedProject(undefined);
      console.log(`HomeScreen: Triggering project fetch for customer ${selectedCustomer} (token present).`);
      try {
        const fetchedProjects = await fetchApi(`/api/browse-reports?customer=${encodeURIComponent(selectedCustomer)}`, userToken);
        if (isMounted) {
          setProjects(fetchedProjects);
        }
      } catch (err: any) {
        const errorMessage = `Failed to load projects: ${err.message}`;
        if (isMounted) setPickerError(errorMessage);
        console.error("HomeScreen Fetch projects error:", errorMessage, err);
      } finally {
        if (isMounted) setLoadingState(false);
      }
    };
    fetchProjects();
    return () => { isMounted = false; };
  }, [selectedCustomer, userToken]);

  async function pickDocument() {
    // Reset previous result and selection
    setResult({ message: '', type: null, data: null });
    setSelectedFile(null);

    // Present choice to the user
    Alert.alert(
      'Select Video Source',
      'Where would you like to select the video from?',
      [
        {
          text: 'Photo Library',
          onPress: async () => {
            try {
              // Request permissions
              const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (permissionResult.granted === false) {
                Alert.alert('Permission Required', 'Photo library permission is needed to select videos.');
                return;
              }

              const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false, // Depending on requirements, could allow basic editing
                quality: 0.8, // Adjust quality if needed for uploads
              });

              if (pickerResult.canceled) {
                console.log('Image picking cancelled');
                return;
              }

              if (pickerResult.assets && pickerResult.assets.length > 0) {
                const asset = pickerResult.assets[0];
                // Limit file size (e.g., 100MB) - adjust as needed
                const maxSize = 100 * 1024 * 1024;
                if (asset.fileSize && asset.fileSize > maxSize) {
                  Alert.alert("File Too Large", `Please select a video file smaller than ${maxSize / (1024 * 1024)} MB.`);
                  return;
                }
                // Map ImagePickerAsset to SelectedAsset
                setSelectedFile({
                  uri: asset.uri,
                  name: asset.fileName || `video_${Date.now()}.mov`, // Provide a default name if fileName is null
                  size: asset.fileSize,
                });
                console.log('Selected file URI (Library):', asset.uri);
              }
            } catch (error) {
              console.error('Error picking from library:', error);
              setResult({ message: `Error selecting file: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
            }
          },
        },
        {
          text: 'Record Video',
          onPress: async () => {
            try {
              // Request camera permissions
              const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
              if (permissionResult.granted === false) {
                Alert.alert('Permission Required', 'Camera permission is needed to record videos.');
                return;
              }

              const pickerResult = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false, // Or true if you want basic editing
                quality: 0.8, // Adjust quality as needed
              });

              if (pickerResult.canceled) {
                console.log('Video recording cancelled');
                return;
              }

              if (pickerResult.assets && pickerResult.assets.length > 0) {
                const asset = pickerResult.assets[0];
                // Optional: Check file size if necessary (Camera output size might be less predictable)
                // const maxSize = 100 * 1024 * 1024;
                // if (asset.fileSize && asset.fileSize > maxSize) { ... }

                // Map CameraAsset to SelectedAsset
                setSelectedFile({
                  uri: asset.uri,
                  // Camera roll often doesn't provide a good filename
                  name: `recorded_video_${Date.now()}.mov`, 
                  size: asset.fileSize, // fileSize might be undefined
                });
                console.log('Recorded video URI:', asset.uri);
              }
            } catch (error) {
              console.error('Error recording video:', error);
              setResult({ message: `Error recording video: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
            }
          },
        },
        {
          text: 'Files',
          onPress: async () => {
            try {
              const pickerResult = await DocumentPicker.getDocumentAsync({
                type: 'video/*', // Accept any video type
                copyToCacheDirectory: false, // Avoid unnecessary copying if possible
              });

              if (pickerResult.canceled) {
                console.log('Document picking cancelled');
                return;
              }

              if (pickerResult.assets && pickerResult.assets.length > 0) {
                const asset = pickerResult.assets[0];
                // Limit file size (e.g., 100MB) - adjust as needed
                const maxSize = 100 * 1024 * 1024;
                 if (asset.size && asset.size > maxSize) {
                    Alert.alert("File Too Large", `Please select a video file smaller than ${maxSize / (1024 * 1024)} MB.`);
                    return;
                 }
                 // Map DocumentPickerAsset to SelectedAsset
                 setSelectedFile({
                    uri: asset.uri,
                    name: asset.name,
                    size: asset.size,
                 });
                 console.log('Selected file URI (Files):', asset.uri);
              }
            } catch (error) {
              console.error('Error picking document:', error);
              setResult({ message: `Error selecting file: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }

  async function handleUpload() {
    if (!selectedCustomer || !selectedProject) {
      setResult({ message: 'Please select a customer and project first.', type: 'error' });
      return;
    }
    if (!selectedFile) {
      setResult({ message: 'Please select or record a video file first.', type: 'error' });
      return;
    }
    if (!userToken) {
        setResult({ message: 'Authentication error. Please log out and back in.', type: 'error' });
        return;
    }

    setIsLoading(true);
    setResult({ message: 'Generating report... ', type: 'loading', data: null });

    const formData = new FormData();
    formData.append('customer', selectedCustomer);
    formData.append('project', selectedProject);
    formData.append('video', { uri: selectedFile.uri, name: selectedFile.name } as any);

    try {
      console.log('HomeScreen handleUpload: Calling /api/generate-report');
      const response = await fetch(`${API_BASE_URL}/api/generate-report`, {
        method: 'POST',
        body: formData,
        headers: {
           'Accept': 'application/json',
           'Authorization': `Bearer ${userToken}`
        },
      });

      const responseJson: ReportResult | { error: string } = await response.json();

      if (!response.ok) {
         const errorMessage = (responseJson as { error: string }).error || `Report generation failed: ${response.status}`;
         throw new Error(errorMessage);
      }
       const reportData = responseJson as ReportResult;
       console.log('Report generated:', reportData);
       setResult({ message: 'Report Generated Successfully!', type: 'success', data: reportData });

    } catch (error) {
      console.error('Report generation error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult({ message: `Error: ${errorMessage}`, type: 'error', data: null });
    } finally {
      setIsLoading(false);
    }
  }

   function renderResultArea() {
     if (result.type === null) return null;

     const resultContainerStyle = [
       styles.resultsAreaBase,
       result.type === 'loading' && styles.resultsLoading,
       result.type === 'success' && styles.resultsSuccess,
       result.type === 'error' && styles.resultsError,
     ];

     const resultTextStyle = [
       styles.resultTextBase,
       result.type === 'success' && styles.resultTextSuccess,
       result.type === 'error' && styles.resultTextError,
       result.type === 'loading' && styles.resultTextLoading,
     ];

     return (
       <View style={resultContainerStyle}>
         {result.type === 'success' && <Text style={styles.resultTitle}>Report Generated Successfully!</Text>}
         {result.type !== 'success' && <Text style={resultTextStyle}>{result.message}</Text>}
         {isLoading && result.type === 'loading' && (
           <ActivityIndicator size="small" color="#656d76" style={{ marginTop: 10 }} />
         )}
         {result.type === 'success' && result.data && (
           <>
             <TouchableOpacity onPress={() => navigateToEditorFromUrl(result.data?.editorUrl)}>
               <Text style={styles.link}>Edit Report &rarr;</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => navigateToWebViewer(result.data?.viewerUrl)}>
               <Text style={styles.link}>View Report &rarr;</Text>
             </TouchableOpacity>
           </>
         )}
       </View>
     );
   }

  // Helper function to extract reportKey from URL and navigate
  function navigateToEditorFromUrl(url: string | undefined) {
      if (!url) {
          Alert.alert("Navigation Error", "Could not get report URL.");
          return;
      }
      try {
          // Attempt to parse the URL and extract the 'key' query parameter
          const parsedUrl = new URL(url);
          const reportKey = parsedUrl.searchParams.get('key');

          if (reportKey) {
              console.log(`Navigating to ReportEditor with extracted key: ${reportKey}`);
              // Fix: Navigate to the correct stack and screen
              navigation.navigate('BrowseTab', { 
                screen: 'ReportEditor', 
                params: { reportKey: reportKey }
              });
          } else {
              throw new Error("'key' parameter not found in URL");
          }
      } catch (error) {
          console.error("Error extracting report key from URL:", error);
          Alert.alert(
              "Navigation Error",
              `Could not determine the report key from the URL. Please check the URL format or try browsing for the report.\nURL: ${url}`,
              [{ text: "Open Web Link Instead", onPress: () => Linking.openURL(url) }, { text: "OK" } ]
          );
      }
  }

  // Helper function to navigate to WebViewer
  function navigateToWebViewer(url: string | undefined) {
      if (!url) {
          Alert.alert("Navigation Error", "Could not get report URL to view.");
          return;
      }
      console.log(`Navigating to WebViewer with URL: ${url}`);
      // Fix: Navigate to the correct stack and screen
      navigation.navigate('BrowseTab', { 
        screen: 'WebViewer', 
        params: { url: url }
      });
      // No need for complex parsing or fallback to Linking here
  }

  // Helper function to render loading indicators for pickers
  const renderPickerLoading = (type: LoadingState) => {
      if (loadingState === type) {
          return (
              <View style={styles.pickerLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.pickerLoadingText}>Loading {type}...</Text>
              </View>
          );
      }
      return null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
       <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
            {/* Placeholder for Header - Implement or remove as needed */}
            {/* <View style={styles.headerPlaceholder}><Text>Header Goes Here</Text></View> */}

            <Text style={styles.title}>Daily Report Generator</Text>
            <Text style={styles.description}>
                Select the customer and project, then upload or record a video walkthrough to automatically generate a daily construction report.
            </Text>

            {/* --- Customer and Project Pickers --- */} 
            <View style={styles.pickerContainer}>
                {pickerError && <Text style={styles.errorText}>{pickerError}</Text>}
                
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
                     {renderPickerLoading('customers')}
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
                     {renderPickerLoading('projects')}
                </View>
            </View>

            {/* --- Video Upload Area --- */} 
            <View style={styles.uploadArea}>
                <TouchableOpacity
                  style={[styles.button, styles.selectButton, isLoading && styles.buttonDisabled]}
                  onPress={pickDocument}
                  disabled={isLoading}
                >
                    <Text style={[styles.buttonText, styles.selectButtonText, isLoading && styles.buttonTextDisabled]}>
                        {selectedFile ? 'Change Video File' : 'Select Video File'}
                    </Text>
                </TouchableOpacity>

                {selectedFile && (
                    <Text style={styles.selectedFileName}>
                        Selected: {selectedFile.name.substring(0, 35)}{selectedFile.name.length > 35 ? '...' : ''}
                    </Text>
                )}

                {/* Generate Report Button - Disable if no customer/project/file or if loading */} 
                <TouchableOpacity
                    style={[
                        styles.button,
                        (!selectedFile || !selectedCustomer || !selectedProject || isLoading) && styles.buttonDisabled
                    ]}
                    onPress={handleUpload}
                    disabled={!selectedFile || !selectedCustomer || !selectedProject || isLoading}
                >
                    <Text style={[
                        styles.buttonText,
                        (!selectedFile || !selectedCustomer || !selectedProject || isLoading) && styles.buttonTextDisabled
                    ]}>
                        Generate Report
                    </Text>
                </TouchableOpacity>
            </View>

            {renderResultArea()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // Use screen background color
  },
  scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center', // Center content vertically for a cleaner look
      alignItems: 'center',
      padding: spacing.lg, // Consistent padding
  },
  container: {
    maxWidth: 600,
    width: '100%',
    backgroundColor: colors.surface, // Card background
    padding: spacing.xl, // Generous padding inside the card
    borderWidth: 0, // Remove border for a flatter look
    // borderColor: colors.border, // Use theme token - REMOVED
    borderRadius: borders.radiusLarge, // More rounded corners
    alignItems: 'center',
    marginBottom: spacing.lg,
    // Add subtle shadow for depth
    // shadowColor: colors.textPrimary, // Use a dark color for shadow - DEPRECATED
    // shadowOffset: { width: 0, height: 4 }, // DEPRECATED
    // shadowOpacity: 0.1, // DEPRECATED
    // shadowRadius: 10, // DEPRECATED
    boxShadow: `0px 4px 10px rgba(0, 0, 0, 0.1)`, // Modern web shadow
    elevation: 5, // Keep for Android
  },
  // headerPlaceholder: { // Example style if you add a header
  //   height: 50,
  //   width: '100%',
  //   backgroundColor: '#f0f0f0',
  //   marginBottom: 20,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  title: {
    fontSize: typography.fontSizeXXL, // Use theme token (Largest)
    fontWeight: typography.fontWeightBold as '600',
    color: colors.textPrimary,
    marginBottom: spacing.md, // More space below title
    textAlign: 'center',
    lineHeight: typography.lineHeightXXL, // Use corresponding line height
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeM,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: typography.lineHeightM, // Use theme token (CORRECTED)
  },
  uploadArea: {
    marginBottom: spacing.xl,
    padding: spacing.xl, // Increase padding for a better dropzone feel
    width: '100%',
    borderWidth: borders.widthMedium, // Slightly thicker border
    borderStyle: 'dashed',
    borderColor: colors.border, // Use theme token
    borderRadius: borders.radiusMedium, // Standard rounding
    backgroundColor: colors.background, // Use screen background color for contrast
    alignItems: 'center',
  },
  // Button - Primary Action (Generate)
  button: {
    paddingVertical: spacing.md, // Taller button
    paddingHorizontal: spacing.xl,
    borderRadius: borders.radiusMedium,
    backgroundColor: colors.primary, // Use primary color
    width: '100%', // Make buttons full width within their container
    alignItems: 'center',
    marginBottom: spacing.md, // Space below each button
  },
  // Button - Secondary Action (Select File)
  selectButton: {
    backgroundColor: colors.surface, // White background
    borderColor: colors.border, // Border color
    borderWidth: borders.widthThin, // Thin border
  },
  buttonText: {
    color: colors.textOnPrimary, // White text for primary button
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightMedium as '500',
    textAlign: 'center',
  },
  selectButtonText: {
    color: colors.primary, // Primary color text for secondary button
  },
  buttonDisabled: {
    backgroundColor: colors.background, // Use a disabled background color
    borderColor: colors.border, // Keep border for select button
    // Optionally change text color for disabled state
    // color: colors.textDisabled,
  },
  buttonTextDisabled: {
    color: colors.textDisabled, // Greyed out text when disabled
  },
  resultsAreaBase: {
    marginTop: spacing.xl,
    width: '100%',
    padding: spacing.md,
    borderRadius: borders.radiusMedium,
    borderWidth: borders.widthThin,
    // Common styles for all result types
  },
   resultsLoading: {
      backgroundColor: colors.warningBg,
      borderColor: colors.warningBorder,
      alignItems: 'center',
   },
   resultsSuccess: {
      backgroundColor: colors.successBg,
      borderColor: colors.successBorder,
      alignItems: 'flex-start', // Align items left for success state
   },
   resultsError: {
      backgroundColor: colors.errorBg,
      borderColor: colors.errorBorder,
      alignItems: 'flex-start', // Align items left for error state
   },
   resultTextBase: {
      fontSize: typography.fontSizeM,
      lineHeight: typography.lineHeightM,
      marginBottom: spacing.sm, // Space below message text
   },
   resultTextLoading: {
      color: colors.warningText, // Use theme token
      textAlign: 'center',
   },
   resultTextSuccess: {
      color: colors.successText,
   },
   resultTextError: {
      color: colors.errorText, // Use theme token (CORRECTED)
      fontWeight: typography.fontWeightMedium as '500', // Medium weight for error text
   },
   resultTitle: { // For success message header
      fontSize: typography.fontSizeL,
      fontWeight: typography.fontWeightBold as '600',
      color: colors.successText,
      marginBottom: spacing.sm,
   },
   link: {
       marginTop: spacing.xs, // Less margin top
       color: colors.primaryDarker,
       fontWeight: typography.fontWeightMedium as '500',
       fontSize: typography.fontSizeM,
       textDecorationLine: 'underline',
   },
   selectedFileName: { // Style for the selected file name text
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pickerContainer: { // Container for the pickers
     width: '100%',
     marginBottom: spacing.lg,
     paddingHorizontal: spacing.md, // Add some horizontal padding if needed
   },
   controlGroup: { // Grouping label and picker
     marginBottom: spacing.md,
   },
   label: { // Style for Picker labels
     fontSize: typography.fontSizeM,
     fontWeight: typography.fontWeightMedium as '500',
     color: colors.textPrimary,
     marginBottom: spacing.xs,
   },
   pickerWrapper: { // Wrapper to style the Picker border
       borderWidth: borders.widthThin,
       borderColor: colors.borderLight,
       borderRadius: borders.radiusSmall,
       backgroundColor: colors.surface,
       overflow: 'hidden', // Needed for borderRadius on Android
   },
   pickerWrapperDisabled: {
       backgroundColor: colors.background, // Visually indicate disabled state
       opacity: 0.6,
   },
   picker: {
       // Default picker styles are often sufficient
       // On iOS, height might need adjustment if items are cut off
       height: Platform.OS === 'ios' ? 180 : 50, // Adjusted iOS height for better visibility
   },
   pickerLoadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xs,
   },
   pickerLoadingText: {
      marginLeft: spacing.xs,
      fontSize: typography.fontSizeXS,
      color: colors.textSecondary,
   },
   errorText: { // Error text for picker loading issues
      color: colors.error, 
      fontSize: typography.fontSizeS,
      textAlign: 'center',
      marginBottom: spacing.sm,
      fontWeight: typography.fontWeightMedium as '500',
   },
}); 