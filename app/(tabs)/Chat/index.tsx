import { StatusBar } from 'expo-status-bar';
import {
  Text,
  View,
  Button,
  Image,
  Box,
  InputField,
  Input,
  Spinner,
  HStack,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
} from '@gluestack-ui/themed';
import { useAuth } from '../../../hooks/useAuth';
import { useAppSelector } from '../../../state';
import { useAppTheme, useAppToast, useFirebase } from '../../../hooks';
import { router } from 'expo-router';
import { IconButton, Message, MessageOptionsModal } from '../../../components';
import { Send, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MessageType } from '../../../types';

export default function Chat() {
  const user = useAppSelector((state) => state.user);
  const room = useAppSelector((state) => state.room);
  const { showToast } = useAppToast();
  const { theme } = useAppTheme();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [roomId, setRoomId] = useState<string>(user.roomId || '');
  const [message, setMessage] = useState<string>('');
  const flashListRef = useRef<FlashListRef<MessageType>>(null);
  const inputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [messageOptionsOpen, setMessageOptionsOpen] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<MessageType | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<MessageType | null>(null);
  const [userDataReady, setUserDataReady] = useState<boolean>(false);
  const { listenToMessages, sendMessage, getMessages, deleteMessage, getUserProfile } =
    useFirebase();
  const [partnerProfilePic, setPartnerProfilePic] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Your Partner');

  // Verify user data is ready
  useEffect(() => {
    if (user.uid && user.roomId && user.roomId.trim() !== '') {
      setUserDataReady(true);
    } else {
      setUserDataReady(false);
    }
  }, [user.uid, user.roomId]);

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
  }, [room.partnerId, room.partnerName]);

  useEffect(() => {
    if (!userDataReady) return;

    if (user.roomId && user.uid) {
      listenToMessages((data) => {
        if (data.length === messages.length) return;

        if (data.length > 0) {
          // Messages in chronological order (oldest to newest)
          // FlashList will display them top-to-bottom, newest at bottom
          setMessages(data);
        }
      }, user.roomId);
    }
  }, [userDataReady, user.roomId, user.uid]);

  useEffect(() => {
    if (!userDataReady) return;

    const loadData = async () => {
      if (roomId && user.uid) {
        getMessages(roomId)
          .then((snapshot) => {
            const data = snapshot.val();

            if (data) {
              // Keep messages in chronological order (oldest to newest)
              const messages = Object.keys(data).map((key) => data[key]);

              if (messages.length > 0) {
                setMessages(messages);
                // Scroll to bottom to show latest messages
                setTimeout(() => {
                  flashListRef.current?.scrollToEnd({ animated: false });
                }, 100);
              }
            }
          })
          .catch((error) => {
            console.error('Error loading messages:', error);
          });
      }
    };

    loadData();
  }, [userDataReady, roomId, user.uid]);

  const handleSendMessage = async () => {
    if (!user?.uid || !user.roomId) return;

    if (!message) return;

    setLoading(true);

    await sendMessage({
      roomId: user.roomId,
      uid: user.uid,
      message,
      ...(replyingToMessage && {
        replyingTo: {
          messageId: replyingToMessage.timestamp,
          message: replyingToMessage.message,
          uid: replyingToMessage.uid,
        },
      }),
    });

    setMessage('');
    setReplyingToMessage(null);

    setLoading(false);

    // Scroll to bottom to show the new message
    if (flashListRef) {
      setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleOpenMessageOptions = ({
    message,
    timestamp,
    uid,
  }: {
    message: string;
    timestamp: number;
    uid: string;
  }) => {
    setCurrentMessage({ message, timestamp, uid });
    setMessageOptionsOpen(true);
  };

  const handleCopyMessage = async () => {
    if (!currentMessage) return;

    await Clipboard.setStringAsync(currentMessage.message);

    showToast({
      title: 'Message copied',
      status: 'success',
      description: 'You can now paste the message',
    });

    setMessageOptionsOpen(false);
  };

  const handleDeleteMessage = async () => {
    if (!user.roomId) return;

    if (!currentMessage) return;

    await deleteMessage(user.roomId, currentMessage.timestamp);

    showToast({
      title: 'Message deleted',
      status: 'success',
      description: 'The message has been deleted',
    });

    setMessageOptionsOpen(false);
  };

  const handleReplyMessage = () => {
    if (!currentMessage) return;

    setReplyingToMessage(currentMessage);
    setMessageOptionsOpen(false);

    // Focus the input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingToMessage(null);
  };

  const handleScrollToMessage = (messageId: number) => {
    const messageIndex = messages.findIndex((msg) => msg.timestamp === messageId);
    if (messageIndex !== -1) {
      flashListRef.current?.scrollToIndex({
        index: messageIndex,
        animated: true,
      });
    }
  };

  // Show verification loader while waiting for user data
  if (!userDataReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}>
        <Spinner size="large" color={theme?.colors?.primary || '#8B5CF6'} />
        <Text
          style={{
            marginTop: 16,
            fontSize: theme?.fontSize?.md || 16,
            color: theme?.colors?.textSecondary || '#6B7280',
          }}>
          {!user.uid
            ? 'Authenticating...'
            : !user.roomId
              ? 'Setting up chat...'
              : 'Loading messages...'}
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
      </Box>

      {messages && (
        <Box
          style={{
            flex: 1,
            flexDirection: 'column',
            width: '100%',
            justifyContent: 'flex-start',
            paddingHorizontal: theme.commonSpacing.screenPadding,
            paddingTop: 0,
            paddingBottom: 0,
          }}>
          <FlashList
            data={messages}
            ref={flashListRef}
            keyExtractor={(item) => item.timestamp.toString()}
            renderItem={({ item, index }) => (
              <Message
                index={index}
                message={item.message}
                timestamp={item.timestamp}
                lastMessageTimestamp={index > 0 ? messages[index - 1].timestamp : undefined}
                uid={item.uid}
                replyingTo={item.replyingTo}
                onLongPress={() => {
                  handleOpenMessageOptions({
                    message: item.message,
                    timestamp: item.timestamp,
                    uid: item.uid,
                  });
                }}
                onReplyPress={handleScrollToMessage}
                partnerName={partnerName}
              />
            )}
          />

          <MessageOptionsModal
            isOpen={messageOptionsOpen}
            onClose={() => setMessageOptionsOpen(false)}
            currentMessage={currentMessage}
            onCopyMessage={handleCopyMessage}
            onDeleteMessage={handleDeleteMessage}
            onReplyMessage={handleReplyMessage}
          />
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
                {replyingToMessage.message}
              </Text>
            </Box>
            <IconButton icon={X} onPress={handleCancelReply} variant="ghost" size="sm" />
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
            placeholder="Type a message"
            value={message}
            onChangeText={(text) => setMessage(text)}
            onSubmitEditing={() => {
              handleSendMessage();
            }}
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.text,
            }}
          />
        </Input>
        <IconButton
          icon={loading ? Spinner : Send}
          disabled={loading}
          variant="primary"
          onPress={() => {
            handleSendMessage();
          }}
        />
      </Box>
    </View>
  );
}
