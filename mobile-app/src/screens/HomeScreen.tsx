import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  Modal,
  Dimensions,
  TextInput,
  Button,
  AlertButton,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video, ResizeMode, Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useNavigation, useIsFocused, CommonActions } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import theme, { colors, spacing, typography, borders } from '../theme/theme';
import { API_BASE_URL, S3_BUCKET_NAME, AWS_REGION } from '../config';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/fetchApiHelper';
import SelectionModal from '../components/SelectionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import TipsModal from '../components/TipsModal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

// Restore constant
const ADD_NEW_CUSTOMER_OPTION = "Add New Customer...";
const ADD_NEW_PROJECT_OPTION = "Add New Project...";

// Basic type for the result object expected from the server
interface ReportResult {
  reportJsonKey: string;
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
  mimeType?: string;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { user, session, isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState<SelectedAsset | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [result, setResult] = useState<ResultState>({ message: '', type: null, data: null });
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const videoPlayerRef = useRef<Video>(null);

  // State for pickers
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>(undefined);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [fetchedCustomers, setFetchedCustomers] = useState<string[]>([ADD_NEW_CUSTOMER_OPTION]);
  const [fetchedProjects, setFetchedProjects] = useState<string[]>([]);
  const [isFetchingCustomers, setIsFetchingCustomers] = useState(false);
  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // State for Selection modal
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
      title: string;
      data: string[];
      currentSelection?: string;
      isLoading: boolean;
      onSelect: (item: string) => void;
  } | null>(null);

  // State for deletion confirmation
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'customer' | 'project', name: string } | null>(null);

  // State for tips modal
  const [isTipsModalVisible, setIsTipsModalVisible] = useState(false);

  // State for Selection modal mounting/unmounting (for animation)
  const [isSelectionModalMounted, setIsSelectionModalMounted] = useState(false);
  const selectionModalAnimation = useRef(new Animated.Value(0)).current;

  // State and animation for Tips modal
  const [isTipsModalMounted, setIsTipsModalMounted] = useState(false);
  const tipsModalAnimation = useRef(new Animated.Value(0)).current;

  // Get screen dimensions, safe area insets, and navigation header height
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');
  const navigationHeaderHeight = useHeaderHeight();

  // Log token value on every render - Use session
  console.log(`HomeScreen Render: Session is ${session ? 'present' : 'null'}. isAuthenticated: ${isAuthenticated}`);

  // Restore and adapt Fetch customers function
  const loadCustomers = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('HomeScreen Customer Effect: Not authenticated, setting defaults.');
      // Only include ADD_NEW_CUSTOMER_OPTION if not authenticated
      setFetchedCustomers([ADD_NEW_CUSTOMER_OPTION]); 
      setSelectedCustomer(undefined);
      setIsFetchingCustomers(false);
      return;
    }

    console.log('HomeScreen: Attempting to fetch customers...');
    setIsFetchingCustomers(true);
    setFetchError(null);
    const previouslySelectedCustomer = selectedCustomer;

    try {
      const fetchedData: string[] = await fetchApi('/api/browse-reports');
      console.log('HomeScreen: Successfully fetched customers from server:', fetchedData.length);

      // Merge fetched data with existing local state, keep ADD_NEW first, ensure uniqueness
      setFetchedCustomers(prevLocalCustomers => {
          const combined = [
              ADD_NEW_CUSTOMER_OPTION,
              ...fetchedData,
              // Add any from previous state that weren't fetched (locally added)
              ...prevLocalCustomers.filter(c => c !== ADD_NEW_CUSTOMER_OPTION && !fetchedData.includes(c))
          ];
          // Remove duplicates
          const uniqueCombined = combined.filter((v, i, a) => a.indexOf(v) === i);
          console.log('HomeScreen: Merged customer list:', uniqueCombined);
          return uniqueCombined;
      });

      // Check if the PREVIOUSLY selected customer is still valid in the NEW merged list
      // We need to check against the latest state after the update
      setFetchedCustomers(currentMergedCustomers => {
          if (previouslySelectedCustomer &&
              previouslySelectedCustomer !== ADD_NEW_CUSTOMER_OPTION &&
              !currentMergedCustomers.includes(previouslySelectedCustomer)) {
              console.log(`HomeScreen loadCustomers: Previously selected customer '${previouslySelectedCustomer}' no longer exists. Resetting selection.`);
              setSelectedCustomer(undefined);
              setSelectedProject(undefined);
          } else {
              console.log(`HomeScreen loadCustomers: Keeping current selection: ${previouslySelectedCustomer}`);
          }
          return currentMergedCustomers; // Return the state unchanged from this check
      });

    } catch (err: any) {
      const errorMessage = `Failed to load customers: ${err?.message || 'Unknown error'}`;
      console.error("HomeScreen Fetch customers error:", errorMessage, err);
      setFetchError(errorMessage);
      // On error, revert to just the Add New option? Or keep local ones?
      // Let's keep local ones + Add New for now
      setFetchedCustomers(prev => prev.filter(c => c !== ADD_NEW_CUSTOMER_OPTION).length > 0 
          ? [ADD_NEW_CUSTOMER_OPTION, ...prev.filter(c => c !== ADD_NEW_CUSTOMER_OPTION)]
          : [ADD_NEW_CUSTOMER_OPTION]);
      setSelectedCustomer(undefined);
      setSelectedProject(undefined);
    } finally {
      setIsFetchingCustomers(false);
    }
  // Update dependency array - use isAuthenticated
  }, [isAuthenticated, selectedCustomer]); 

  // Restore Effect to load customers on focus
  useEffect(() => {
    if (isFocused && isAuthenticated) {
       console.log("HomeScreen Focus Effect: Triggering loadCustomers.");
       loadCustomers();
    } else if (!isAuthenticated) {
      // Ensure list is reset correctly if user logs out
      setFetchedCustomers([ADD_NEW_CUSTOMER_OPTION]);
      setFetchedProjects([]);
      setSelectedCustomer(undefined);
      setSelectedProject(undefined);
      setFetchError(null);
    }
  // Update dependency array - use isAuthenticated and loadCustomers
  }, [isFocused, isAuthenticated, loadCustomers]); 

  // Fetch projects - Refactored Logic
  const loadProjects = useCallback(async () => {
    if (!selectedCustomer || !isAuthenticated) {
      setFetchedProjects([]);
      setIsFetchingProjects(false);
      return;
    }

    console.log(`HomeScreen: Triggering project fetch for customer ${selectedCustomer}.`);
    setIsFetchingProjects(true);
    setFetchError(null);
    setFetchedProjects([]);
    setSelectedProject(undefined);

    try {
      const projectsData: string[] = await fetchApi(`/api/browse-reports?customer=${encodeURIComponent(selectedCustomer)}`);
      console.log(`HomeScreen: Successfully fetched projects for ${selectedCustomer}.`, projectsData.length);
      // Ensure "Add New" option is always first
      setFetchedProjects([ADD_NEW_PROJECT_OPTION, ...projectsData.filter(p => p !== ADD_NEW_PROJECT_OPTION)]);
    } catch (err: any) {
      const errorMessage = `Failed to load projects: ${err?.message || 'Unknown error'}`;
      console.error("HomeScreen Fetch projects error:", errorMessage, err);
      setFetchError(errorMessage);
      setFetchedProjects([]);
      setSelectedProject(undefined);
    } finally {
      setIsFetchingProjects(false);
    }
  // Update dependency array - use isAuthenticated
  }, [selectedCustomer, isAuthenticated]);

  // Effect to load projects when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      loadProjects();
    } else {
      setFetchedProjects([]);
      setSelectedProject(undefined);
    }
  }, [selectedCustomer, loadProjects]);

  // Effect to generate thumbnail when selectedFile changes
  useEffect(() => {
    // Define the async function to generate the thumbnail
    const generateThumbnail = async (uri: string) => {
      setIsGeneratingThumbnail(true);
      setThumbnailUri(null); // Clear previous thumbnail immediately
      try {
        console.log(`Generating thumbnail for: ${uri}`);
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(
          uri,
          {
            time: 1000, // Generate thumbnail around the 1-second mark
            quality: 0.5 // Adjust quality if needed
          }
        );
        console.log(`Thumbnail generated: ${thumbUri}`);
        // Check if the selected file is still the same one we started generating for
        // This prevents updating state if the user selected a different file quickly
        if (selectedFile?.uri === uri) { 
            setThumbnailUri(thumbUri);
        }
      } catch (e) {
        console.warn(`Could not generate thumbnail for ${uri}:`, e);
        // Only clear thumbnail if the failed URI is the currently selected one
        if (selectedFile?.uri === uri) { 
            setThumbnailUri(null);
        }
      } finally {
        // Only stop loading indicator if the processed URI is the currently selected one
        if (selectedFile?.uri === uri) { 
            setIsGeneratingThumbnail(false);
        }
      }
    };

    if (selectedFile?.uri) {
        // --- Execute generateThumbnail asynchronously --- 
        // Start the generation but don't wait for it here.
        // Set the loading state immediately.
        setIsGeneratingThumbnail(true);
        setThumbnailUri(null); // Clear previous/stale thumbnail
        generateThumbnail(selectedFile.uri); // Fire-and-forget style
        // ---------------------------------------------
    } else {
      // If no file is selected, clear thumbnail and loading state
      setThumbnailUri(null);
      setIsGeneratingThumbnail(false);
    }

    // Optional: Cleanup function (rarely needed for file URIs)
    // return () => {
    //   if (thumbnailUri) { /* Revoke logic */ }
    // };
  }, [selectedFile]); // Re-run effect if selectedFile changes

  // Effect to configure audio mode when preview modal opens/closes
  useEffect(() => {
    const configureAudio = async (shouldPlayInBackground: boolean) => {
      try {
        console.log('Configuring audio mode for playback...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix, // Don't mix with other audio
          playsInSilentModeIOS: true, // <-- Key setting for playing audio even in silent mode
          staysActiveInBackground: shouldPlayInBackground, // If you want playback while app is backgrounded (false for modal)
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false, // Don't lower volume for notifications
          playThroughEarpieceAndroid: false, // Play through speaker
        });
        console.log('Audio mode configured.');
      } catch (e) {
        console.error('Failed to set audio mode', e);
      }
    };

    if (isPreviewModalVisible) {
      configureAudio(false); // Configure for foreground playback when modal opens
    }
    // Optional: Add logic here to reset audio mode when modal closes if needed
    // else { /* Reset audio mode */ }

  }, [isPreviewModalVisible]);

  // --- Selection Modal Animation Effect --- 
  useEffect(() => {
    if (isSelectionModalVisible) {
      setIsSelectionModalMounted(true);
      Animated.timing(selectionModalAnimation, {
        toValue: 1,
        duration: 250, 
        useNativeDriver: true, 
      }).start();
    } else {
      Animated.timing(selectionModalAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIsSelectionModalMounted(false);
      });
    }
  }, [isSelectionModalVisible, selectionModalAnimation]);

  // --- Tips Modal Animation Effect --- 
  useEffect(() => {
    if (isTipsModalVisible) {
      setIsTipsModalMounted(true);
      Animated.timing(tipsModalAnimation, {
        toValue: 1,
        duration: 250, 
        useNativeDriver: true, 
      }).start();
    } else {
      Animated.timing(tipsModalAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIsTipsModalMounted(false);
      });
    }
  }, [isTipsModalVisible, tipsModalAnimation]);

  // Modal handlers
  const openCustomerModal = () => {
    setModalConfig({
        title: 'Select Customer',
        data: fetchedCustomers, 
        currentSelection: selectedCustomer,
        isLoading: isFetchingCustomers, // Pass loading state
        onSelect: (customer) => {
            console.log(`HomeScreen onSelect called with: ${customer}`);
            // Add to list if it's a new name saved from the modal
            if (!fetchedCustomers.includes(customer)) {
                console.log(`Adding new customer ${customer} to fetchedCustomers list`);
                // Ensure ADD_NEW option stays at the start
                setFetchedCustomers(prev => [
                    ADD_NEW_CUSTOMER_OPTION,
                    // Keep existing items (excluding ADD_NEW if present)
                    ...prev.filter(c => c !== ADD_NEW_CUSTOMER_OPTION),
                    customer // Add the new one
                ].filter((v, i, a) => a.indexOf(v) === i)); // Ensure uniqueness 
            }
            // Select the customer
            if (customer !== selectedCustomer) {
                setSelectedCustomer(customer);
                setSelectedProject(undefined); 
            }
            closeModal(); 
        },
    });
    setIsSelectionModalVisible(true);
  };

  const openProjectModal = () => {
    if (!selectedCustomer) return;
    setModalConfig({
        title: 'Select Project',
        data: fetchedProjects,
        currentSelection: selectedProject,
        isLoading: isFetchingProjects,
        onSelect: (project) => {
            // REMOVED check for ADD_NEW_PROJECT_OPTION - modal handles this now
            // This runs for existing selections OR newly saved items from the modal
            console.log(`HomeScreen project onSelect called with: ${project}`);
            // Add to list if it's a new name saved from the modal
            if (!fetchedProjects.filter(p => p !== ADD_NEW_PROJECT_OPTION).includes(project)) {
                 console.log(`Adding new project ${project} to fetchedProjects list`);
                 setFetchedProjects(prev => [
                     ADD_NEW_PROJECT_OPTION, // Keep Add New first
                     // Keep existing items (excluding Add New)
                     ...prev.filter(p => p !== ADD_NEW_PROJECT_OPTION),
                     project // Add the new one
                 ].filter((v, i, a) => a.indexOf(v) === i)); // Ensure uniqueness
            }
            // Select the project
            if (project !== selectedProject) {
                setSelectedProject(project);
            }
            closeModal(); 
        },
    });
    setIsSelectionModalVisible(true);
  };

  const closeModal = () => {
    setIsSelectionModalVisible(false);
    setModalConfig(null);
  };

  // --- Helper Function to process selected asset ---
  const processSelectedAsset = (asset: ImagePicker.ImagePickerAsset | DocumentPicker.DocumentPickerAsset) => {
    console.log('Processing asset:', asset.uri);
    const isImage = asset.mimeType?.startsWith('image/');
    const isVideo = asset.mimeType?.startsWith('video/');

    // Handle type differences for name and size correctly
    const fileName = 'fileName' in asset ? asset.fileName : ('name' in asset ? asset.name : undefined);
    const fileSize = 'fileSize' in asset ? asset.fileSize : ('size' in asset ? asset.size : undefined);
    const mimeType = asset.mimeType;

    setSelectedFile({
      uri: asset.uri,
      name: fileName || `${isImage ? 'image' : isVideo ? 'video' : 'file'}_${Date.now()}.${mimeType?.split('/')[1] || 'tmp'}`,
      size: fileSize,
      mimeType: mimeType,
    });

    if (isImage) {
      setThumbnailUri(asset.uri); // Use image URI directly for thumbnail
    } else if (isVideo) {
      // Thumbnail generation for video is handled by the useEffect hook
    } else {
        Alert.alert('Unsupported File', 'Selected file is not a supported image or video.');
        setSelectedFile(null);
        setThumbnailUri(null);
    }
    setResult({ message: '', type: null, data: null }); // Clear previous result
  };

  // --- Helper for Web Desktop File Picking ---
  const pickWebDesktopFile = () => {
    console.log("Attempting to use hidden input for desktop web file picking.");
    setIsFileProcessing(true); // Indicate processing start
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*'; // Only accept video files
      input.style.display = 'none'; // Keep it hidden

      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          console.log(`Web desktop file selected: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

          // Create an object URL for the preview URI
          const objectUrl = URL.createObjectURL(file);
          // Remember to revoke this URL later if needed, e.g., in a useEffect cleanup or when file changes

          processSelectedAsset({
            uri: objectUrl, // Use object URL for local preview
            name: file.name,
            size: file.size,
            mimeType: file.type,
          });
        } else {
          console.log("Web desktop file selection cancelled or failed.");
        }
        // Clean up the input element
        document.body.removeChild(input);
        setIsFileProcessing(false); // Indicate processing end
      };

      // Append to body temporarily (needed for some browsers) and click
      document.body.appendChild(input);
      input.click();
    } catch (err) {
      console.error("Error setting up web desktop file picker:", err);
      Alert.alert('Error', 'Could not open file picker.');
      setIsFileProcessing(false); // Indicate processing end on error
    }
  };
  // --- End Helper ---

  // --- Media Source Selection ---
  const showMediaSourceOptions = () => {
    // Native options remain the same
    const options: AlertButton[] = [
      { text: 'Photo Library', onPress: () => pickMedia('library', 'video') },
      { text: 'Take Video', onPress: () => pickMedia('camera', 'video') },
      { text: 'Choose File', onPress: () => pickDocumentFile() },
      { text: 'Cancel', style: 'cancel' },
    ];

    // --- Platform Specific Logic ---
    if (Platform.OS === 'web') {
        // Basic check for desktop user agents
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        if (!isMobile) {
            console.log("Desktop web detected, using hidden input.");
            pickWebDesktopFile(); // Directly trigger desktop web picker
        } else {
            console.log("Mobile web detected, using ImagePicker.");
            pickMedia('library', 'video'); // Trigger mobile web picker
        }
    } else {
        // Native: Show the alert with options
        Alert.alert(
          'Select Video Source',
          'How would you like to select the video?',
          options,
          { cancelable: true }
        );
    }
    // --- End Platform Specific Logic ---
  };

  // --- Unified Media Picker Logic (Handles Camera/Library via ImagePicker) ---
  const pickMedia = async (source: 'camera' | 'library', type: 'video') => { // Only video type needed here now
    let hasPermission = false;
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is needed.');
          return;
      }
      hasPermission = true;
    } else { // source === 'library'
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Media Library permission is needed.');
          return;
      }
      hasPermission = true;
    }

    if (!hasPermission) return;

    setResult({ message: '', type: null, data: null });
    setThumbnailUri(null);
    setSelectedFile(null);
    setIsPreviewModalVisible(false);
    setIsFileProcessing(true);

    try {
      let result: ImagePicker.ImagePickerResult | null = null;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'videos',
          allowsEditing: false, // Editing usually not needed for video reports
        });
      } else { // source === 'library'
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'videos',
          allowsEditing: false,
        });
      }

      console.log(`${source} ${type} Picker Result:`, JSON.stringify(result, null, 2));

      if (result === null || result.canceled) {
        console.log('Media selection cancelled or failed.');
        setIsFileProcessing(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        // Use the existing helper to set state
        processSelectedAsset(result.assets[0]);
      } else {
        console.log('No assets found in picker result.');
        Alert.alert('Error', 'Failed to select media.');
        setSelectedFile(null);
        setThumbnailUri(null);
      }
    } catch (err) {
      console.error(`Error picking media (${source}/${type}):`, err);
      Alert.alert('Error', `Could not select media. ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSelectedFile(null);
      setThumbnailUri(null);
    } finally {
      setIsFileProcessing(false);
    }
  };

  // --- Document Picker Logic (Handles 'Choose File') ---
  const pickDocumentFile = async () => {
    console.log('[pickDocumentFile] Started.');
    setResult({ message: '', type: null, data: null });
    setThumbnailUri(null);
    setSelectedFile(null);
    setIsPreviewModalVisible(false);
    setIsFileProcessing(true);

    try {
      // Reset audio mode before picking if necessary (optional)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      console.log('[pickDocumentFile] Calling DocumentPicker.getDocumentAsync...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*', // Only allow video selection
        copyToCacheDirectory: false,
      });

      console.log('[pickDocumentFile] DocumentPicker Result: ', JSON.stringify(result, null, 2));

      if (result.canceled) {
        console.log('[pickDocumentFile] Document selection cancelled.');
        setIsFileProcessing(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('[pickDocumentFile] Asset found: ', JSON.stringify(asset, null, 2));
        // Basic check if it seems like a video
        if (asset.mimeType?.startsWith('video/') || asset.name?.match(/\.(mov|mp4|avi|mkv|wmv)$/i)) {
            console.log('[pickDocumentFile] Calling processSelectedAsset...');
            processSelectedAsset(asset);
            console.log('[pickDocumentFile] Returned from processSelectedAsset.');
        } else {
            console.warn('[pickDocumentFile] Selected file via DocumentPicker might not be a video:', asset.mimeType, asset.name);
            Alert.alert('Invalid File Type', 'Please select a valid video file.');
            setSelectedFile(null);
            setThumbnailUri(null);
        }
      } else {
        console.log('[pickDocumentFile] No assets found in DocumentPicker result.');
        Alert.alert('Error', 'Failed to select file.');
        setSelectedFile(null);
        setThumbnailUri(null);
      }
    } catch (err) {
      console.error('[pickDocumentFile] Error picking document:', err);
      Alert.alert('Error', `Could not pick the document. ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSelectedFile(null);
      setThumbnailUri(null);
    } finally {
      console.log('[pickDocumentFile] Finished.');
      setIsFileProcessing(false);
    }
  };

  // --- Delete Logic ---
  const handleDeleteRequest = (type: 'customer' | 'project', name: string) => {
    setItemToDelete({ type, name });
    setIsConfirmDeleteVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !isAuthenticated) {
      console.warn("Delete requested but user is not authenticated or item is missing.");
      setIsConfirmDeleteVisible(false);
      return;
    }

    const { type, name } = itemToDelete;
    console.log(`Attempting to delete ${type}: ${name}`);
    setIsConfirmDeleteVisible(false); // Close modal immediately
    setResult({ message: `Deleting ${type} '${name}'...`, type: 'loading' });

    try {
      let url = '';
      if (type === 'customer') {
        url = `${API_BASE_URL}/api/browse-reports?customer=${encodeURIComponent(name)}`;
      } else if (type === 'project' && selectedCustomer) {
        url = `${API_BASE_URL}/api/browse-reports?customer=${encodeURIComponent(selectedCustomer)}&project=${encodeURIComponent(name)}`;
      } else {
        throw new Error("Invalid deletion parameters.");
      }

      // Use updated fetchApi which handles auth, or manually add header if fetchApi wasn't updated
      // Assuming fetchApi handles auth now:
      // const response = await fetchApi(url, { method: 'DELETE' }); 
      // OR Manually add header using session:
      if (!session?.access_token) {
          console.error("Cannot delete: No access token found in session.");
          setResult({ message: 'Authentication error. Please log out and back in.', type: 'error' });
          setItemToDelete(null);
          return;
      }
      const response = await fetch(url, { // Using fetch directly, assuming fetchApi not modified for DELETE etc.
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`, // Use session token
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Failed to delete ${type}`);
      }

      console.log(`${type} '${name}' deleted successfully.`);
      setResult({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} '${name}' deleted successfully.`, type: 'success' });

      // Refresh the relevant list
      if (type === 'customer') {
        setSelectedCustomer(undefined); // Reset customer selection
        setSelectedProject(undefined);
        loadCustomers(); // Reload customer list
      } else {
        setSelectedProject(undefined); // Reset project selection
        loadProjects(); // Reload project list for the current customer
      }
      setItemToDelete(null);
    } catch (err: any) {
      console.error(`Error deleting ${type}:`, err);
      setResult({ message: `Failed to delete ${type}: ${err.message}`, type: 'error' });
      Alert.alert('Deletion Failed', `Could not delete ${type} '${name}'. ${err.message}`);
      setItemToDelete(null);
    } finally {
        // Maybe small delay before clearing message?
        // setTimeout(() => setResult({ message: '', type: null }), 3000);
    }
  };

  const handleDeleteCancel = () => {
    setIsConfirmDeleteVisible(false);
    setItemToDelete(null);
  };

  async function handleUpload() {
    console.log('Generate Report button pressed');
    if (!selectedCustomer || !selectedProject) {
      setResult({ message: 'Please select a customer and project first.', type: 'error' });
      return;
    }
    if (!selectedFile) {
      setResult({ message: 'Please select or record a video file first.', type: 'error' });
      return;
    }
    if (!isAuthenticated) {
        setResult({ message: 'Authentication error. Please log out and back in.', type: 'error' });
        return;
    }

    setIsGeneratingReport(true);
    setResult({ message: 'Generating report... ', type: 'loading', data: null });

    const formData = new FormData();
    formData.append('customer', selectedCustomer);
    formData.append('project', selectedProject);

    try {
      // --- Platform Specific File Handling --- 
      if (Platform.OS === 'web') {
         console.log('Web platform detected: Fetching blob for URI:', selectedFile.uri);
         const response = await fetch(selectedFile.uri);
         const blob = await response.blob();
         console.log(`Fetched blob: size=${blob.size}, type=${blob.type}`);
         formData.append('video', blob, selectedFile.name);
         console.log('Web: Appended blob to FormData');
      } else {
         // Native platform: append file object as before
         console.log('Native platform detected: Appending file object');
         formData.append('video', {
           uri: selectedFile.uri,
           name: selectedFile.name,
           type: selectedFile.mimeType || 'video/mp4', // Attempt to get mimeType, fallback
         } as any);
         console.log('Native: Appended file object to FormData');
      }
      // --- End Platform Specific File Handling ---

      console.log('HomeScreen handleUpload: Calling /api/generate-report');
      
      // Get token from session for manual fetch
      if (!session?.access_token) {
          console.error("Cannot upload: No access token found in session.");
          setResult({ message: 'Authentication error. Please log out and back in.', type: 'error' });
          setIsGeneratingReport(false);
          return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/generate-report`, {
        method: 'POST',
        body: formData,
        headers: {
           'Accept': 'application/json',
           // Add Authorization header manually using session token
           'Authorization': `Bearer ${session.access_token}`, 
           // Content-Type is set automatically by browser/fetch for FormData
        },
      });

      const contentType = response.headers.get('content-type');
      let responseJson: ReportResult | { error: string };
      if (contentType && contentType.indexOf('application/json') !== -1) {
          responseJson = await response.json();
      } else {
          const textResponse = await response.text();
          // Improved error message for non-JSON responses
          throw new Error(textResponse || `Server returned non-JSON response with status: ${response.status}`);
      }

      if (!response.ok) {
         const errorMessage = (responseJson as { error: string }).error || `Report generation failed: ${response.status}`;
         throw new Error(errorMessage);
      }
       const reportData = responseJson as ReportResult;
       console.log('Report generated, JSON key:', reportData.reportJsonKey);
       navigateToWebViewer(reportData.reportJsonKey); 

    } catch (error) {
      console.error('Report generation error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Provide more specific error feedback to the user
      setResult({ message: `Upload/Generation Failed: ${errorMessage}`, type: 'error', data: null });
    } finally {
      setIsGeneratingReport(false);
    }
  }

  function renderResultArea() {
    if (result.type === null || result.type === 'success') return null;

    const resultContainerStyle = [
      theme.screens.homeScreen.resultsContainerBase,
      result.type === 'loading' && theme.screens.homeScreen.resultsContainerLoading,
      result.type === 'error' && theme.screens.homeScreen.resultsContainerError,
    ];

    const resultTextStyle = [
      theme.screens.homeScreen.resultTextBase,
      result.type === 'error' && theme.screens.homeScreen.resultTextError,
      result.type === 'loading' && theme.screens.homeScreen.resultTextLoading,
    ];

    return (
      <View style={resultContainerStyle}>
        <Text style={resultTextStyle}>{result.message}</Text>
        {isGeneratingReport && result.type === 'loading' && (
          <ActivityIndicator size="small" color={colors.textSecondary} style={theme.screens.homeScreen.resultLoadingIndicator} />
        )}
      </View>
    );
  }

  function navigateToEditorFromUrl(url: string | undefined) {
    if (!url) {
        Alert.alert("Navigation Error", "Could not get report URL.");
        return;
    }
    try {
        const parsedUrl = new URL(url);
        const reportKey = parsedUrl.searchParams.get('key');

        if (reportKey) {
            console.log(`Navigating to ReportEditor with extracted key: ${reportKey}`);
            navigation.navigate('BrowseTab', {
              screen: 'ReportEditor',
              params: { reportKey: reportKey }
            });
        } else {
            throw new Error("'key' parameter not found in URL");
        }
    } catch (error) {
        console.error("Error extracting report key from URL:", error, `URL: ${url}`);
        Alert.alert(
            "Navigation Error",
            `Could not process the report URL. Please check the URL format or try browsing for the report.\n\nError: ${error instanceof Error ? error.message : 'Invalid URL'}`,
            [
                { text: "Open Web Link Instead", onPress: () => Linking.canOpenURL(url).then(supported => {
                    if (supported) { Linking.openURL(url); } else { Alert.alert("Cannot open URL", "This link cannot be opened.")}
                }) },
                { text: "OK" }
            ]
        );
    }
  }

  function navigateToWebViewer(reportJsonKey: string | undefined) {
    if (!reportJsonKey) {
        Alert.alert("Navigation Error", "Could not get report JSON key to construct viewer URL.");
        return;
    }

    // Construct the direct public S3 URL for the viewer HTML
    if (!S3_BUCKET_NAME || !AWS_REGION) {
        console.error("S3 bucket name or region is missing in config!");
        Alert.alert("Configuration Error", "Cannot construct report viewer URL.");
        return;
    }
    const reportBaseKey = reportJsonKey.substring(0, reportJsonKey.lastIndexOf('/'));
    const viewerS3Key = `${reportBaseKey}/report-viewer.html`;
    const viewerS3Url = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${viewerS3Key}`;

    console.log(`Constructed direct S3 viewer URL: ${viewerS3Url}`);

    // --- Initiate Navigation FIRST ---
    console.log(`Navigating to BrowseTab -> WebViewer with URL: ${viewerS3Url}`);
    navigation.navigate('MainAppTabs', {
      screen: 'BrowseTab',
      params: { // Navigate to WebViewer within BrowseTab
        screen: 'WebViewer',
        params: { url: viewerS3Url } // Pass the direct S3 URL
      }
    });

    // --- Reset State AFTER Navigation Call ---
    // Reset state *after* navigating away
    setSelectedFile(null);
    setThumbnailUri(null);
    setIsFileProcessing(false);
    setIsGeneratingThumbnail(false);
    setResult({ message: '', type: null, data: null }); // Clear results too

    // Extract customer and project from the URL (keep this for potential context)
    let customer: string | null = null;
    let project: string | null = null;
    try {
      const urlObj = new URL(viewerS3Url);
      const segments = urlObj.pathname.split('/').filter(Boolean);
      // users/{userId}/{customer}/{project}/{reportFolder}/report-viewer.html
      if (segments.length >= 5) {
        customer = segments[2];
        project = segments[3];
      }
    } catch (e) {
      console.warn("Could not extract customer/project from URL", e);
    }
  }

  // Debug log for button state
  console.log('Button disabled:', !selectedFile, !selectedCustomer, selectedCustomer === ADD_NEW_CUSTOMER_OPTION, !selectedProject, selectedProject === ADD_NEW_PROJECT_OPTION, isGeneratingReport);

  // Calculate max height for the SelectionModal using navigation header height
  const bottomPaddingEstimate = spacing.xxl * 2; // Estimate space needed for button + result area
  const maxModalHeight = screenHeight - navigationHeaderHeight - insets.bottom - bottomPaddingEstimate;

  return (
    <SafeAreaView style={[theme.screens.homeScreen.safeArea, styles.flexContainer]}> 
       {/* REMOVED Header Section measurement View */}
       {/* The title/description are now just regular elements within the ScrollView */}
       
       {/* Scrollable Content Area - Now contains the title/description */}
       <ScrollView
         contentContainerStyle={theme.screens.homeScreen.scrollContainer}
         keyboardShouldPersistTaps="handled"
         showsVerticalScrollIndicator={false}
         style={styles.scrollViewFlex} 
       >
            {/* Moved title/description inside ScrollView */}
            <View style={theme.screens.homeScreen.headerRow}> 
              <Text style={theme.screens.homeScreen.title}>Daily Report Generator</Text>
              <TouchableOpacity onPress={() => setIsTipsModalVisible(true)} style={theme.screens.homeScreen.tipsButton} accessibilityLabel="How to Get the Best Report">
                <Ionicons name="help-circle-outline" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={theme.screens.homeScreen.description}>
                Select customer & project, then upload or record a video walkthrough to generate a report.
            </Text>

            {/* --- Tips Modal (REMOVED OLD INLINE DEFINITION) --- */}
            {/* ------------------- */}

            <View style={theme.screens.homeScreen.sectionContainer}>
                <Text style={theme.screens.homeScreen.sectionHeaderText}>Details</Text>
                 {fetchError && <Text style={theme.screens.homeScreen.fetchErrorText}>{fetchError}</Text>}

                {/* Restore Original Customer Row */}
                <TouchableOpacity
                    style={[theme.screens.homeScreen.rowContainer, theme.screens.homeScreen.firstRowInSection]}
                    onPress={openCustomerModal}
                    disabled={isFetchingCustomers}
                >
                    <View style={theme.screens.homeScreen.rowIconContainer}>
                        <Ionicons name="business-outline" size={22} color={colors.textSecondary} />
                    </View>
                    <Text style={theme.screens.homeScreen.rowLabel}>Customer</Text>
                    <View style={theme.screens.homeScreen.rowValueContainer}>
                        <Text style={theme.screens.homeScreen.rowValueText} numberOfLines={1}>{isFetchingCustomers ? 'Loading...' : (selectedCustomer || 'Select')}</Text>
                        {isFetchingCustomers ? <ActivityIndicator size="small" color={colors.textSecondary} style={theme.screens.homeScreen.rowSpinner} /> : <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} style={theme.screens.homeScreen.rowChevron} />}
                    </View>
                </TouchableOpacity>

                {/* Project Row - Renders normally */}
                <TouchableOpacity
                    style={[theme.screens.homeScreen.rowContainer, !selectedCustomer && theme.screens.homeScreen.rowDisabled]}
                    onPress={openProjectModal}
                    disabled={!selectedCustomer || isFetchingProjects}
                >
                     <View style={theme.screens.homeScreen.rowIconContainer}>
                         <Ionicons name="folder-outline" size={22} color={!selectedCustomer ? colors.borderLight : colors.textSecondary} />
                     </View>
                    <Text style={[theme.screens.homeScreen.rowLabel, !selectedCustomer && theme.screens.homeScreen.rowLabelDisabled]}>Project</Text>
                    <View style={theme.screens.homeScreen.rowValueContainer}>
                         <Text style={[theme.screens.homeScreen.rowValueText, !selectedCustomer && theme.screens.homeScreen.rowValueDisabled]} numberOfLines={1}>{!selectedCustomer ? 'Select Customer First' : (isFetchingProjects ? 'Loading...' : (selectedProject || 'Select'))}</Text>
                        {isFetchingProjects ? <ActivityIndicator size="small" color={colors.textSecondary} style={theme.screens.homeScreen.rowSpinner} /> : <Ionicons name="chevron-forward" size={22} color={!selectedCustomer ? colors.borderLight : colors.textSecondary} style={theme.screens.homeScreen.rowChevron} />}
                    </View>
                </TouchableOpacity>
            </View>

            <View style={theme.screens.homeScreen.sectionContainer}>
                <Text style={theme.screens.homeScreen.sectionHeaderText}>MEDIA</Text>
                <TouchableOpacity
                  style={[
                    theme.screens.homeScreen.buttonBase,
                    isGeneratingReport && theme.screens.homeScreen.buttonDisabled,
                    theme.screens.homeScreen.firstRowInSection
                  ]}
                  onPress={showMediaSourceOptions}
                  disabled={isGeneratingReport || isFileProcessing}
                >
                  <View style={theme.screens.homeScreen.buttonIconContainer}>
                    {selectedFile ? (
                      <Ionicons name="checkmark-circle-outline" size={22} color="#222" />
                    ) : (
                      <Ionicons name="add-circle-outline" size={22} color="#222" />
                    )}
                  </View>
                  <Text style={[theme.screens.homeScreen.buttonTextBase, (isGeneratingReport || isFileProcessing) && theme.screens.homeScreen.buttonTextDisabled]}>
                    {/* Conditional Text */}
                    {selectedFile ? 'Change Media' : 'Choose Media'}
                  </Text>
                  <View style={theme.screens.homeScreen.buttonChevronContainer}>
                    {isFileProcessing ? <ActivityIndicator size="small" color="#888" /> : <Ionicons name="chevron-forward" size={22} color="#888" />}
                  </View>
                </TouchableOpacity>

                {/* Show preview area as soon as a file is selected */}
                {selectedFile && (
                  <View style={theme.screens.homeScreen.thumbnailPreviewWrapper}>
                    {/* Show loading indicator OR the thumbnail+play button */}
                    {isGeneratingThumbnail ? (
                      <View style={[theme.screens.homeScreen.thumbnailPreviewContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                        {/* Keep container size consistent and center loader */}
                        <ActivityIndicator size="large" color={colors.primary} />
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => setIsPreviewModalVisible(true)} disabled={!thumbnailUri} /* Disable if thumbnail failed */>
                        <View style={theme.screens.homeScreen.thumbnailPreviewContainer}>
                          {/* Display thumbnail if URI exists, otherwise maybe a placeholder */}
                          {thumbnailUri ? (
                            <Image source={{ uri: thumbnailUri }} style={theme.screens.homeScreen.thumbnailPreviewImage} />
                          ) : (
                            // Optional: Placeholder for failed thumbnail generation
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceAlt }}>
                              <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
                            </View>
                          )}
                          {/* Only show play icon if thumbnail exists */}
                          {thumbnailUri && <Ionicons name="play-circle" size={40} color="#222" style={theme.screens.homeScreen.thumbnailPlayIcon} />}
                        </View>
                      </TouchableOpacity>
                    )}
                    {/* Keep the remove button visible regardless of thumbnail state */}
                    <TouchableOpacity
                      style={theme.screens.homeScreen.thumbnailRemoveButton}
                      onPress={() => { setSelectedFile(null); setThumbnailUri(null); setResult({ message: '', type: null, data: null }); }} // Also clear result on remove
                      accessibilityLabel="Remove selected media"
                    >
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
            </View>

            {/* --- Generate Report Button --- */}
            <TouchableOpacity
                style={[
                    theme.screens.homeScreen.generateButton,
                    (!selectedFile || !selectedCustomer || selectedCustomer === ADD_NEW_CUSTOMER_OPTION || !selectedProject || selectedProject === ADD_NEW_PROJECT_OPTION || isGeneratingReport) && theme.screens.homeScreen.disabledButton,
                ]}
                onPress={handleUpload}
                // disabled={!selectedFile || !selectedCustomer || selectedCustomer === ADD_NEW_CUSTOMER_OPTION || !selectedProject || selectedProject === ADD_NEW_PROJECT_OPTION || isGeneratingReport} // TEMPORARILY REMOVED FOR DEBUGGING
            >
                {isGeneratingReport ? (
                    <ActivityIndicator color={colors.textPrimary} />
                ) : (
                    <Text style={theme.screens.homeScreen.generateButtonText}>Generate Report</Text>
                )}
            </TouchableOpacity>

            {renderResultArea()}
        </ScrollView>

       {/* --- Absolutely Positioned, Centered, Animated Selection Modal --- */} 
       {isSelectionModalMounted && modalConfig && (
         <Animated.View 
           style={[
             styles.modalAbsoluteContainer, 
             { opacity: selectionModalAnimation } 
           ]}
         >
           <Pressable
               style={styles.modalBackgroundPressable} 
               onPress={closeModal} 
           />
           <Animated.View
             style={[
               styles.modalContentWrapper, 
               {
                 transform: [ 
                   {
                     scale: selectionModalAnimation.interpolate({
                       inputRange: [0, 1],
                       outputRange: [0.85, 1], 
                     }),
                   },
                 ],
               }
             ]}
           >
             <SelectionModal
                 isVisible={isSelectionModalVisible}
                 title={modalConfig.title}
                 data={modalConfig.data}
                 currentSelection={modalConfig.currentSelection}
                 onSelect={modalConfig.onSelect}
                 onClose={closeModal}
                 isLoading={modalConfig.isLoading}
             />
            </Animated.View>
         </Animated.View>
       )}

      {/* --- Absolutely Positioned, Centered, Animated Tips Modal --- */} 
      {isTipsModalMounted && ( // Conditionally render based on mount state
         <Animated.View 
           style={[
             styles.modalAbsoluteContainer, 
             { opacity: tipsModalAnimation } // Use tips animation value
           ]}
         >
           <Pressable
               style={styles.modalBackgroundPressable} 
               onPress={() => setIsTipsModalVisible(false)} // Close tips modal
           />
           <Animated.View
             style={[
               styles.modalContentWrapper, // Use the same wrapper style for consistency
               {
                 transform: [ 
                   {
                     scale: tipsModalAnimation.interpolate({ // Use tips animation value
                       inputRange: [0, 1],
                       outputRange: [0.85, 1], 
                     }),
                   },
                 ],
               }
             ]}
           >
             <TipsModal
                 isVisible={isTipsModalVisible}
                 onClose={() => setIsTipsModalVisible(false)}
             />
            </Animated.View>
         </Animated.View>
       )}

       {/* --- Other Modals (Standard Modals - Unchanged) --- */} 
        <Modal // Preview Modal
          visible={isPreviewModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsPreviewModalVisible(false)}
        >
          <SafeAreaView style={theme.screens.homeScreen.previewModalSafeArea}>
            <View style={theme.screens.homeScreen.previewModalOverlay}>
              <View style={theme.screens.homeScreen.previewModalContent}>
                {selectedFile?.uri && (
                  <Video
                    ref={videoPlayerRef}
                    source={{ uri: selectedFile.uri }}
                    style={theme.screens.homeScreen.previewVideoPlayer}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    onError={(error) => {
                      console.error('Video playback error string:', error);
                      Alert.alert(
                        "Playback Error",
                        `Sorry, this video could not be played. It might be in an unsupported format or corrupted.\n\nError: ${error}`,
                        [{ text: "OK", onPress: () => setIsPreviewModalVisible(false) }]
                      );
                    }}
                    onFullscreenUpdate={(event) => {
                      // Optional: Handle fullscreen updates if needed
                      console.log('Fullscreen status:', event.fullscreenUpdate);
                    }}
                  />
                )}
                <TouchableOpacity
                  style={theme.screens.homeScreen.previewModalCloseButton}
                  onPress={() => setIsPreviewModalVisible(false)}
                  accessibilityLabel="Close preview"
                >
                  <Ionicons name="close" size={32} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {isGeneratingReport && (
          <View style={theme.screens.homeScreen.loadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={theme.screens.homeScreen.loadingText}>Generating report…</Text>
          </View>
        )}

        {itemToDelete && (
          <ConfirmationModal
            isVisible={isConfirmDeleteVisible}
            title={`Delete ${itemToDelete.type}?`}
            message={`Are you sure you want to delete the ${itemToDelete.type} '${itemToDelete.name}'? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            isDestructive={true}
          />
        )}
    </SafeAreaView>
  );
}

// --- Add StyleSheet definitions at the end --- 
const styles = StyleSheet.create({
  flexContainer: {
    flex: 1, // Ensure SafeAreaView takes full screen height
  },
  scrollViewFlex: {
    flex: 1, // Allows ScrollView to take remaining space
  },
  modalAbsoluteContainer: {
    position: 'absolute',
    top: 0, 
    left: 0,
    right: 0,
    bottom: 0, 
    justifyContent: 'center', // Center children vertically
    alignItems: 'center', // Center children horizontally
    // Background color moved to the Pressable background
    zIndex: 20, 
    // pointerEvents: 'box-none', // Let touches go through to children
  },
  modalBackgroundPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Overlay background
  },
  modalContentWrapper: {
    width: '90%', // Modal width relative to screen
    maxHeight: '75%', // Modal max height relative to screen
    backgroundColor: colors.background, // Need a background for the modal itself
    borderRadius: borders.radiusLarge, // Apply rounding here now
    overflow: 'hidden', // Ensure children (like list) respect the border radius
    // pointerEvents: 'auto', // Catch touches within the modal area
  },
  // REMOVED modalOverlayInline as it's replaced by modalBackgroundPressable
});

export default HomeScreen; 