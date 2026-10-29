import { useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useAppToast } from './useAppToast';
import { selectionFeedback, tapFeedback } from '../utils/haptics';

// Shorter than this is a stray tap on the mic, not a voice note
const MIN_DURATION_MS = 800;
// Long enough for a real message, short enough to upload quickly
export const MAX_VOICE_NOTE_MS = 2 * 60 * 1000;

const explainDenied = () =>
  Alert.alert(
    'Microphone access is off',
    'To send voice notes, allow Significant Other to use your microphone in Settings.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
    ],
  );

/**
 * Hold-to-record voice notes: `start` on press, `finish` on release (or with
 * cancel = true to throw the recording away). Calls `onRecorded` with the
 * local m4a file. Asks for the microphone on first use.
 */
export const useVoiceRecorder = (onRecorded: (uri: string, durationMs: number) => void) => {
  const { showToast } = useAppToast();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState(false);
  // The finger is still on the mic (start is async, release can come first)
  const holdingRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const holdTip = () =>
    showToast({ title: 'Hold to record', description: 'Release to send.', status: 'info' });

  // Back to normal playback (on iOS, recording mode routes audio to the earpiece)
  const endRecordingMode = () => setAudioModeAsync({ allowsRecording: false }).catch(() => {});

  const start = async () => {
    holdingRef.current = true;

    const permission = await getRecordingPermissionsAsync();
    if (!permission.granted) {
      // The permission dialog takes over the touch, so this press can't record
      holdingRef.current = false;
      if (permission.canAskAgain) {
        const asked = await requestRecordingPermissionsAsync();
        if (asked.granted) holdTip();
        else if (!asked.canAskAgain) explainDenied();
      } else {
        explainDenied();
      }
      return;
    }

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!holdingRef.current) {
        // Let go before recording began: that was a tap
        endRecordingMode();
        holdTip();
        return;
      }
      recorder.record();
      startedAtRef.current = Date.now();
      setRecording(true);
      tapFeedback();
    } catch (error) {
      console.error('Error starting voice note:', error);
      holdingRef.current = false;
      endRecordingMode();
      showToast({
        title: "Couldn't record",
        description: 'Something went wrong with the microphone.',
        status: 'error',
      });
    }
  };

  const finish = async (cancel = false) => {
    holdingRef.current = false;
    const startedAt = startedAtRef.current;
    if (startedAt === null) return;
    startedAtRef.current = null;
    setRecording(false);

    // The recorder's own clock, falling back to the wall clock
    const durationMs =
      recorder.currentTime > 0 ? recorder.currentTime * 1000 : Date.now() - startedAt;
    try {
      await recorder.stop();
    } catch (error) {
      console.error('Error stopping voice note:', error);
    }
    endRecordingMode();

    if (cancel) {
      selectionFeedback();
      return;
    }
    if (!recorder.uri || durationMs < MIN_DURATION_MS) {
      holdTip();
      return;
    }
    onRecordedRef.current(recorder.uri, durationMs);
  };

  const finishRef = useRef(finish);
  finishRef.current = finish;

  // Sends what's there once the limit is hit
  useEffect(() => {
    if (recording && recorderState.durationMillis >= MAX_VOICE_NOTE_MS) finishRef.current(false);
  }, [recording, recorderState.durationMillis]);

  // Leaving mid-recording throws it away. The recorder may already be released
  // by expo-audio's own cleanup, so stopping it is only attempted.
  useEffect(
    () => () => {
      if (startedAtRef.current === null) return;
      startedAtRef.current = null;
      try {
        recorder.stop().catch(() => {});
      } catch {
        // Already released
      }
      endRecordingMode();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    recording,
    elapsedMs: recording ? recorderState.durationMillis : 0,
    start,
    finish,
  };
};
