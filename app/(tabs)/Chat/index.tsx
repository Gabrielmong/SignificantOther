import { StatusBar } from 'expo-status-bar';
import { Text, View, Button, Image, Box, InputField, Input, Spinner } from '@gluestack-ui/themed';
import { useAuth } from '../../../hooks/useAuth';
import { useAppSelector } from '../../../state';
import { useAppTheme, useAppToast, useFirebase } from '../../../hooks';
import { router } from 'expo-router';
import { IconButton, Message, MessageOptionsModal } from '../../../components';
import { Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MessageType } from '../../../types';

export default function Chat() {
  const user = useAppSelector((state) => state.user);
  const { showToast } = useAppToast();
  const { colorMode } = useAppTheme();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [roomId, setRoomId] = useState<string>(user.roomId || '');
  const [message, setMessage] = useState<string>('');
  const flashListRef = useRef<FlashList<MessageType>>(null);
  const inputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [messageOptionsOpen, setMessageOptionsOpen] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<MessageType | null>(null);
  const { listenToMessages, sendMessage, getMessages, deleteMessage } = useFirebase();

  useEffect(() => {
    if (user.roomId) {
      listenToMessages((data) => {
        if (data.length === messages.length) return;

        if (data.length > 0) {
          // reverse the data to show the latest messages first
          data = data.reverse();

          setMessages(data);
        }
      }, user.roomId);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      if (roomId) {
        getMessages(roomId).then((snapshot) => {
          const data = snapshot.val();

          if (data) {
            const messages = Object.keys(data)
              .map((key) => data[key])
              .reverse();

            if (messages.length > 0) {
              setMessages(messages);
            }
          }
        });
      }
    };

    loadData();
  }, []);

  const handleSendMessage = async () => {
    if (!user?.uid || !user.roomId) return;

    if (!message) return;

    setLoading(true);

    await sendMessage({
      roomId: user.roomId,
      uid: user.uid,
      message,
    });

    setMessage('');

    setLoading(false);

    if (flashListRef) {
      flashListRef.current?.scrollToEnd();
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
    showToast({
      title: 'Reply',
      status: 'info',
      description: 'This feature is not available yet',
    });
    setMessageOptionsOpen(false);
  };

  return (
    <View
      $dark-backgroundColor="#121212"
      style={{
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />

      <Box
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colorMode === 'dark' ? '#2e2e2e' : '#F5F5F5',
          padding: 20,
        }}>
        <Text
          style={{
            fontSize: 24,
            lineHeight: 32,
            fontWeight: 'bold',
          }}>
          {'Chat'}
        </Text>
      </Box>

      {messages && (
        <Box
          style={{
            flex: 1,
            flexDirection: 'column',
            width: '100%',
            justifyContent: 'flex-start',
            padding: 20,
            paddingTop: 0,
            paddingBottom: 0,
          }}>
          <FlashList
            data={messages}
            ref={flashListRef}
            inverted
            estimatedItemSize={200}
            keyExtractor={(item) => item.timestamp.toString()}
            renderItem={({ item, index }) => (
              <Message
                index={index}
                message={item.message}
                timestamp={item.timestamp}
                lastMessageTimestamp={index > 0 ? messages[index - 1].timestamp : undefined}
                uid={item.uid}
                onLongPress={() => {
                  handleOpenMessageOptions({
                    message: item.message,
                    timestamp: item.timestamp,
                    uid: item.uid,
                  });
                }}
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

      <Box
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 20,
          paddingBottom: 10,
          paddingTop: 5,
          gap: 10,
        }}>
        <Input
          style={{
            flex: 1,
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
          />
        </Input>
        <IconButton
          icon={loading ? Spinner : Send}
          disabled={loading}
          onPress={() => {
            handleSendMessage();
          }}
        />
      </Box>
    </View>
  );
}
