import { ComponentProps } from 'react';
import { View } from 'react-native';
import { Modal } from '@gluestack-ui/themed';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

// Gap between the dialog and the top of the keyboard
const KEYBOARD_GAP = 16;

/**
 * Gluestack Modal that moves its dialog above the keyboard. Gluestack's own
 * avoidKeyboard never triggers on Android (its events lack startCoordinates).
 * Give tall dialogs `flexShrink: 1` and a scrolling body so they can shrink to fit.
 */
export const KeyboardAwareModal = ({ children, ...props }: ComponentProps<typeof Modal>) => {
  const keyboardHeight = useKeyboardHeight();

  return (
    <Modal {...props}>
      {children}
      {/* The Modal centers its column, so this spacer lifts the dialog clear of the keyboard */}
      <View
        pointerEvents="none"
        style={{ height: keyboardHeight ? keyboardHeight + KEYBOARD_GAP : 0 }}
      />
    </Modal>
  );
};
