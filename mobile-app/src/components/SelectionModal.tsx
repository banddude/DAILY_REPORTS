import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent background
    justifyContent: 'flex-end', // Position modal at the bottom
  },
  safeAreaContainer: {
      backgroundColor: colors.background, // Background for the modal content area
      borderTopLeftRadius: borders.radiusLarge, // Rounded top corners
      borderTopRightRadius: borders.radiusLarge,
      maxHeight: deviceHeight * 0.75, // Limit height to 75% of screen
      paddingBottom: Platform.OS === 'ios' ? 0 : spacing.md, // Adjust padding for safe area view behavior
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
  }
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

  // Reset search when modal closes or data changes
  React.useEffect(() => {
      if (!isVisible) {
          setSearchQuery('');
      }
  }, [isVisible]);

  // Handle selection
  const handleSelectItem = (item: string) => {
    onSelect(item);
    onClose(); // Close modal after selection
  };

  // Render item in the list
  const renderItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.rowContainer}
      onPress={() => handleSelectItem(item)}
    >
      <Text style={styles.rowText}>{item}</Text>
      {item === currentSelection && (
         <Ionicons
           name="checkmark-circle"
           size={22}
           color={colors.primary}
           style={styles.checkmarkIcon}
          />
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

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose} // For Android back button
    >
      {/* Semi-transparent overlay */}
      <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose} // Close when tapping overlay
      />

      {/* Actual Modal Content Area */}
      <SafeAreaView style={styles.safeAreaContainer} edges={['bottom', 'left', 'right']}>
        <View style={styles.modalContent}>
            {/* Header with Title and Close Button */}
            <View style={styles.headerContainer}>
                <Text style={styles.titleText}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Loading Indicator or List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
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
                />
            )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default SelectionModal; 