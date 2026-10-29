import { Text } from '@gluestack-ui/themed';
import type { AudioPlayer } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { applyOpacity } from '../../config/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

// Only one voice note plays at a time: starting one pauses whichever was playing
let pauseActive: (() => void) | null = null;

// Message fields are untrusted, and early voice notes stored a broken
// duration (an expo-audio bug), so anything longer than a voice note can be
// counts as unknown: shown as --:-- until playback reports the real length.
// Generous on purpose; recording stops at 2 minutes.
const MAX_DURATION_MS = 10 * 60 * 1000;
const safeDuration = (ms: unknown) =>
  typeof ms === 'number' && Number.isFinite(ms) && ms > 0 && ms <= MAX_DURATION_MS ? ms : 0;

export const formatDuration = (ms: number) => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

interface VoiceNotePlayerProps {
  // A verified download URL or this device's own recording; null can't play
  uri: string | null;
  durationMs: number;
  color: string; // The bubble's on-color
}

/**
 * Play/pause, progress and time for a voice note. The player is only created
 * on first play, so a screen of voice notes doesn't download them all.
 */
export const VoiceNotePlayer = ({ uri, durationMs, color }: VoiceNotePlayerProps) => {
  const { theme } = useAppTheme();
  const playerRef = useRef<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [loadedDurationMs, setLoadedDurationMs] = useState(0);

  const pause = useRef(() => playerRef.current?.pause()).current;

  // FlashList reuses this for other messages, so a new uri starts fresh
  useEffect(() => {
    setPlaying(false);
    setPositionMs(0);
    setLoadedDurationMs(0);
    return () => {
      if (pauseActive === pause) pauseActive = null;
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, [uri, pause]);

  const ensurePlayer = (createAudioPlayer: typeof import('expo-audio').createAudioPlayer) => {
    if (playerRef.current || !uri) return playerRef.current;
    const player = createAudioPlayer({ uri }, { updateInterval: 200 });
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.duration > 0) setLoadedDurationMs(status.duration * 1000);
      if (status.didJustFinish) {
        // Rewind so the next tap plays from the start
        player.pause();
        player.seekTo(0).catch(() => {});
        setPositionMs(0);
        setPlaying(false);
        return;
      }
      setPositionMs(status.currentTime * 1000);
      setPlaying(status.playing);
    });
    playerRef.current = player;
    return player;
  };

  const toggle = async () => {
    if (playing) {
      playerRef.current?.pause();
      setPlaying(false);
      return;
    }
    // Loaded lazily: it's a native module, and a build made before it was
    // added would otherwise crash wherever a message bubble is imported
    let audio: typeof import('expo-audio');
    try {
      audio = await import('expo-audio');
    } catch (error) {
      console.error('Voice notes need an app update:', error);
      return;
    }
    // Plays even with the iPhone's silent switch on, like other chat apps
    await audio
      .setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false })
      .catch(() => {});
    const player = ensurePlayer(audio.createAudioPlayer);
    if (!player) return;
    if (pauseActive && pauseActive !== pause) pauseActive();
    pauseActive = pause;
    player.play();
    setPlaying(true);
  };

  const totalMs = loadedDurationMs || safeDuration(durationMs);
  const progress = totalMs > 0 ? Math.min(positionMs / totalMs, 1) : 0;

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], minWidth: 200 }}>
      <Pressable
        onPress={toggle}
        disabled={!uri}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause voice note' : 'Play voice note'}
        hitSlop={8}
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: applyOpacity(color, 0.2),
          opacity: uri ? 1 : 0.5,
        }}>
        {playing ? (
          <Pause size={18} color={color} fill={color} />
        ) : (
          <Play size={18} color={color} fill={color} style={{ marginLeft: 2 }} />
        )}
      </Pressable>
      <View style={{ flex: 1, gap: theme.spacing[1] }}>
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: applyOpacity(color, 0.25),
            overflow: 'hidden',
          }}>
          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: color }} />
        </View>
        <Text style={{ color: applyOpacity(color, 0.8), fontSize: theme.fontSize.xs }}>
          {playing || positionMs > 0
            ? formatDuration(positionMs)
            : totalMs > 0
              ? formatDuration(totalMs)
              : '--:--'}
        </Text>
      </View>
    </View>
  );
};
