import { Box, Pressable, Text } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { ChevronRight, ImageOff, MoreHorizontal, Reply, Star } from 'lucide-react-native';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Text as NativeText,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { applyOpacity } from '../../config/theme';
import { springConfig } from '../../config/theme/animations';
import { useAppTheme } from '../../hooks';
import { isAppStorageUrl } from '../../services/chatMedia';
import { useAppSelector } from '../../state';
import {
  MessageAttachment,
  MessageAudio,
  MessageImage,
  MessageReply,
  MessageStatus,
} from '../../types';
import { attachmentRoute, dayLabel, isWebLink, splitLinks, timeLabel } from '../../utils/chat';
import { selectionFeedback } from '../../utils/haptics';
import { VoiceNotePlayer } from '../VoiceNote';

// Within a day, a gap this long gets a small time label
const TIME_LABEL_GAP_MS = 15 * 60 * 1000;
// Photos take at most this share of the screen width
const IMAGE_MAX_WIDTH_RATIO = 0.7;
const IMAGE_MAX_WIDTH = 320;
// Very tall or wide photos are cropped to this aspect range in the bubble
const IMAGE_MIN_RATIO = 0.5;
const IMAGE_MAX_RATIO = 1.5;
// Two taps this close together count as a double tap
const DOUBLE_TAP_MS = 300;
// Swipe this far (right to reply, left for options); the bubble resists past it
const SWIPE_ACTION_AT = 60;
const SWIPE_MAX = 90;

const ATTACHMENT_LABELS: Record<MessageAttachment['kind'], string> = {
  countdown: 'Countdown',
  wishlist: 'Wishlist',
  favorite: 'Favorite',
  place: 'Place',
  milestone: 'Milestone',
  journal: 'Journal',
};

interface MessageType {
  timestamp: number;
  lastMessageTimestamp?: number;
  message: string;
  uid: string;
  index: number;
  onLongPress?: () => void;
  replyingTo?: MessageReply;
  onReplyPress?: (messageId: string | number) => void;
  partnerName?: string;
  status?: MessageStatus;
  onRetry?: () => void;
  seen?: boolean;
  reactions?: Record<string, string>;
  onDoubleTap?: () => void;
  onSwipeReply?: () => void;
  attachment?: MessageAttachment;
  image?: MessageImage;
  audio?: MessageAudio;
  // This device's file while a photo or voice note uploads
  localUri?: string;
  onImagePress?: (uri: string) => void;
  editedAt?: number;
  starred?: boolean;
}

// Height over width, from untrusted message fields; square if they're unusable
const imageRatio = (image: MessageImage) => {
  const { width, height } = image;
  if (!(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)) return 1;
  return Math.min(Math.max(height / width, IMAGE_MIN_RATIO), IMAGE_MAX_RATIO);
};

// Re-checked at the tap: only http(s) ever reaches the OS
const openLink = (url: string) => {
  if (isWebLink(url)) Linking.openURL(url).catch(() => {});
};

export const Message = ({
  index,
  lastMessageTimestamp,
  message,
  timestamp,
  uid,
  onLongPress,
  replyingTo,
  onReplyPress,
  partnerName,
  status,
  onRetry,
  seen,
  reactions,
  onDoubleTap,
  onSwipeReply,
  attachment,
  image,
  audio,
  localUri,
  onImagePress,
  editedAt,
  starred,
}: MessageType) => {
  const user = useAppSelector((state) => state.user);
  const { theme } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();

  // A divider when the day changes, and a time label for it or a long pause
  const isNewDay =
    index === 0 ||
    lastMessageTimestamp === undefined ||
    new Date(timestamp).toDateString() !== new Date(lastMessageTimestamp).toDateString();
  const showTimeLabel =
    isNewDay ||
    (lastMessageTimestamp !== undefined && timestamp - lastMessageTimestamp >= TIME_LABEL_GAP_MS);

  // Photos and voice notes only load from this app's Storage (or this phone)
  const imageUri = image ? (localUri ?? (isAppStorageUrl(image.url) ? image.url : null)) : null;
  // The bubble only needs the small thumbnail; the viewer opens the full image
  const bubbleImageUri =
    image && !localUri && image.thumbUrl && isAppStorageUrl(image.thumbUrl)
      ? image.thumbUrl
      : imageUri;
  const audioUri = audio ? (localUri ?? (isAppStorageUrl(audio.url) ? audio.url : null)) : null;
  const imageWidth = Math.min(windowWidth * IMAGE_MAX_WIDTH_RATIO, IMAGE_MAX_WIDTH);
  const imageHeight = image ? imageWidth * imageRatio(image) : 0;
  const edited = typeof editedAt === 'number';

  const isOwnMessage = uid === user?.uid;
  const onColor = isOwnMessage ? theme.colors.onPrimary : theme.colors.onPartner;
  const isReplyOwnMessage = replyingTo?.uid === user?.uid;
  const attachmentTarget = attachment ? attachmentRoute(attachment) : null;
  // One chip per distinct emoji; with two people a count would only ever be 2
  const reactionEmojis = [...new Set(Object.values(reactions || {}))];

  const truncateMessage = (msg: string, maxLength: number = 50) => {
    if (msg.length <= maxLength) return msg;
    return msg.substring(0, maxLength) + '...';
  };

  const lastTapRef = useRef(0);
  const handlePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onDoubleTap?.();
    } else {
      lastTapRef.current = now;
    }
  };

  // Swipe right to reply, left for the options sheet (same as a long press).
  // The gesture only claims clearly horizontal drags, so the list still
  // scrolls; callbacks go through a ref so the gesture (which runs on the UI
  // thread) never holds a stale closure.
  const actionsRef = useRef({ onSwipeReply, onLongPress });
  actionsRef.current = { onSwipeReply, onLongPress };
  const triggerSwipeAction = (direction: number) =>
    direction > 0 ? actionsRef.current.onSwipeReply?.() : actionsRef.current.onLongPress?.();

  const canSwipeRight = !!onSwipeReply;
  const canSwipeLeft = !!onLongPress;
  const translateX = useSharedValue(0);
  // -1 or 1 once past the threshold in that direction, otherwise 0
  const passedThreshold = useSharedValue(0);
  const swipe = Gesture.Pan()
    .enabled(canSwipeRight || canSwipeLeft)
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      const direction = event.translationX >= 0 ? 1 : -1;
      const allowed = direction > 0 ? canSwipeRight : canSwipeLeft;
      const distance = allowed ? Math.abs(event.translationX) : 0;
      // Follows the finger up to the threshold, then gives only a little
      const travel =
        distance <= SWIPE_ACTION_AT
          ? distance
          : Math.min(SWIPE_ACTION_AT + (distance - SWIPE_ACTION_AT) * 0.3, SWIPE_MAX);
      translateX.value = travel * direction;

      const passed = distance >= SWIPE_ACTION_AT ? direction : 0;
      if (passed !== passedThreshold.value) {
        passedThreshold.value = passed;
        if (passed) runOnJS(selectionFeedback)();
      }
    })
    .onEnd(() => {
      if (passedThreshold.value) runOnJS(triggerSwipeAction)(passedThreshold.value);
    })
    .onFinalize(() => {
      passedThreshold.value = 0;
      translateX.value = withSpring(0, springConfig.snappy);
    });

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const replyIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_ACTION_AT], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(translateX.value, [0, SWIPE_ACTION_AT], [0.6, 1], 'clamp') }],
  }));
  const optionsIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_ACTION_AT, 0], [1, 0], 'clamp'),
    transform: [{ scale: interpolate(translateX.value, [-SWIPE_ACTION_AT, 0], [1, 0.6], 'clamp') }],
  }));

  return (
    <>
      {isNewDay && (
        <Box
          accessibilityRole="header"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[3],
            paddingTop: theme.spacing[4],
            paddingHorizontal: theme.spacing[2],
          }}>
          <Box style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}>
            {dayLabel(timestamp)}
          </Text>
          <Box style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
        </Box>
      )}
      {showTimeLabel && (
        <Box
          style={{
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing[1],
          }}>
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.textTertiary,
            }}>
            {timeLabel(timestamp)}
          </Text>
        </Box>
      )}

      <GestureDetector gesture={swipe}>
        <Animated.View>
          {/* Revealed behind the bubble as it's swiped */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: theme.spacing[2],
                top: 0,
                bottom: 0,
                justifyContent: 'center',
              },
              replyIconStyle,
            ]}>
            <Reply size={20} color={theme.colors.textSecondary} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                right: theme.spacing[2],
                top: 0,
                bottom: 0,
                justifyContent: 'center',
              },
              optionsIconStyle,
            ]}>
            <MoreHorizontal size={20} color={theme.colors.textSecondary} />
          </Animated.View>

          <Animated.View
            style={[
              {
                flexDirection: 'row',
                justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                width: '100%',
                padding: theme.spacing[2],
              },
              bubbleStyle,
            ]}>
            <Pressable
              style={{
                flexDirection: 'column',
                backgroundColor: isOwnMessage
                  ? theme.colors.messageSelf
                  : theme.colors.messagePartner,
                // Photos sit close to the bubble's edge
                padding: image ? theme.spacing[1] : theme.spacing[3],
                borderRadius: theme.radii.md,
                borderBottomLeftRadius: isOwnMessage ? theme.radii.md : 0,
                borderBottomRightRadius: isOwnMessage ? 0 : theme.radii.md,
                ...theme.shadows.sm,
                gap: theme.spacing[2],
                // Not on the server yet
                opacity: status ? 0.7 : 1,
              }}
              onPress={onDoubleTap ? handlePress : undefined}
              onLongPress={onLongPress}>
              {/* Reply Preview */}
              {replyingTo && (
                <Pressable
                  onPress={() => onReplyPress?.(replyingTo.messageId)}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    padding: theme.spacing[2],
                    borderRadius: theme.radii.sm,
                    borderLeftWidth: 3,
                    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
                  }}>
                  <Text
                    style={{
                      color: applyOpacity(onColor, 0.7),
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.semibold,
                      marginBottom: theme.spacing[1],
                    }}>
                    {isReplyOwnMessage ? 'You' : partnerName || 'Partner'}
                  </Text>
                  <Text
                    style={{
                      color: applyOpacity(onColor, 0.9),
                      fontSize: theme.fontSize.sm,
                    }}
                    numberOfLines={1}>
                    {truncateMessage(replyingTo.message)}
                  </Text>
                </Pressable>
              )}

              {/* Shared item: a snapshot card that opens the item */}
              {attachment && (
                <Pressable
                  onPress={
                    attachmentTarget ? () => router.push(attachmentTarget as never) : undefined
                  }
                  disabled={!attachmentTarget}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${ATTACHMENT_LABELS[attachment.kind]} ${attachment.title}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing[3],
                    minWidth: 200,
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    padding: theme.spacing[3],
                    borderRadius: theme.radii.sm,
                  }}>
                  {attachment.emoji && (
                    <Text style={{ fontSize: theme.fontSize['2xl'] }}>{attachment.emoji}</Text>
                  )}
                  <Box style={{ flexShrink: 1 }}>
                    <Text
                      style={{
                        color: applyOpacity(onColor, 0.7),
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                      }}>
                      {ATTACHMENT_LABELS[attachment.kind]}
                    </Text>
                    <Text
                      style={{
                        color: onColor,
                        fontSize: theme.fontSize.md,
                        fontWeight: theme.fontWeight.semibold,
                      }}
                      numberOfLines={2}>
                      {attachment.title}
                    </Text>
                    {attachment.subtitle && (
                      <Text
                        style={{ color: applyOpacity(onColor, 0.8), fontSize: theme.fontSize.sm }}
                        numberOfLines={1}>
                        {attachment.subtitle}
                      </Text>
                    )}
                  </Box>
                  {attachmentTarget && (
                    <ChevronRight size={18} color={applyOpacity(onColor, 0.7)} />
                  )}
                </Pressable>
              )}

              {/* Photo: the local file while it uploads, then the stored copy */}
              {image &&
                (imageUri ? (
                  <Pressable
                    onPress={() => onImagePress?.(imageUri)}
                    onLongPress={onLongPress}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Photo, tap to view"
                    style={{
                      width: imageWidth,
                      height: imageHeight,
                      borderRadius: theme.radii.md - 2,
                      overflow: 'hidden',
                    }}>
                    <Image
                      source={{ uri: bubbleImageUri ?? imageUri }}
                      resizeMode="cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                    {status === 'sending' && (
                      <Box
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        }}>
                        <ActivityIndicator color="#ffffff" />
                      </Box>
                    )}
                  </Pressable>
                ) : (
                  <Box
                    style={{
                      width: imageWidth,
                      height: imageWidth * 0.6,
                      borderRadius: theme.radii.md - 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: theme.spacing[1],
                      backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    }}>
                    <ImageOff size={24} color={applyOpacity(onColor, 0.7)} />
                    <Text
                      style={{ color: applyOpacity(onColor, 0.7), fontSize: theme.fontSize.xs }}>
                      Photo unavailable
                    </Text>
                  </Box>
                ))}

              {/* Voice note */}
              {audio && (
                <VoiceNotePlayer uri={audioUri} durationMs={audio.durationMs} color={onColor} />
              )}

              {/* Main Message, with tappable http(s) links */}
              {!!message && (
                <Text
                  style={{
                    color: onColor,
                    fontSize: theme.fontSize.md,
                    // A photo's caption lines up with the photo, not the edge
                    paddingHorizontal: image ? theme.spacing[2] : 0,
                    paddingBottom: image ? theme.spacing[1] : 0,
                  }}>
                  {splitLinks(message).map((part, i) =>
                    part.url ? (
                      <NativeText
                        key={i}
                        accessibilityRole="link"
                        onPress={() => openLink(part.url!)}
                        onLongPress={onLongPress}
                        style={{ color: onColor, textDecorationLine: 'underline' }}>
                        {part.text}
                      </NativeText>
                    ) : (
                      part.text
                    ),
                  )}
                </Text>
              )}

              {/* Small marks: starred by you, edited after sending */}
              {(starred || edited) && (
                <Box
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-end',
                    gap: theme.spacing[1],
                    marginTop: -theme.spacing[1],
                    paddingHorizontal: image ? theme.spacing[2] : 0,
                  }}>
                  {starred && (
                    <Star
                      size={11}
                      color={applyOpacity(onColor, 0.75)}
                      fill={applyOpacity(onColor, 0.75)}
                      accessibilityLabel="Starred"
                    />
                  )}
                  {edited && (
                    <Text style={{ color: applyOpacity(onColor, 0.7), fontSize: 11 }}>edited</Text>
                  )}
                </Box>
              )}
            </Pressable>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {reactionEmojis.length > 0 && (
        <Box
          style={{
            flexDirection: 'row',
            alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
            // Tucks up under the bubble's corner
            marginTop: -theme.spacing[3],
            marginHorizontal: theme.spacing[4],
            paddingHorizontal: theme.spacing[1],
            paddingVertical: 2,
            borderRadius: theme.radii.full,
            backgroundColor: theme.colors.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.colors.background,
          }}>
          <Text style={{ fontSize: theme.fontSize.sm }}>{reactionEmojis.join('')}</Text>
        </Box>
      )}

      {status === 'sending' && (
        <Text
          style={{
            alignSelf: 'flex-end',
            paddingHorizontal: theme.spacing[2],
            fontSize: theme.fontSize.xs,
            color: theme.colors.textTertiary,
          }}>
          Sending…
        </Text>
      )}
      {status === 'failed' && (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={{ alignSelf: 'flex-end', paddingHorizontal: theme.spacing[2] }}>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.error }}>
            Not sent · Tap to retry
          </Text>
        </Pressable>
      )}
      {seen && (
        <Text
          style={{
            alignSelf: 'flex-end',
            paddingHorizontal: theme.spacing[2],
            fontSize: theme.fontSize.xs,
            color: theme.colors.textTertiary,
          }}>
          Seen
        </Text>
      )}
    </>
  );
};
