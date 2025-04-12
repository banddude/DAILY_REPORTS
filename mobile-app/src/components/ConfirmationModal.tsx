import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders } from '../theme/theme';

// --- Props Interface ---
interface ConfirmationModalProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean; // Optional flag for destructive actions (e.g., red confirm button)
}

// Get device dimensions
const { height: deviceHeight } = Dimensions.get('window');

// --- Styles ---
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
  },
  safeAreaContainer: {
    backgroundColor: colors.background, // Background for the modal content area
    borderRadius: borders.radiusLarge, // Rounded corners
    width: '85%', // Set width relative to screen
    maxHeight: deviceHeight * 0.5, // Limit height
    overflow: 'hidden', // Keep content within rounded corners
  },
  modalContent: {
    padding: spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Center title, place close button on right
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleText: {
    fontSize: typography.fontSizeL,
    fontWeight: typography.fontWeightBold as 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    flex: 1, // Allow title to take space and center
  },
  messageText: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeightM,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Space buttons evenly
    marginTop: spacing.sm,
  },
  button: {
    flex: 1, // Make buttons take equal width
    paddingVertical: spacing.md,
    borderRadius: borders.radiusMedium,
    alignItems: 'center',
    marginHorizontal: spacing.sm, // Add space between buttons
    minHeight: 44, // Ensure touchable area
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  destructiveButton: {
    backgroundColor: colors.error, // Use error color for destructive actions
  },
  cancelButton: {
    backgroundColor: colors.surfaceAlt, // Secondary/alternative background
  },
  buttonText: {
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightBold as 'bold',
  },
  confirmButtonText: {
    color: colors.background, // White text on primary/error color
  },
  cancelButtonText: {
    color: colors.textPrimary, // Standard text color
  },
});

// --- Confirmation Modal Component ---
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isVisible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  return (
    <Modal
      animationType="fade" // Use fade for confirmation dialogs
      transparent={true}
      visible={isVisible}
      onRequestClose={onCancel} // Allow closing via back button
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeAreaContainer} edges={['bottom', 'left', 'right']}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={styles.titleText}>{title}</Text>
              {/* Optional: Add a close icon if needed, though cancel button is standard */}
              {/* <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity> */}
            </View>

            {/* Message Body */}
            <Text style={styles.messageText}>{message}</Text>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>{cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  isDestructive ? styles.destructiveButton : styles.confirmButton,
                ]}
                onPress={onConfirm}
              >
                <Text style={[styles.buttonText, styles.confirmButtonText]}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default ConfirmationModal; 