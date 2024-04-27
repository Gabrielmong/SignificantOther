import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme, useAppToast, useAuth, useFirebase } from '../../../hooks';
import {
  FeelingModal,
  FeelingPressable,
  FlowerModal,
  FlowerPressable,
  PathData,
  WhiteBoardPreview,
} from '../../../components';
import { router } from 'expo-router';
import {
  Box,
  Button,
  HStack,
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
import { TouchableOpacity } from 'react-native';

export default function Home() {
  const { colorMode } = useAppTheme();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);
  const { showToast } = useAppToast();
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
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [ownFeeling, setOwnFeeling] = useState<string>('neutral');
  const [oldFeeling, setOldFeeling] = useState<string>('neutral');
  const [feeling, setFeeling] = useState<string>('neutral');
  const [numberOfItems, setNumberOfItems] = useState(0);
  const [numberOfItemsInJournal, setNumberOfItemsInJournal] = useState(0);

  const {
    listenToWhiteboardEvents,
    getWhiteboard,
    createRoom,
    joinRoom,
    getFlower,
    updateFlower,
    listenToFlowerChanges,
    getFeeling,
    updateFeeling,
    listenToFeelingChanges,
    getNumberOfItemsInWishlist,
    listentoNumberOfItemsInWishlist,
    getNumberOfItemsInJournal,
  } = useFirebase();

  const loadData = async () => {
    if (user.roomId && user.uid) {
      getWhiteboard(user.roomId).then((snapshot) => {
        const data = snapshot.val();
        setStoredPaths(data.paths);
        setStoredCanvasColor(data.canvasColor || 'white');
        setBoardName(data.name || '');
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

      getFeeling(user.roomId, user.uid).then((snapshot) => {
        const data = snapshot.val();
        setOwnFeeling(data.selectedFeeling);
      });

      getFeeling(user.roomId, partnerId).then((snapshot) => {
        const data = snapshot.val();
        setFeeling(data.selectedFeeling);
      });

      const numberOfItems = await getNumberOfItemsInWishlist(user.roomId);

      setNumberOfItems(numberOfItems || 0);

      const numberOfItemsInJournal = await getNumberOfItemsInJournal(user.roomId);

      setNumberOfItemsInJournal(numberOfItemsInJournal || 0);

      setRefreshing(false);
      setLoading(false);
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

      listenToFeelingChanges(
        (data) => {
          setFeeling(data.feeling);
        },
        user.roomId,
        partnerId,
      );

      listentoNumberOfItemsInWishlist((data) => {
        setNumberOfItems(data.count);
      }, user.roomId);
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

      showToast({
        title: 'Flower updated',
        description: 'Your flower has been updated',
        status: 'success',
      });
    }
  };

  const handleFlowerOpenPress = () => {
    setOldFlowerValues({
      selectedFlower: ownFlower,
      message: ownFlowerMessage,
    });

    setShowFlowerModal(true);
  };

  const handleFeelingPress = () => {
    setOldFeeling(ownFeeling);
    setShowFeelingModal(true);
  };

  const handleFlowerClosePress = () => {
    setOwnFlower(oldFlowerValues.selectedFlower);
    setOwnFlowerMessage(oldFlowerValues.message);
    setShowFlowerModal(false);
  };

  const handleFeelingClosePress = () => {
    setOwnFeeling(oldFeeling);
    setShowFeelingModal(false);
  };

  const handleFeelingSend = async () => {
    if (user.roomId && user.uid) {
      await updateFeeling(user.roomId, user.uid, ownFeeling);

      setShowFeelingModal(false);

      showToast({
        title: 'Feeling updated',
        description: 'Your feeling has been updated',
        status: 'success',
      });
    }
  };

  const handleWishlistPress = () => {
    router.push('/(tabs)/Home/Wishlist');
  };

  const handleJournalPress = () => {
    router.push('/(tabs)/Home/Journal/');
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
      {loading ? (
        <Box
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20,
          }}>
          <Text>Loading...</Text>
        </Box>
      ) : (
        <>
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

              <FeelingPressable
                partnerName={partnerName}
                feeling={feeling}
                onPress={handleFeelingPress}
                loading={loading}
              />

              <HStack
                gap={10}
                paddingVertical={0}
                paddingHorizontal={5}
                display="flex"
                flexDirection="row"
                justifyContent="space-between"
                alignItems="flex-start">
                <TouchableOpacity
                  onPress={handleWishlistPress}
                  style={{
                    padding: 10,
                    backgroundColor: colorMode === 'dark' ? '#000000' : '#F5F5F5',
                    borderRadius: 10,
                    width: '50%',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexDirection: 'column',
                    gap: 10,
                    height: 100,
                  }}>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                    Wishlist
                  </Text>

                  <Text>
                    {numberOfItems === 0
                      ? 'Nothing to do'
                      : `${numberOfItems} ${
                          numberOfItems === 1 ? 'thing' : 'things'
                        } to do with ${partnerName}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleJournalPress}
                  style={{
                    padding: 10,
                    backgroundColor: colorMode === 'dark' ? '#000000' : '#F5F5F5',
                    borderRadius: 10,
                    width: '50%',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    height: 100,
                  }}>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                    Journal
                  </Text>

                  <Text>
                    {numberOfItemsInJournal === 0
                      ? 'No journal entries'
                      : `${numberOfItemsInJournal} journal ${
                          numberOfItemsInJournal === 1 ? 'entry' : 'entries'
                        }`}
                  </Text>
                </TouchableOpacity>
              </HStack>
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
        </>
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
      <FeelingModal
        isOpen={showFeelingModal}
        onClose={handleFeelingClosePress}
        ownFeeling={ownFeeling}
        setOwnFeeling={setOwnFeeling}
        handleFeelingSend={handleFeelingSend}
      />
      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </ScrollView>
  );
}
