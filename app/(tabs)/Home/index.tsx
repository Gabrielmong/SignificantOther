import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme, useAuth, useFirebase } from '../../../hooks';
import { FlowerModal, FlowerPressable, PathData, WhiteBoardPreview } from '../../../components';
import { router } from 'expo-router';
import {
  Box,
  Button,
  Input,
  InputField,
  Modal,
  ModalBackdrop,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  RefreshControl,
  Text,
} from '@gluestack-ui/themed';
import { ScrollView } from '@gluestack-ui/themed';
import { useAppSelector } from '../../../state';

export default function Home() {
  const { colorMode } = useAppTheme();
  const { partnerId } = useAppSelector((state) => state.room);
  const [storedPaths, setStoredPaths] = useState<PathData[]>([]);
  const [storedCanvasColor, setStoredCanvasColor] = useState<string>('white');
  const [boardName, setBoardName] = useState<string>('');
  const { user, editExtraProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState<string>(user.roomId || '');
  const [showModal, setShowModal] = useState(false);
  const [flowerMessage, setFlowerMessage] = useState<string>('');
  const [flower, setFlower] = useState<string>('daisy');
  const [showFlowerModal, setShowFlowerModal] = useState(false);
  const [ownFlower, setOwnFlower] = useState<string>('daisy');
  const [ownFlowerMessage, setOwnFlowerMessage] = useState<string>('');
  const [oldFlowerValues, setOldFlowerValues] = useState({
    selectedFlower: 'daisy',
    message: '',
  });

  const {
    listenToWhiteboardEvents,
    getWhiteboard,
    createRoom,
    joinRoom,
    getFlower,
    updateFlower,
    listenToFlowerChanges,
  } = useFirebase();

  const loadData = async () => {
    if (user.roomId && user.uid) {
      getWhiteboard(user.roomId).then((snapshot) => {
        const data = snapshot.val();
        setStoredPaths(data.paths);
        setStoredCanvasColor(data.canvasColor || 'white');
        setBoardName(data.name || '');

        setRefreshing(false);
        setLoading(false);
      });

      getFlower(user.roomId, partnerId).then((snapshot) => {
        const data = snapshot.val();
        setFlower(data.selectedFlower);
        setFlowerMessage(data.message);
      });

      getFlower(user.roomId, user.uid).then((snapshot) => {
        const data = snapshot.val();
        setOwnFlower(data.selectedFlower);
        setOwnFlowerMessage(data.message);
      });
    }
  };

  useEffect(() => {
    if (user.roomId) {
      listenToWhiteboardEvents((data) => {
        setStoredPaths(data.paths);
        setStoredCanvasColor(data.canvasColor || 'white');
        setBoardName(data.name || '');
      }, user.roomId || '');

      listenToFlowerChanges(
        (data) => {
          setFlower(data.flower);
          setFlowerMessage(data.message);
        },
        user.roomId,
        partnerId,
      );
    }
  }, []);

  useEffect(() => {
    if (user.roomId) {
      loadData();
    }
  }, [user]);

  const handleOpenWhiteboard = () => {
    router.push('/(tabs)/Home/WhiteBoard');
  };

  const handleCreateRoom = async () => {
    if (!user?.uid) return;

    const id = await createRoom({
      uid: user.uid,
    });

    if (id) {
      await editExtraProfile({ roomId: id });
    }
  };

  const handleJoinWhiteboard = () => {
    if (!user.uid) return;

    joinRoom(roomId, user.uid);
    editExtraProfile({ roomId });
  };

  const handleFlowerSend = async () => {
    if (user.roomId && user.uid) {
      await updateFlower(user.roomId, user.uid, ownFlower, ownFlowerMessage);

      setShowFlowerModal(false);
    }
  };

  const handleFlowerOpenPress = () => {
    setOldFlowerValues({
      selectedFlower: ownFlower,
      message: ownFlowerMessage,
    });

    setShowFlowerModal(true);
  };

  const handleFlowerClosePress = () => {
    setOwnFlower(oldFlowerValues.selectedFlower);
    setOwnFlowerMessage(oldFlowerValues.message);
    setShowFlowerModal(false);
  };

  return (
    <ScrollView
      $dark-backgroundColor="#121212"
      contentContainerStyle={{
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
        gap: 10,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}>
      {user.roomId && (
        <>
          <Box
            style={{
              width: '100%',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: 20,
            }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: colorMode === 'dark' ? '#FFFFFF' : '#000000',
              }}>
              {boardName}
            </Text>
          </Box>

          <WhiteBoardPreview
            boardName={boardName}
            paths={storedPaths}
            canvasColor={storedCanvasColor}
            height={100}
            onPress={handleOpenWhiteboard}
            loading={loading}
          />

          <FlowerPressable
            flower={flower}
            flowerMessage={flowerMessage}
            onPress={handleFlowerOpenPress}
            loading={loading}
          />
        </>
      )}

      {!user.roomId && (
        <Box
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20,
          }}>
          <Button onPress={handleCreateRoom}>
            <Text>Create Room</Text>
          </Button>

          <Button onPress={() => setShowModal(true)}>
            <Text>Join Room</Text>
          </Button>
        </Box>
      )}

      <Modal isOpen={showModal}>
        <ModalBackdrop onPress={() => setShowModal(false)} />

        <ModalContent>
          <ModalCloseButton onPress={() => setShowModal(false)} />

          <ModalHeader>
            <Text>Room ID</Text>
          </ModalHeader>

          <Box
            style={{
              padding: 20,
              gap: 20,
            }}>
            <Input>
              <InputField
                value={roomId}
                onChangeText={(text) => setRoomId(text)}
                placeholder="Room ID"
              />
            </Input>

            <Button
              onPress={() => {
                handleJoinWhiteboard();
                setShowModal(false);
              }}
              style={{
                width: '100%',
              }}>
              <Text>Join</Text>
            </Button>
          </Box>
        </ModalContent>
      </Modal>

      <FlowerModal
        showFlowerModal={showFlowerModal}
        onClose={handleFlowerClosePress}
        ownFlower={ownFlower}
        setOwnFlower={setOwnFlower}
        ownFlowerMessage={ownFlowerMessage}
        setOwnFlowerMessage={setOwnFlowerMessage}
        handleFlowerSend={handleFlowerSend}
      />

      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </ScrollView>
  );
}
