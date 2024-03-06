import { StatusBar } from 'expo-status-bar';
import {
  Text,
  View,
  Button,
  Image,
  Box,
  Card,
  InputField,
  Input,
  Spinner,
} from '@gluestack-ui/themed';
import { useAuth } from '../../../hooks/useAuth';
import { useAppSelector } from '../../../state';
import { useAppTheme, useFirebase } from '../../../hooks';
import { router } from 'expo-router';
import { IconButton } from '../../../components';
import { Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlashList } from '@shopify/flash-list';

interface Message {
  uid: string;
  message: string;
  timestamp: number;
}

export default function Profile() {
  const user = useAppSelector((state) => state.user);
  const { colorMode } = useAppTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomId, setRoomId] = useState<string>(user.roomId || '');
  const [message, setMessage] = useState<string>('');
  const flashListRef = useRef<FlashList<Message>>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const { listenToMessages, sendMessage, getMessages } = useFirebase();

  useEffect(() => {
    if (user.roomId) {
      listenToMessages((data) => {
        if (data.length === messages.length) return;

        if (data.length > 0) {
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
            const messages = Object.keys(data).map((key) => data[key]);

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
            estimatedItemSize={200}
            keyExtractor={(item) => item.timestamp.toString()}
            renderItem={({ item, index }) => (
              <>
                {item?.timestamp - messages[index - 1]?.timestamp > 600000 ||
                  (index === 0 && (
                    <Box
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 2,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colorMode === 'dark' ? '#ffffff' : '#000000',
                        }}>
                        {new Date(item?.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Box>
                  ))}
                <Box
                  style={{
                    flexDirection: 'row',
                    justifyContent: item?.uid === user?.uid ? 'flex-end' : 'flex-start',
                    width: '100%',
                    padding: 5,
                  }}>
                  <Box
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: item?.uid === user.uid ? '#8859ff' : '#323aba',
                      padding: 10,
                      borderRadius: 10,
                      borderBottomLeftRadius: item?.uid === user.uid ? 10 : 0,
                      borderBottomRightRadius: item?.uid === user.uid ? 0 : 10,
                    }}>
                    <Text>{item?.message}</Text>
                  </Box>
                </Box>
              </>
            )}
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
