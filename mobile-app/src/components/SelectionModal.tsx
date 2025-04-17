import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders } from '../theme/theme';

// --- Props Interface ---
interface SelectionModalProps {
  isVisible: boolean;
  title: string;
  data: string[];
  currentSelection?: string;
  onSelect: (item: string) => void;
  onClose: () => void;
  isLoading?: boolean; // Optional loading state for data
}

// Get device dimensions
const { height: deviceHeight } = Dimensions.get('window');

// --- Styles ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1, // Make it fill the modal area
    // justifyContent: 'flex-end', // Keep content at the bottom
  },
  modalOverlay: {
    // Make overlay cover the entire screen behind the KAV
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  safeAreaContainer: {
      backgroundColor: colors.background, // Background for the modal content area
      borderTopLeftRadius: borders.radiusLarge, // Rounded top corners
      borderTopRightRadius: borders.radiusLarge,
      borderBottomLeftRadius: borders.radiusLarge, // Rounded bottom corners
      borderBottomRightRadius: borders.radiusLarge, // Rounded bottom corners
      // maxHeight was removed in previous step, controlled by parent now
      // Ensure paddingBottom is sufficient, especially on Android if not using edges['bottom']
      paddingBottom: Platform.OS === 'ios' ? 0 : spacing.md, 
  },
  modalContent: {
    // Content inside SafeAreaView, height adjusts
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg, // Add padding top
    paddingBottom: spacing.md,
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
  },
  titleText: {
    fontSize: typography.fontSizeL,
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    flex: 1, // Allow title to take space and center
    marginLeft: 30, // Offset for the close button space
  },
  closeButton: {
    padding: spacing.xs,
    position: 'absolute', // Position independently
    right: spacing.md, // Align to the right
    top: spacing.md, // Align to the top padding
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
  },
  searchInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borders.radiusMedium,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    minHeight: 40,
  },
  listContainer: {
    // FlatList itself doesn't need flex: 1 here, it scrolls within the modal content
  },
  rowContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: borders.widthHairline,
    borderBottomColor: colors.borderLight,
    minHeight: 48,
  },
  rowText: {
    flex: 1,
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
  },
  checkmarkIcon: {
    marginLeft: spacing.md,
  },
  emptyContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: typography.fontSizeM,
    fontStyle: 'italic',
  },
  loadingContainer: {
      paddingVertical: spacing.xl * 2,
      alignItems: 'center',
  },
  addViewContainer: {
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: borders.widthHairline,
      borderBottomColor: colors.borderLight,
      flexDirection: 'row',
      alignItems: 'center',
  },
  inlineInput: {
      flex: 1,
      color: colors.textPrimary,
      paddingHorizontal: 0,
      paddingVertical: 0,
      fontSize: typography.fontSizeM,
      marginRight: spacing.md,
  },
  addButtonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  inlineButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borders.radiusMedium,
      marginLeft: spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
  },
  cancelButton: {
      padding: spacing.sm,
  },
  saveButton: {
      backgroundColor: colors.primary,
      minWidth: 50,
  },
  inlineButtonText: {
      fontSize: typography.fontSizeS,
      fontWeight: typography.fontWeightBold as 'bold',
      color: colors.textSecondary,
  },
  saveButtonText: {
      color: colors.background,
      fontSize: typography.fontSizeM,
  },
});

// --- Selection Modal Component ---
const SelectionModal: React.FC<SelectionModalProps> = ({
  isVisible,
  title,
  data = [],
  currentSelection,
  onSelect,
  onClose,
  isLoading = false, // Default isLoading to false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) {
      return data;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return data.filter((item: string) =>
      typeof item === 'string' && item.toLowerCase().includes(lowerCaseQuery)
    );
  }, [data, searchQuery]);

  // Reset search when modal becomes hidden or data changes
  // Parent controls visibility now, but reset logic is still useful
  useEffect(() => {
    if (!isVisible) {
      setSearchQuery('');
      setIsAdding(false);
      setNewItemName('');
    }
  }, [isVisible]);

  const handleSelectItem = (item: string, index: number) => {
    // Check if the selected item is the FIRST item in the data array
    if (index === 0) { 
        console.log("Add New Item selected (first item), switching to input mode.");
        setIsAdding(true); // Enter inline add mode
    } else {
        onSelect(item); // Call original onSelect for existing items
    }
  };

  const handleSaveNewItem = () => {
      const nameToSave = newItemName.trim();
      if (!nameToSave) {
          Alert.alert('Input Required', 'Please enter a name.');
          return;
      }
      console.log(`Saving new item from modal: ${nameToSave}`);
      onSelect(nameToSave); // Call the main onSelect handler with the new name
      // Reset state. Parent (HomeScreen) handles closing via its onSelect.
      setIsAdding(false);
      setNewItemName('');
  };

  // Render item in the list
  const renderItem = ({ item, index }: { item: string, index: number }) => (
    <TouchableOpacity
      style={styles.rowContainer}
      onPress={() => handleSelectItem(item, index)} // Pass index here
    >
      <Text
        style={[
          styles.rowText,
          item === currentSelection && { fontWeight: 'bold', color: colors.textPrimary },
          index === 0 && { color: colors.textPrimary, fontStyle: 'italic' }, // Style first item as "Add New..."
        ]}
      >
        {item}
      </Text>
      {item === currentSelection && (
        <Ionicons name="checkmark-circle" size={20} color={colors.textPrimary} />
      )}
    </TouchableOpacity>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {isLoading ? '' : (searchQuery ? 'No items match search.' : 'No items found.')}
      </Text>
    </View>
  );

  const ListHeaderComponent = () => (
      <View style={styles.searchContainer}>
          <TextInput
              style={styles.searchInput}
              placeholder={`Search ${title ? title.toLowerCase() : 'items'}...`}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
          />
      </View>
  );

  // No longer return Modal, return the content directly
  // If not visible, return null (or parent handles this)
  if (!isVisible) {
    return null;
  }

  return (
    // Removed Modal wrapper
    // Use KeyboardAvoidingView to handle keyboard overlap
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      // Style might need adjustment depending on placement in HomeScreen
      // Removing flex: 1 and justifyContent: 'flex-end' as it's now inline
      // style={styles.keyboardAvoidingContainer} 
      style={{ width: '100%' }} // Take full width within its container
    >
      {/* Removed semi-transparent overlay TouchableOpacity */}

      {/* Actual Modal Content Area - Keep SafeAreaView for bottom padding */}
      {/* Edges adjusted - top is handled by parent, keep bottom for home indicator */}
      <SafeAreaView 
        style={styles.safeAreaContainer} // REMOVED maxHeight style application here
        edges={['bottom']}
      >
        <View style={styles.modalContent}>
            {/* Header with Title and Close Button */}
            <View style={styles.headerContainer}>
                <Text style={styles.titleText}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Loading Indicator or List/Add View */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : isAdding ? (
                // Inline Add View
                <View style={styles.addViewContainer}>
                     <TextInput
                        style={styles.inlineInput}
                        placeholder={`Enter new ${title.replace('Select ', '').toLowerCase()} name`}
                        placeholderTextColor={colors.textSecondary}
                        value={newItemName}
                        onChangeText={setNewItemName}
                        autoFocus={true}
                        autoCapitalize="words"
                        returnKeyType="done"
                        onSubmitEditing={handleSaveNewItem}
                     />
                     <View style={styles.addButtonsContainer}>
                         <TouchableOpacity onPress={() => { setIsAdding(false); setNewItemName(''); }} style={styles.cancelButton}>
                             <Text style={styles.inlineButtonText}>Cancel</Text>
                         </TouchableOpacity>
                         <TouchableOpacity onPress={handleSaveNewItem} style={[styles.inlineButton, styles.saveButton]}>
                             <Text style={[styles.inlineButtonText, styles.saveButtonText]}>Save</Text>
                         </TouchableOpacity>
                     </View>
                </View>
            ) : (
                <FlatList
                    ListHeaderComponent={ListHeaderComponent}
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    ListEmptyComponent={ListEmptyComponent}
                    keyboardShouldPersistTaps="handled"
                    style={styles.listContainer}
                    // Consider adding initialNumToRender or other FlatList optimizations if lists get very long
                />
            )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
    // Removed closing </Modal>
  );
};

export default SelectionModal; 