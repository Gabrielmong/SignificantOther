import {
  Text,
  View,
  Box,
  InputField,
  Input,
  Spinner,
  HStack,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
} from '@gluestack-ui/themed';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowDown, Check, ImagePlus, Send, Star, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  TextInput,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  ChatImageViewer,
  IconButton,
  Message,
  MessageOptionsModal,
  Skeleton,
  VoiceRecordButton,
  VoiceRecordingBar,
} from '../../../components';
import { duration, springConfig } from '../../../config/theme/animations';
import {
  useAppTheme,
  useAppToast,
  useChatMessages,
  useChatStars,
  useFirebase,
} from '../../../hooks';
// Not in the hooks index: expo-audio is a native module, and importing it
// everywhere would crash a build made before it was added at startup
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder';
import { setChatOnScreen } from '../../../services/chatPresence';
import { useAppSelector } from '../../../state';
import { MessageReply, MessageType } from '../../../types';
import { isEditableMessage, messagePreview } from '../../../utils/chat';
import { tapFeedback } from '../../../utils/haptics';
import { fadeEntering, listItemEntering, listItemExiting } from '../../../utils/motion';

// How long after a new message first renders it may still play its entrance.
// FlashList recycles cells, so without this a new message would fade in again
// every time it scrolls back into view.
const NEW_MESSAGE_WINDOW_MS = 1000;

// While typing, refresh the typing marker this often; the partner's side hides
// it if no refresh arrives within the timeout (e.g. they switched apps)
const TYPING_REFRESH_MS = 3000;
const TYPING_TIMEOUT_MS = 6000;

// Within this share of the screen from the bottom counts as "at the bottom"
// (matches the list's own autoscroll threshold)
const NEAR_BOTTOM_RATIO = 0.2;

// Bubble placeholders while the first page loads: [own message, width]
const LOADING_BUBBLES: [boolean, `${number}%`][] = [
  [false, '55%'],
  [true, '40%'],
  [false, '70%'],
  [true, '60%'],
  [false, '35%'],
];

export default function Chat() {
  const user = useAppSelector((state) => state.user);
  const room = useAppSelector((state) => state.room);
  const { showToast } = useAppToast();
  const { theme } = useAppTheme();
  const {
    getUserProfile,
    setMessageReaction,
    markChatRead,
    listenToChatReads,
    setTyping,
    listenToTyping,
  } = useFirebase();
  const roomId = user.roomId || null;
  const uid = user.uid || null;
  const {
    messages,
    statuses,
    newIds,
    loading,
    loadingOlder,
    loadOlder,
    send,
    sendImage,
    sendVoiceNote,
    localUris,
    retry,
    edit,
    remove,
  } = useChatMessages(roomId, uid);
  const { stars, toggleStar } = useChatStars(roomId, uid);
  const [reads, setReads] = useState<Record<string, number>>({});
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  const [draft, setDraft] = useState('');
  const flashListRef = useRef<FlashListRef<MessageType>>(null);
  const inputRef = useRef<TextInput>(null);
  const [messageOptionsOpen, setMessageOptionsOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<MessageType | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<MessageType | null>(null);
  // While set, the input holds this message's text and sending saves the edit
  const [editingMessage, setEditingMessage] = useState<MessageType | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
  const [partnerProfilePic, setPartnerProfilePic] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Your Partner');

  const reduceMotion = useReducedMotion();
  const sendScale = useSharedValue(1);
  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  // Only messages that arrive while the chat is open animate in
  const firstSeenRef = useRef(new Map<string, number>());
  const shouldAnimateIn = (id: string) => {
    if (!newIds.has(id)) return false;
    const now = Date.now();
    if (!firstSeenRef.current.has(id)) firstSeenRef.current.set(id, now);
    return now - firstSeenRef.current.get(id)! < NEW_MESSAGE_WINDOW_MS;
  };

  // Your own new message always scrolls into view, even when you'd scrolled up
  // (the list only follows new messages on its own when you're near the bottom)
  const scrollToOwnMessageRef = useRef(false);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (scrollToOwnMessageRef.current && last?.uid === user.uid) {
      scrollToOwnMessageRef.current = false;
      flashListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, user.uid]);

  // "New messages" pill: a partner message arriving while you're scrolled up
  // (near the bottom the list follows it on its own)
  const nearBottomRef = useRef(true);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const fromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const nearBottom = fromBottom < layoutMeasurement.height * NEAR_BOTTOM_RATIO;
    if (nearBottom !== nearBottomRef.current) {
      nearBottomRef.current = nearBottom;
      if (nearBottom) setShowNewMessagesPill(false);
    }
  };
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.uid !== uid && newIds.has(last.id) && !nearBottomRef.current) {
      setShowNewMessagesPill(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages[messages.length - 1]?.id]);

  const scrollToNewest = () => {
    tapFeedback();
    setShowNewMessagesPill(false);
    flashListRef.current?.scrollToEnd({ animated: true });
  };

  // The tab stays mounted behind other tabs, so track whether it's on screen
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setAppActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  // Lets an incoming chat push skip notifying about what you're already reading
  useEffect(() => {
    setChatOnScreen(focused && appActive);
    return () => setChatOnScreen(false);
  }, [focused, appActive]);

  // Everything up to now counts as read while the chat is actually visible;
  // re-marked as new messages arrive. Clears the tab badge and drives "Seen".
  const newestId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (focused && appActive && !loading && roomId && uid) {
      markChatRead(roomId, uid).catch((error) => console.error('Error marking chat read:', error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, appActive, loading, newestId, roomId, uid]);

  useEffect(() => {
    if (!roomId) return;
    return listenToChatReads(roomId, setReads);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // "Seen" goes under your latest message once your partner has read past it
  const lastOwnMessage = [...messages].reverse().find((m) => m.uid === uid);
  const partnerReadAt = room.partnerId ? reads[room.partnerId] : undefined;
  const seenMessageId =
    lastOwnMessage &&
    !statuses[lastOwnMessage.id] &&
    partnerReadAt !== undefined &&
    partnerReadAt >= lastOwnMessage.timestamp
      ? lastOwnMessage.id
      : null;

  // Partner typing: shown on each marker refresh, hidden if refreshes stop
  useEffect(() => {
    if (!roomId || !room.partnerId) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = listenToTyping(roomId, (typing) => {
      clearTimeout(timeout);
      const active = room.partnerId ? typing[room.partnerId] !== undefined : false;
      setPartnerTyping(active);
      if (active) timeout = setTimeout(() => setPartnerTyping(false), TYPING_TIMEOUT_MS);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, room.partnerId]);

  // Our own typing marker: written at most every few seconds while the draft
  // has text, cleared on send, on an empty draft, and when leaving the chat
  const lastTypingWriteRef = useRef(0);
  const stopTyping = () => {
    if (!lastTypingWriteRef.current || !roomId || !uid) return;
    lastTypingWriteRef.current = 0;
    setTyping(roomId, uid, false).catch(() => {});
  };
  const stopTypingRef = useRef(stopTyping);
  stopTypingRef.current = stopTyping;
  useEffect(() => {
    if (!focused) stopTypingRef.current();
  }, [focused]);
  useEffect(() => () => stopTypingRef.current(), []);

  const handleDraftChange = (text: string) => {
    setDraft(text);
    if (!roomId || !uid) return;

    if (!text.trim()) {
      stopTyping();
      return;
    }
    const now = Date.now();
    if (now - lastTypingWriteRef.current > TYPING_REFRESH_MS) {
      lastTypingWriteRef.current = now;
      setTyping(roomId, uid, true).catch(() => {});
    }
  };

  // Tapping your current reaction again removes it
  const toggleReaction = (message: MessageType, emoji: string) => {
    if (!roomId || !uid || statuses[message.id]) return;

    tapFeedback();
    const next = message.reactions?.[uid] === emoji ? null : emoji;
    setMessageReaction(roomId, message.id, uid, next).catch((error) => {
      console.error('Error reacting to message:', error);
      showToast({
        title: "Couldn't react",
        description: 'Please check your connection and try again.',
        status: 'error',
      });
    });
  };

  const handleReact = (emoji: string) => {
    if (!currentMessage) return;

    // The live list has the current reactions; the stored copy may be stale
    toggleReaction(messages.find((m) => m.id === currentMessage.id) ?? currentMessage, emoji);
    setMessageOptionsOpen(false);
  };

  const startReply = (message: MessageType) => {
    // Replying and editing share the input; switching drops the edit
    if (editingMessage) cancelEdit();
    setReplyingToMessage(message);
    // Focus the input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Load partner profile data
  useEffect(() => {
    const loadPartnerProfile = async () => {
      if (room.partnerId) {
        try {
          const profile = await getUserProfile(room.partnerId);
          if (profile) {
            setPartnerProfilePic(profile.photoURL || null);
            setPartnerName(profile.displayName || room.partnerName || 'Your Partner');
          } else {
            setPartnerName(room.partnerName || 'Your Partner');
          }
        } catch (error) {
          console.error('Error loading partner profile:', error);
          setPartnerName(room.partnerName || 'Your Partner');
        }
      }
    };

    loadPartnerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.partnerId, room.partnerName]);

  const replyPayload = (): MessageReply | undefined =>
    replyingToMessage
      ? {
          messageId: replyingToMessage.id,
          message: messagePreview(replyingToMessage),
          uid: replyingToMessage.uid,
        }
      : undefined;

  const startEdit = (message: MessageType) => {
    setReplyingToMessage(null);
    setEditingMessage(message);
    setDraft(message.message);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Puts back an empty input (the draft was the message being edited)
  function cancelEdit() {
    setEditingMessage(null);
    setDraft('');
    stopTyping();
  }

  const saveEdit = () => {
    if (!editingMessage) return;
    const text = draft.trim();
    if (!text) return;
    // Only saved when the text actually changed
    if (text !== editingMessage.message && !edit(editingMessage.id, text)) return;

    tapFeedback();
    cancelEdit();
  };

  const handleSendMessage = () => {
    if (editingMessage) {
      saveEdit();
      return;
    }

    const sent = send(draft, replyPayload());
    if (!sent) return;

    tapFeedback();
    stopTyping();
    scrollToOwnMessageRef.current = true;
    setDraft('');
    setReplyingToMessage(null);
  };

  // Library only: the app doesn't ask for the camera. The input's text goes
  // along as the photo's caption.
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled || !result.assets[0]) return;

      const { uri, width, height } = result.assets[0];
      sendImage({ uri, width, height }, draft, replyPayload());
      tapFeedback();
      stopTyping();
      scrollToOwnMessageRef.current = true;
      setDraft('');
      setReplyingToMessage(null);
    } catch (error) {
      console.error('Error picking photo:', error);
      showToast({
        title: "Couldn't open your photos",
        description: 'Please try again.',
        status: 'error',
      });
    }
  };

  const voice = useVoiceRecorder((uri, durationMs) => {
    sendVoiceNote(uri, durationMs, replyPayload());
    tapFeedback();
    scrollToOwnMessageRef.current = true;
    setReplyingToMessage(null);
  });

  const handleOpenMessageOptions = (message: MessageType) => {
    setCurrentMessage(message);
    setMessageOptionsOpen(true);
  };

  const handleCopyMessage = async () => {
    if (!currentMessage) return;

    await Clipboard.setStringAsync(messagePreview(currentMessage));

    showToast({
      title: 'Message copied',
      status: 'success',
      description: 'You can now paste the message',
    });

    setMessageOptionsOpen(false);
  };

  const handleDeleteMessage = async () => {
    if (!currentMessage) return;

    setMessageOptionsOpen(false);
    if (editingMessage?.id === currentMessage.id) cancelEdit();
    try {
      await remove(currentMessage.id);
      showToast({
        title: 'Message deleted',
        status: 'success',
        description: 'The message has been deleted',
      });
    } catch {
      // useChatMessages already told the user
    }
  };

  const handleReplyMessage = () => {
    if (!currentMessage) return;

    setMessageOptionsOpen(false);
    startReply(currentMessage);
  };

  // The live copy, so an edit starts from the current text
  const liveCurrentMessage = currentMessage
    ? (messages.find((m) => m.id === currentMessage.id) ?? currentMessage)
    : null;
  const canEditCurrent =
    !!liveCurrentMessage &&
    !statuses[liveCurrentMessage.id] &&
    isEditableMessage(liveCurrentMessage, uid);

  const handleEditMessage = () => {
    if (!liveCurrentMessage) return;

    setMessageOptionsOpen(false);
    startEdit(liveCurrentMessage);
  };

  const handleToggleStar = () => {
    if (!currentMessage) return;

    tapFeedback();
    toggleStar(currentMessage.id);
    setMessageOptionsOpen(false);
  };

  // Older replies point at the message's timestamp, newer ones at its key
  const handleScrollToMessage = (messageId: string | number) => {
    const index = messages.findIndex(
      (m) => m.id === String(messageId) || m.timestamp === Number(messageId),
    );
    if (index !== -1) {
      flashListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    } else {
      showToast({
        title: 'Older message',
        description: 'Scroll up to load older messages first.',
        status: 'info',
      });
    }
  };

  if (!user.uid || !user.roomId) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}>
        <Spinner size="large" color={theme.colors.primary} />
        <Text
          style={{
            marginTop: 16,
            fontSize: theme.fontSize.md,
            color: theme.colors.textSecondary,
          }}>
          {!user.uid ? 'Authenticating...' : 'Setting up chat...'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      }}>
      <StatusBar backgroundColor={theme.colors.background} />

      <Box
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceElevated,
          padding: theme.commonSpacing.screenPadding,
          ...theme.shadows.sm,
        }}>
        <HStack
          style={{
            alignItems: 'center',
            gap: theme.spacing[3],
            flex: 1,
          }}>
          <Avatar size="md">
            {partnerProfilePic ? (
              <AvatarImage source={{ uri: partnerProfilePic }} alt={partnerName} />
            ) : (
              <AvatarFallbackText>{partnerName}</AvatarFallbackText>
            )}
          </Avatar>
          <Box style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: theme.fontSize.xl,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text,
              }}>
              {partnerName}
            </Text>
            <Text
              style={{
                fontSize: theme.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
              Chat
            </Text>
          </Box>
        </HStack>
        <IconButton
          icon={Star}
          variant="ghost"
          onPress={() => router.push('/(tabs)/Chat/starred' as never)}
        />
      </Box>

      <Box
        style={{
          flex: 1,
          width: '100%',
          paddingHorizontal: theme.commonSpacing.screenPadding,
        }}>
        {loading ? (
          <Box style={{ flex: 1, justifyContent: 'flex-end', gap: theme.spacing[3] }}>
            {LOADING_BUBBLES.map(([own, width], i) => (
              <Skeleton
                key={i}
                width={width}
                height={44}
                style={{ alignSelf: own ? 'flex-end' : 'flex-start' }}
              />
            ))}
          </Box>
        ) : messages.length === 0 ? (
          <Box style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.md }}>
              No messages yet. Say hi to {partnerName}!
            </Text>
          </Box>
        ) : (
          <FlashList
            data={messages}
            ref={flashListRef}
            keyExtractor={(item) => item.id}
            // Chat mode: opens at the newest message, follows new ones while
            // you're near the bottom, and holds your place as older pages load
            maintainVisibleContentPosition={{
              startRenderingFromBottom: true,
              autoscrollToBottomThreshold: 0.2,
            }}
            onStartReached={loadOlder}
            onStartReachedThreshold={0.5}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            ListHeaderComponent={
              loadingOlder ? (
                <Box style={{ paddingVertical: theme.spacing[3] }}>
                  <Spinner color={theme.colors.primary} />
                </Box>
              ) : null
            }
            renderItem={({ item, index }) => {
              const isNew = newIds.has(item.id);
              // Recycled cells keep their mounted children, and entering only runs on
              // mount: keying new messages by id remounts the wrapper so it plays,
              // while older cells share one key and recycle as before.
              return (
                <Animated.View
                  key={isNew ? `new-${item.id}` : 'message'}
                  entering={shouldAnimateIn(item.id) ? listItemEntering() : undefined}>
                  <Message
                    index={index}
                    message={item.message}
                    timestamp={item.timestamp}
                    lastMessageTimestamp={index > 0 ? messages[index - 1].timestamp : undefined}
                    uid={item.uid}
                    replyingTo={item.replyingTo}
                    onLongPress={() => handleOpenMessageOptions(item)}
                    onReplyPress={handleScrollToMessage}
                    partnerName={partnerName}
                    status={statuses[item.id]}
                    onRetry={() => retry(item.id)}
                    seen={item.id === seenMessageId}
                    reactions={item.reactions}
                    attachment={item.attachment}
                    image={item.image}
                    audio={item.audio}
                    localUri={localUris[item.id]}
                    onImagePress={setViewerUri}
                    editedAt={item.editedAt}
                    starred={!!stars[item.id]}
                    onDoubleTap={() => toggleReaction(item, '❤️')}
                    onSwipeReply={statuses[item.id] ? undefined : () => startReply(item)}
                  />
                </Animated.View>
              );
            }}
          />
        )}

        {showNewMessagesPill && (
          <Animated.View
            entering={fadeEntering}
            exiting={listItemExiting}
            style={{
              position: 'absolute',
              bottom: theme.spacing[3],
              alignSelf: 'center',
            }}>
            <Pressable
              onPress={scrollToNewest}
              accessibilityRole="button"
              accessibilityLabel="New messages, scroll to the newest"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing[1],
                paddingVertical: theme.spacing[2],
                paddingHorizontal: theme.spacing[3],
                borderRadius: theme.radii.full,
                backgroundColor: theme.colors.primary,
                ...theme.shadows.sm,
              }}>
              <ArrowDown size={14} color={theme.colors.onPrimary} />
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                }}>
                New messages
              </Text>
            </Pressable>
          </Animated.View>
        )}

        <MessageOptionsModal
          isOpen={messageOptionsOpen}
          onClose={() => setMessageOptionsOpen(false)}
          currentMessage={currentMessage}
          onCopyMessage={handleCopyMessage}
          onDeleteMessage={handleDeleteMessage}
          onReplyMessage={handleReplyMessage}
          myReaction={
            uid ? messages.find((m) => m.id === currentMessage?.id)?.reactions?.[uid] : undefined
          }
          onReact={currentMessage && !statuses[currentMessage.id] ? handleReact : undefined}
          onEditMessage={canEditCurrent ? handleEditMessage : undefined}
          onToggleStar={
            currentMessage && !statuses[currentMessage.id] ? handleToggleStar : undefined
          }
          starred={!!currentMessage && !!stars[currentMessage.id]}
        />

        <ChatImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
      </Box>

      {partnerTyping && (
        <Animated.View
          entering={fadeEntering}
          exiting={listItemExiting}
          style={{
            width: '100%',
            paddingHorizontal: theme.commonSpacing.screenPadding,
            paddingTop: theme.spacing[1],
          }}>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textSecondary }}>
            {partnerName} is typing…
          </Text>
        </Animated.View>
      )}

      {/* Editing: same bar as the reply preview */}
      {editingMessage && (
        <Box
          style={{
            width: '100%',
            backgroundColor: theme.colors.surface,
            padding: theme.commonSpacing.screenPadding,
            paddingBottom: theme.spacing[2],
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
          <Box
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: theme.spacing[2],
            }}>
            <Box style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.textSecondary,
                  fontWeight: theme.fontWeight.semibold,
                  marginBottom: theme.spacing[1],
                }}>
                Editing message
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text,
                }}
                numberOfLines={2}>
                {editingMessage.message}
              </Text>
            </Box>
            <IconButton icon={X} onPress={cancelEdit} variant="ghost" />
          </Box>
        </Box>
      )}

      {/* Reply Preview */}
      {replyingToMessage && (
        <Box
          style={{
            width: '100%',
            backgroundColor: theme.colors.surface,
            padding: theme.commonSpacing.screenPadding,
            paddingBottom: theme.spacing[2],
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
          <Box
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: theme.spacing[2],
            }}>
            <Box style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.textSecondary,
                  fontWeight: theme.fontWeight.semibold,
                  marginBottom: theme.spacing[1],
                }}>
                Replying to {replyingToMessage.uid === user?.uid ? 'yourself' : partnerName}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text,
                }}
                numberOfLines={2}>
                {messagePreview(replyingToMessage)}
              </Text>
            </Box>
            <IconButton
              icon={X}
              onPress={() => setReplyingToMessage(null)}
              variant="ghost"
              size="sm"
            />
          </Box>
        </Box>
      )}

      <Box
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.commonSpacing.screenPadding,
          paddingBottom: theme.spacing[3],
          paddingTop: theme.spacing[2],
          gap: theme.spacing[3],
        }}>
        {voice.recording ? (
          <VoiceRecordingBar elapsedMs={voice.elapsedMs} cancelArmed={cancelArmed} />
        ) : (
          <>
            {/* Photos can't be edited in, only sent new */}
            {!editingMessage && (
              <IconButton icon={ImagePlus} variant="ghost" onPress={handlePickImage} />
            )}
            <Input
              variant="outline"
              style={{
                flex: 1,
                borderRadius: theme.radii.xl,
                backgroundColor: theme.colors.surface,
              }}>
              <InputField
                // @ts-ignore
                ref={inputRef}
                placeholder={editingMessage ? 'Edit your message' : 'Type a message'}
                value={draft}
                onChangeText={handleDraftChange}
                onSubmitEditing={handleSendMessage}
                style={{
                  fontSize: theme.fontSize.md,
                  color: theme.colors.text,
                }}
              />
            </Input>
          </>
        )}
        {/* An empty input offers a voice note instead of send */}
        {!editingMessage && (!draft.trim() || voice.recording) ? (
          <VoiceRecordButton
            recording={voice.recording}
            onStart={voice.start}
            onFinish={voice.finish}
            onCancelArmedChange={setCancelArmed}
          />
        ) : (
          <Animated.View style={sendButtonStyle}>
            <IconButton
              icon={editingMessage ? Check : Send}
              variant="primary"
              disabled={!draft.trim()}
              onPress={() => {
                // Quick dip then spring back, so the tap reads as a press
                if (!reduceMotion) {
                  sendScale.value = withSequence(
                    withTiming(0.9, { duration: duration.fast }),
                    withSpring(1, springConfig.bouncy),
                  );
                }
                handleSendMessage();
              }}
            />
          </Animated.View>
        )}
      </Box>
    </View>
  );
}
