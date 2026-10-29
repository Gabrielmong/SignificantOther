import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * How much of the bottom of an edge-to-edge window the keyboard covers, 0 when hidden.
 * Android reports the keyboard height minus the nav bar, so the nav bar is added back.
 */
export const useKeyboardHeight = () => {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subscriptions = [
      Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height)),
      Keyboard.addListener(hideEvent, () => setKeyboardHeight(0)),
    ];

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  if (!keyboardHeight) return 0;

  return Platform.OS === 'android' ? keyboardHeight + insets.bottom : keyboardHeight;
};
