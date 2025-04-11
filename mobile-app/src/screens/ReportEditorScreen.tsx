import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform, // Import Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borders } from '../theme/theme'; // <-- Add this import
import { API_BASE_URL } from '../config'; // <-- Import from config


// --- Types (Define structures based on expected report data) ---
interface CompanyInfo {
  name?: string;
  address?: {
    street?: string;
    unit?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  phone?: string;
  website?: string;
}

interface PreparedBy {
  name?: string;
  email?: string;
}

interface ReportMetadata {
  date?: string;
  preparedBy?: PreparedBy;
  companyInfo?: CompanyInfo;
}

interface ReportImage {
  fileName: string;
  caption: string;
  s3Url?: string; // Make s3Url optional as it might be constructed
}

interface MaterialItem {
  materialName: string;
  status: string;
  note: string;
}

interface IssueItem {
  description: string;
  status: 'Open' | 'Resolved' | 'Needs Monitoring';
  impact: string;
  resolution: string;
}

interface ReportData {
  reportMetadata?: ReportMetadata;
  reportAssetsS3Urls?: {
    logoUrl?: string;
    baseUrl?: string;
  };
  narrative?: string;
  workCompleted?: string[];
  issues?: IssueItem[];
  materials?: MaterialItem[];
  safetyObservations?: string;
  nextSteps?: string[];
  images?: ReportImage[];
}

// Type for navigation props (adjust based on your navigation setup)
type ReportEditorScreenProps = {
  route: {
    params: {
      reportKey: string; // Expect reportKey to be passed
    };
  };
  navigation: any; // Replace 'any' with your specific navigation type
};

// --- Configuration ---
// TODO: Move to config.ts or environment variables
// const API_BASE_URL = process.env.API_BASE_URL || 'https://localhost:3000';

// --- Component ---
export default function ReportEditorScreen({ route, navigation }: ReportEditorScreenProps): React.ReactElement {
  const { reportKey } = route.params;

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [editedData, setEditedData] = useState<ReportData | null>(null); // State to hold changes
  const [loading, setLoading] = useState<'initial' | 'saving' | 'uploading' | 'removing' | false>('initial');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [imageBaseUrl, setImageBaseUrl] = useState<string>('');

  // Fetch initial data
  useEffect(() => {
    if (!reportKey) {
      setError("Report key is missing. Cannot load report.");
      setLoading(false);
      return;
    }

    setLoading('initial');
    setError(null);
    setStatusMessage(null);

    fetch(`${API_BASE_URL}/api/report?key=${encodeURIComponent(reportKey)}`)
      .then(async response => {
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: `HTTP error! Status: ${response.status}` }));
          throw new Error(err.error || `Failed to load report. Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: ReportData) => {
        console.log("Report data loaded:", data);
        setReportData(data);
        setEditedData(JSON.parse(JSON.stringify(data))); // Initialize editedData with a deep copy
        setImageBaseUrl(data.reportAssetsS3Urls?.baseUrl || '');
      })
      .catch(err => {
        console.error('Error loading report data:', err);
        setError(`Error loading report: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reportKey]);


  // --- Edit Handlers ---

  const handleTextChange = (field: keyof ReportData, value: string) => {
    setEditedData(prev => prev ? { ...prev, [field]: value } : null);
    clearStatus();
  };

  const handleListChange = <T extends string | IssueItem | MaterialItem>(
    listField: keyof ReportData,
    index: number,
    itemField: keyof T | null, // null for simple string list items
    value: any // Can be string, or value for IssueItem/MaterialItem fields
  ) => {
    setEditedData(prev => {
      if (!prev) return null;
      const newList = [...(prev[listField] as T[] || [])];
      if (index >= 0 && index < newList.length) {
        if (itemField === null) {
          // Simple string list
          newList[index] = value as T;
        } else {
          // Object list (IssueItem or MaterialItem)
          const currentItem = { ...(newList[index] as object) }; // Clone item
          (currentItem as any)[itemField] = value;
          newList[index] = currentItem as T;
        }
      }
      return { ...prev, [listField]: newList };
    });
    clearStatus();
  };


  const addItemToList = (listField: keyof ReportData, itemType: 'simple' | 'issue' | 'material') => {
    setEditedData(prev => {
      if (!prev) return null;
      const newList = [...(prev[listField] as any[] || [])];
      let newItem: any;
      if (itemType === 'simple') {
        newItem = ''; // Add empty string for simple item
      } else if (itemType === 'issue') {
        newItem = { description: '', status: 'Open', impact: '', resolution: '' };
      } else if (itemType === 'material') {
        newItem = { materialName: '', status: '', note: '' };
      }
      newList.push(newItem);
      return { ...prev, [listField]: newList };
    });
     clearStatus();
  };

  const removeItemFromList = (listField: keyof ReportData, index: number) => {
     Alert.alert(
       "Confirm Removal",
       "Are you sure you want to remove this item?",
       [
         { text: "Cancel", style: "cancel" },
         {
           text: "Remove", style: "destructive", onPress: () => {
             setEditedData(prev => {
               if (!prev) return null;
               const newList = [...(prev[listField] as any[] || [])];
               if (index >= 0 && index < newList.length) {
                 newList.splice(index, 1);
               }
               return { ...prev, [listField]: newList };
             });
             clearStatus();
           }
         }
       ]
     );
  };


  const handleCaptionChange = (index: number, newCaption: string) => {
    setEditedData(prev => {
      if (!prev || !prev.images) return null;
      const newImages = [...prev.images];
      if (index >= 0 && index < newImages.length) {
        newImages[index] = { ...newImages[index], caption: newCaption };
      }
      return { ...prev, images: newImages };
    });
     clearStatus();
  };

  // --- Image Handling ---

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Optional: set to true to allow cropping/editing
      aspect: [4, 3], // Optional: aspect ratio for editing
      quality: 0.8, // Lower quality for faster uploads (0 to 1)
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
       handleImageUpload(result.assets[0]);
    }
  };

  const handleImageUpload = async (asset: ImagePicker.ImagePickerAsset) => {
     if (!asset.uri) return;

     setLoading('uploading');
     setStatusMessage(null);
     setError(null);

     const formData = new FormData();
     const filename = asset.uri.split('/').pop() || `upload_${Date.now()}.jpg`;
     const match = /\.(\w+)$/.exec(filename);
     const type = match ? `image/${match[1]}` : `image`;

     // Append the file correctly for React Native fetch
     formData.append('newImage', {
       uri: asset.uri,
       name: filename,
       type: asset.mimeType ?? type, // Use mimeType from picker if available
     } as any);

     try {
       const response = await fetch(`${API_BASE_URL}/api/upload-image?key=${encodeURIComponent(reportKey)}`, {
         method: 'POST',
         body: formData,
         // headers: { 'Content-Type': 'multipart/form-data' }, // Let fetch set this
       });

       const result = await response.json();

       if (!response.ok) {
         throw new Error(result.error || `Upload failed: ${response.status}`);
       }

       console.log('Upload successful:', result);
       setStatusMessage({ message: 'Image uploaded successfully!', type: 'success' });

        // Update local state with the new image list from the backend
       if (result.updatedImages && editedData) {
          setEditedData(prev => prev ? { ...prev, images: result.updatedImages } : null);
       } else {
           console.warn("Backend did not return updated image array after upload.");
           // Potentially fetch the report data again to ensure consistency
       }

     } catch (err: any) {
       console.error('Error uploading image:', err);
       setError(`Upload failed: ${err.message}`);
       setStatusMessage({ message: `Upload failed: ${err.message}`, type: 'error' });
     } finally {
       setLoading(false);
     }
   };


  const handleRemoveImage = (fileName: string) => {
     if (!editedData || !editedData.images) return;

     Alert.alert(
       "Confirm Removal",
       `Are you sure you want to remove the image reference '${fileName}' from the report? The file will remain on the server.`,
       [
         { text: "Cancel", style: "cancel" },
         {
           text: "Remove", style: "destructive", onPress: async () => {
             setLoading('removing');
             setStatusMessage(null);
             setError(null);

             try {
               const response = await fetch(`${API_BASE_URL}/api/remove-image?key=${encodeURIComponent(reportKey)}&fileName=${encodeURIComponent(fileName)}`, {
                 method: 'DELETE'
               });

               const result = await response.json();

               if (!response.ok) {
                 throw new Error(result.error || `Failed to remove image: ${response.status}`);
               }

               console.log("Image removal successful:", result);
               setStatusMessage({ message: 'Image reference removed.', type: 'success' });

               // Update local state with the new image list from the backend
               if (result.updatedImages) {
                  setEditedData(prev => prev ? { ...prev, images: result.updatedImages } : null);
               } else {
                   console.warn("Backend did not return updated image array after removal.");
                   // Fallback: Manually filter
                   setEditedData(prev => {
                       if (!prev || !prev.images) return prev;
                       return {...prev, images: prev.images.filter(img => img.fileName !== fileName)};
                   });
               }

             } catch (err: any) {
               console.error('Error removing image:', err);
               setError(`Removal failed: ${err.message}`);
               setStatusMessage({ message: `Removal failed: ${err.message}`, type: 'error' });
             } finally {
               setLoading(false);
             }
           }
         }
       ]
     );
   };


  // --- Save Changes ---
  const saveChanges = async () => {
    if (!editedData) {
      setError("No data to save.");
      return;
    }

    setLoading('saving');
    setStatusMessage(null);
    setError(null);

    console.log("Saving data:", editedData);

    try {
      const response = await fetch(`${API_BASE_URL}/api/report?key=${encodeURIComponent(reportKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `Save failed! Status: ${response.status}` }));
        throw new Error(err.error || `Save failed! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Save successful:", result);
      setReportData(JSON.parse(JSON.stringify(editedData))); // Update original data state on success
      setStatusMessage({ message: result.message || 'Report saved successfully!', type: 'success' });
      // Optionally navigate back or show confirmation
      // navigation.goBack();

    } catch (err: any) {
      console.error('Error saving report:', err);
      setError(`Error saving report: ${err.message}`);
      setStatusMessage({ message: `Error saving report: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
      // Optional: Auto-hide status message after a delay
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const clearStatus = () => {
      setStatusMessage(null);
      setError(null);
  };

  // --- Render Functions ---

  const renderMetadata = () => {
    if (!reportData || !reportData.reportMetadata) return null;
    const meta = reportData.reportMetadata;
    const company = meta.companyInfo || {};
    const prepared = meta.preparedBy || {};
    const logoUrl = reportData.reportAssetsS3Urls?.logoUrl;
    const date = meta.date || imageBaseUrl?.match(/report_(\d{4}-\d{2}-\d{2})/)?.[1] || 'N/A';

    return (
      <View style={styles.header}>
        {logoUrl && <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />}
        <Text style={styles.mainTitle}>Edit Daily Report</Text>
        <Text style={styles.metaInfo}>Date: {date}</Text>
        <Text style={styles.metaInfo}>Prepared By: {prepared.name || 'N/A'} {prepared.email ? `(${prepared.email})` : ''}</Text>
        {company.name && (
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address && (
              <Text style={styles.metaInfo}>
                {company.address.street}{company.address.unit ? ` #${company.address.unit}` : ''}
                {company.address.city || company.address.state || company.address.zip ? '\n' : ''} 
                {company.address.city}{company.address.city && company.address.state ? ', ' : ''}{company.address.state} {company.address.zip}
              </Text>
            )}
             <Text style={styles.metaInfo}>
                {company.phone ? `Phone: ${company.phone}` : ''}
                {company.phone && company.website ? ' | ' : ''}
                {company.website ? `Website: ${company.website}` : ''}
             </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEditableField = (label: string, field: keyof ReportData, placeholder: string, multiline = true) => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <TextInput
          style={[styles.editable, styles.textInput]}
          value={editedData ? String(editedData[field] || '') : ''}
          onChangeText={(text) => handleTextChange(field, text)}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline={multiline}
          editable={loading === false} // Disable during loading/saving
        />
      </View>
    );
  };

  const renderEditableList = (
     label: string,
     listField: keyof ReportData,
     itemType: 'simple' | 'issue' | 'material',
     placeholder: string
   ) => {
     const listItems = editedData ? (editedData[listField] as any[] || []) : [];

     return (
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>{label}</Text>
         {listItems.length === 0 && <Text style={styles.placeholderText}>No items added yet.</Text>}
         {listItems.map((item, index) => (
           <View key={`${listField}-${index}`} style={styles.listItem}>
             {itemType === 'simple' && (
               <TextInput
                 style={[styles.editable, styles.textInput, styles.listItemInput]}
                 value={String(item)}
                 onChangeText={(text) => handleListChange(listField, index, null, text)}
                 placeholder={placeholder}
                 placeholderTextColor="#999"
                 editable={loading === false}
                 multiline
               />
             )}
             {itemType === 'material' && (
               <View>
                 <Text style={styles.fieldLabel}>Name:</Text>
                 <TextInput
                   style={[styles.editable, styles.textInput, styles.listItemInput]}
                   value={item.materialName || ''}
                   onChangeText={(text) => handleListChange<MaterialItem>(listField, index, 'materialName', text)}
                   placeholder="Material Name"
                   placeholderTextColor="#999"
                   editable={loading === false}
                 />
                  <Text style={styles.fieldLabel}>Status:</Text>
                  <TextInput
                    style={[styles.editable, styles.textInput, styles.listItemInput]}
                    value={item.status || ''}
                    onChangeText={(text) => handleListChange<MaterialItem>(listField, index, 'status', text)}
                    placeholder="Status (e.g., Delivered, Installed)"
                    placeholderTextColor="#999"
                    editable={loading === false}
                  />
                   <Text style={styles.fieldLabel}>Note:</Text>
                   <TextInput
                     style={[styles.editable, styles.textInput, styles.listItemInput]}
                     value={item.note || ''}
                     onChangeText={(text) => handleListChange<MaterialItem>(listField, index, 'note', text)}
                     placeholder="Optional Note"
                     placeholderTextColor="#999"
                     editable={loading === false}
                     multiline
                   />
               </View>
             )}
              {itemType === 'issue' && (
                <View>
                  <Text style={styles.fieldLabel}>Description:</Text>
                  <TextInput
                    style={[styles.editable, styles.textInput, styles.listItemInput]}
                    value={item.description || ''}
                    onChangeText={(text) => handleListChange<IssueItem>(listField, index, 'description', text)}
                    placeholder="Issue Description"
                    placeholderTextColor="#999"
                    editable={loading === false}
                    multiline
                  />
                   {/* TODO: Implement a Picker for status */}
                   <Text style={styles.fieldLabel}>Status:</Text>
                   <TextInput
                       style={[styles.editable, styles.textInput, styles.listItemInput]}
                       value={item.status || 'Open'}
                       onChangeText={(text) => handleListChange<IssueItem>(listField, index, 'status', text)}
                       placeholder="Open / Resolved / Needs Monitoring"
                       placeholderTextColor="#999"
                       editable={loading === false}
                   />
                   <Text style={styles.fieldLabel}>Impact:</Text>
                   <TextInput
                     style={[styles.editable, styles.textInput, styles.listItemInput]}
                     value={item.impact || ''}
                     onChangeText={(text) => handleListChange<IssueItem>(listField, index, 'impact', text)}
                     placeholder="Impact (Optional)"
                     placeholderTextColor="#999"
                     editable={loading === false}
                     multiline
                   />
                    <Text style={styles.fieldLabel}>Resolution:</Text>
                    <TextInput
                      style={[styles.editable, styles.textInput, styles.listItemInput]}
                      value={item.resolution || ''}
                      onChangeText={(text) => handleListChange<IssueItem>(listField, index, 'resolution', text)}
                      placeholder="Resolution (Optional)"
                      placeholderTextColor="#999"
                      editable={loading === false}
                      multiline
                    />
                </View>
              )}
              <TouchableOpacity
                style={styles.removeItemButton}
                onPress={() => removeItemFromList(listField, index)}
                disabled={!!loading} // Disable button when loading
              >
                 <Text style={styles.removeItemButtonText}>&times;</Text>
              </TouchableOpacity>
           </View>
         ))}
         <TouchableOpacity
           style={styles.addItemButton}
           onPress={() => addItemToList(listField, itemType)}
           disabled={!!loading} // Disable button when loading
         >
            <Text style={styles.addItemButtonText}>+ Add {itemType === 'simple' ? 'Item' : label.slice(0,-1)}</Text>
         </TouchableOpacity>
       </View>
     );
   };

  const renderImageGallery = () => {
     const images = editedData?.images || [];
     // Function to construct full URL safely
     const getImageUrl = (img: ReportImage): string | null => {
        if (img.s3Url) return img.s3Url;
        if (imageBaseUrl && img.fileName) {
            const base = imageBaseUrl.endsWith('/') ? imageBaseUrl : imageBaseUrl + '/';
            return `${base}extracted_frames/${img.fileName}`;
        }
        return null; // Cannot determine URL
     };


     return (
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>Images</Text>
         <Text style={styles.descriptionText}>Edit captions or remove images. Add new images using the button below.</Text>
         {editedData && images.length === 0 && loading === false && (
             <Text style={styles.placeholderText}>No images currently added to the report.</Text>
         )}
         {loading === 'removing' && <ActivityIndicator style={{ marginVertical: 10 }} />}
         {images.map((img, index) => {
           const imageUrl = getImageUrl(img);
           return (
               <View key={img.fileName || index} style={styles.imageItem}>
                    {imageUrl ? (
                       <Image
                           source={{ uri: imageUrl }}
                           style={styles.imagePreview}
                           resizeMode="contain"
                       />
                    ) : (
                        <Text style={styles.errorTextSmall}>Could not load image: {img.fileName}</Text>
                    )}
                   <Text style={styles.fieldLabel}>Caption:</Text>
                   <TextInput
                       style={[styles.editable, styles.textInput, styles.captionInput]}
                       value={img.caption || ''}
                       onChangeText={(text) => handleCaptionChange(index, text)}
                       placeholder="Enter caption..."
                       placeholderTextColor="#999"
                       multiline
                       editable={loading === false}
                   />
                   <TouchableOpacity
                       style={[styles.actionButton, styles.removeButton]}
                       onPress={() => handleRemoveImage(img.fileName)}
                       disabled={!!loading}
                   >
                      <Text style={styles.actionButtonText}>Remove from Report</Text>
                   </TouchableOpacity>
               </View>
           );
         })}

          {/* Upload Section */}
         <View style={styles.uploadContainer}>
            <TouchableOpacity
                style={[styles.actionButton, styles.uploadButton]}
                onPress={pickImage}
                disabled={!!loading} // Disable while initial loading, saving, removing, or uploading
            >
                <Text style={styles.actionButtonText}>Choose & Upload Image</Text>
            </TouchableOpacity>
             {loading === 'uploading' && (
               <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                  <ActivityIndicator size="small" />
                  <Text style={{ marginLeft: 5, color: '#666' }}>Uploading...</Text>
               </View>
             )}
         </View>
       </View>
     );
   };

  // --- Main Return ---

  if (loading === 'initial') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Loading Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !reportData) { // Show fatal error if data couldn't load at all
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
              <Text style={styles.buttonText}>Go Back</Text>
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
         {renderMetadata()}

          {/* Save Button and Status */}
          <View style={styles.saveSection}>
             <TouchableOpacity
               style={[styles.button, styles.saveButton, loading !== false && styles.buttonDisabled]}
               onPress={saveChanges}
               disabled={loading !== false}
             >
                {loading === 'saving' ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.buttonText}>Save Changes</Text>
                )}
             </TouchableOpacity>
          </View>
          {statusMessage && (
             <Text style={[styles.statusText, statusMessage.type === 'success' ? styles.statusSuccess : styles.statusError]}>
               {statusMessage.message}
             </Text>
          )}
          {error && !statusMessage && <Text style={styles.statusError}>{error}</Text> }

          {/* Render editable sections only if data is loaded */}
         {editedData ? (
             <>
                {renderEditableField('Narrative', 'narrative', 'Enter narrative...', true)}
                {renderEditableList('Work Completed', 'workCompleted', 'simple', 'Describe work completed...')}
                {renderEditableList('Issues', 'issues', 'issue', 'Describe issue...')}
                {renderEditableList('Materials', 'materials', 'material', 'Material name...')}
                {renderEditableField('Safety Observations', 'safetyObservations', 'Enter safety observations...', true)}
                {renderEditableList('Next Steps', 'nextSteps', 'simple', 'Describe next step...')}
                {renderImageGallery()}
            </>
         ) : (
             <Text style={styles.placeholderText}>Report data could not be loaded or is empty.</Text> // Should not happen if error handling is correct
         )}

         {/* Add some bottom padding */}
         <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}


// --- Styles --- (Adapted from report-editor.html and general RN practices)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // Use theme token
  },
  container: {
    flex: 1,
    padding: spacing.md, // Use theme token
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg, // Use theme token
  },
  loadingText: {
    marginTop: spacing.sm, // Use theme token
    fontSize: typography.fontSizeM, // Use theme token
    color: colors.textSecondary, // Use theme token
  },
  errorText: {
    color: colors.error, // Use theme token
    fontSize: typography.fontSizeM, // Use theme token
    textAlign: 'center',
    marginBottom: spacing.md, // Use theme token
    fontWeight: typography.fontWeightBold as '600', // Use theme token and cast
  },
   errorTextSmall: {
      color: colors.error, // Use theme token
      fontSize: typography.fontSizeXS, // Use theme token
      textAlign: 'center',
      marginVertical: spacing.sm, // Use theme token
   },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg, // Use theme token
    paddingBottom: spacing.md, // Use theme token
    borderBottomWidth: borders.widthThin, // Use theme token
    borderBottomColor: colors.border, // Use theme token
  },
  logo: {
    maxHeight: 60,
    width: '60%', // Adjust width as needed
    marginBottom: spacing.md, // Use theme token
  },
  mainTitle: {
    fontSize: typography.fontSizeXL, // Use theme token (Adjusted from 22)
    fontWeight: typography.fontWeightBold as '600', // Use theme token and cast
    color: colors.textPrimary, // Use theme token
    marginBottom: spacing.xs, // Use theme token
  },
  metaInfo: {
    fontSize: typography.fontSizeXS, // Use theme token (Adjusted from 13)
    color: colors.textSecondary, // Use theme token
    textAlign: 'center',
    marginBottom: spacing.xs, // Use theme token
    lineHeight: typography.lineHeightS, // Use lineHeightS
  },
  companyInfo: {
    marginTop: spacing.sm, // Use theme token
  },
  companyName: {
      fontWeight: typography.fontWeightMedium as '500', // Use theme token and cast
      fontSize: typography.fontSizeXS, // Use theme token
      color: colors.textPrimary, // Use theme token
      textAlign: 'center',
      marginBottom: spacing.xs, // Use theme token
  },
  saveSection: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: spacing.md, // Use theme token
      marginTop: -spacing.xs, // Use theme token (Adjusted)
  },
  button: {
    paddingVertical: spacing.sm, // Use theme token (Adjusted from 10)
    paddingHorizontal: spacing.lg, // Use theme token
    borderRadius: borders.radiusMedium, // Use theme token
    backgroundColor: colors.primary, // Use theme token
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  saveButton: {
      // Specific styles if needed, uses general button style
  },
  buttonText: {
    color: colors.surface, // Use theme token (for white)
    fontSize: typography.fontSizeM, // Use theme token
    fontWeight: typography.fontWeightMedium as '500', // Use theme token and cast
  },
  buttonDisabled: {
    backgroundColor: colors.textDisabled, // Use theme token
  },
  statusText: {
      textAlign: 'center',
      marginTop: -spacing.xs, // Use theme token (Adjusted)
      marginBottom: spacing.md, // Use theme token
      paddingVertical: spacing.sm, // Use theme token
      paddingHorizontal: spacing.sm, // Use theme token
      borderRadius: borders.radiusMedium, // Use theme token
      fontWeight: typography.fontWeightMedium as '500', // Use theme token and cast
      fontSize: typography.fontSizeXS, // Use theme token
      overflow: 'hidden', // Ensure background color respects border radius
  },
  statusSuccess: {
      backgroundColor: colors.successBg, // Use theme token
      color: colors.successText, // Use theme token
      borderWidth: borders.widthThin, // Use theme token
      borderColor: colors.successBorder, // Use theme token
  },
  statusError: {
      backgroundColor: colors.errorBg, // Use theme token
      color: colors.error, // Use theme token
      borderWidth: borders.widthThin, // Use theme token
      borderColor: colors.errorBorder, // Use theme token
  },
  section: {
    marginBottom: spacing.xl, // Use theme token
    backgroundColor: colors.surface, // Use theme token
    padding: spacing.md, // Use theme token
    borderRadius: borders.radiusLarge, // Use theme token
    borderWidth: borders.widthThin, // Use theme token
    borderColor: colors.border, // Use theme token (Adjusted from #e0e0e0)
  },
  sectionTitle: {
    fontSize: typography.fontSizeL, // Use theme token (Adjusted from 18)
    fontWeight: typography.fontWeightBold as '600', // Use theme token and cast
    color: colors.textPrimary, // Use theme token
    marginBottom: spacing.md, // Use theme token
    paddingBottom: spacing.sm, // Use theme token
    borderBottomWidth: borders.widthThin, // Use theme token
    borderBottomColor: colors.border, // Use theme token (Adjusted from #eee)
  },
  descriptionText: {
      fontSize: typography.fontSizeXS, // Use theme token (Adjusted from 13)
      color: colors.textSecondary, // Use theme token
      marginBottom: spacing.md, // Use theme token
      fontStyle: 'italic',
      lineHeight: typography.lineHeightS, // Use lineHeightS
  },
  editable: {
    fontSize: typography.fontSizeS, // Use theme token
    lineHeight: typography.lineHeightS, // Use lineHeightS
  },
  textInput: {
    borderColor: colors.border, // Use theme token
    borderWidth: borders.widthThin, // Use theme token
    borderRadius: borders.radiusMedium, // Use theme token
    padding: spacing.sm, // Use theme token
    backgroundColor: colors.surface, // Use theme token
    minHeight: 50, // Minimum height for single/multi-line
    textAlignVertical: 'top', // Align text to top for multiline
  },
  listItem: {
      backgroundColor: colors.surfaceAlt, // Use theme token
      padding: spacing.sm, // Use theme token
      borderRadius: borders.radiusMedium, // Use theme token
      marginBottom: spacing.sm, // Use theme token
      borderWidth: borders.widthThin, // Use theme token
      borderColor: colors.border, // Use theme token (Adjusted from #eee)
      position: 'relative', // For absolute positioning remove button
  },
  listItemInput: {
      marginBottom: spacing.sm, // Use theme token
      minHeight: 40, // Smaller min height for list items
  },
  fieldLabel: {
      fontSize: typography.fontSizeXS, // Use theme token (Adjusted from 13)
      fontWeight: typography.fontWeightMedium as '500', // Use theme token and cast
      color: colors.textPrimary, // Use theme token (Adjusted from #444)
      marginBottom: spacing.xs, // Use theme token
  },
  removeItemButton: {
      position: 'absolute',
      top: spacing.sm, // Use theme token
      right: spacing.sm, // Use theme token
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.errorBg, // Use theme token (Approximate match)
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: borders.widthThin, // Use theme token
      borderColor: colors.errorBorder, // Use theme token (Approximate match)
  },
  removeItemButtonText: {
      color: colors.error, // Use theme token (Approximate match)
      fontSize: typography.fontSizeL, // Use theme token (Adjusted from 18)
      fontWeight: typography.fontWeightBold as '600', // Use theme token and cast
      lineHeight: typography.fontSizeL, // Adjust for vertical centering
  },
  addItemButton: {
      marginTop: spacing.sm, // Use theme token
      paddingVertical: spacing.sm, // Use theme token
      paddingHorizontal: spacing.sm, // Use theme token
      backgroundColor: colors.successBg, // Use theme token (Approximate match)
      borderRadius: borders.radiusMedium, // Use theme token
      borderWidth: borders.widthThin, // Use theme token
      borderColor: colors.successBorder, // Use theme token (Approximate match)
      alignSelf: 'flex-start', // Align button to the left
  },
  addItemButtonText: {
      color: colors.successText, // Use theme token (Approximate match)
      fontSize: typography.fontSizeXS, // Use theme token
      fontWeight: typography.fontWeightMedium as '500', // Use theme token and cast
  },
  placeholderText: {
      fontSize: typography.fontSizeXS, // Use theme token
      color: colors.textSecondary, // Use theme token
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: spacing.sm, // Use theme token
  },
  imageItem: {
      backgroundColor: colors.surfaceAlt, // Use theme token
      padding: spacing.sm, // Use theme token
      borderRadius: borders.radiusLarge, // Use theme token
      marginBottom: spacing.md, // Use theme token
      borderWidth: borders.widthThin, // Use theme token
      borderColor: colors.border, // Use theme token (Adjusted from #eee)
      alignItems: 'center', // Center image and button
  },
  imagePreview: {
      width: '100%',
      aspectRatio: 16 / 9, // Adjust aspect ratio as needed
      marginBottom: spacing.sm, // Use theme token
      borderRadius: borders.radiusMedium, // Use theme token
      backgroundColor: colors.border, // Use theme token (Placeholder background)
  },
  captionInput: {
      minHeight: 40, // Shorter caption input
      width: '100%', // Take full width
      marginTop: spacing.xs, // Use theme token
      marginBottom: spacing.sm, // Use theme token
  },
  uploadContainer: {
      marginTop: spacing.lg, // Use theme token
      paddingTop: spacing.md, // Use theme token
      borderTopWidth: borders.widthThin, // Use theme token
      borderTopColor: colors.border, // Use theme token (Adjusted from #eee)
      flexDirection: 'row',
      alignItems: 'center',
  },
  actionButton: {
      paddingVertical: spacing.sm, // Use theme token
      paddingHorizontal: spacing.md, // Use theme token
      borderRadius: borders.radiusMedium, // Use theme token
      alignSelf: 'center', // Center button in its container
      marginTop: spacing.xs, // Use theme token
  },
  actionButtonText: {
       color: colors.surface, // Use theme token (for white)
       fontSize: typography.fontSizeXS, // Use theme token
       fontWeight: typography.fontWeightMedium as '500', // Use theme token and cast
   },
  removeButton: {
      backgroundColor: colors.errorBg, // Use theme token
      borderColor: colors.errorBorder, // Use theme token
  },
  removeButtonText: { // This style seems unused as remove button uses actionButtonText style?
      color: colors.error, // Use theme token
  },
  uploadButton: {
      backgroundColor: colors.primary, // Use theme token
  },
}); 