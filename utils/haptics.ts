import * as Haptics from 'expo-haptics';

// Light, fire-and-forget haptics. Failures (no vibrator, old build without the
// native module) are ignored: feedback is a nicety, never worth an error.

/** A light tap: sending, saving, toggling */
export const tapFeedback = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** A selection tick: stepping through discrete values like zoom levels */
export const selectionFeedback = () => {
  Haptics.selectionAsync().catch(() => {});
};

/** Something finished well: a save that matters */
export const successFeedback = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
