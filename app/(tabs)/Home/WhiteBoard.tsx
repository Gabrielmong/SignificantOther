import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Input,
  InputField,
  Spinner,
  Text,
  View,
  Modal,
  ModalBackdrop,
  ModalCloseButton,
  ModalHeader,
  ModalContent,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme, useAppToast, useAuth, useFirebase } from '../../../hooks';
import { IconButton, PathData, Whiteboard } from '../../../components';
import { router } from 'expo-router';
import { ArrowLeft, Copy, Edit, Save } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

export default function WhiteBoard() {
  const { colorMode } = useAppTheme();
  const [storedPaths, setStoredPaths] = useState<PathData[]>([]);
  const [storedCanvasColor, setStoredCanvasColor] = useState<string>('white');
  const [boardName, setBoardName] = useState<string>('');
  const { user, editExtraProfile } = useAuth();
  const [roomId, setRoomId] = useState<string>(user.roomId || '');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editNameModal, setEditNameModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const {
    joinWhiteboard,
    listenToWhiteboardEvents,
    updateWhiteboard,
    getWhiteboard,
    updateWhiteBoardName,
  } = useFirebase();

  const { showToast } = useAppToast();

  useEffect(() => {
    if (user.roomId) {
      setRoomId(user.roomId);
    }
  }, [user.roomId]);

  useEffect(() => {
    const loadData = async () => {
      if (roomId) {
        getWhiteboard(roomId).then((snapshot) => {
          const data = snapshot.val();
          setStoredPaths(data.paths);
          setStoredCanvasColor(data.canvasColor || 'white');
          setBoardName(data.name || '');
          setLoading(false);
        });
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    listenToWhiteboardEvents((data) => {
      setStoredPaths(data.paths);
      setStoredCanvasColor(data.canvasColor || 'white');
      setBoardName(data.name || '');
    }, roomId);
  }, [roomId]);

  const pathsCallback = (paths: PathData[]) => {
    setStoredPaths(paths);

    if (roomId) {
      updateWhiteboard(paths, roomId, storedCanvasColor);
    }
  };

  const canvasCallback = (color: string) => {
    setStoredCanvasColor(color);

    if (roomId) {
      updateWhiteboard(storedPaths, roomId, color);
    }
  };

  const handleEditWhiteboardName = () => {
    setNewBoardName(boardName);
    setEditNameModal(true);
  };

  const handleJoinWhiteboard = () => {
    joinWhiteboard(roomId);
    editExtraProfile({ roomId });
  };

  const handleCopyWhiteboardId = () => {
    Clipboard.setStringAsync(roomId).then(() => {
      showToast({
        title: 'Whiteboard ID copied',
        status: 'success',
        description: 'You can now share the ID with your significant other',
      });
    });
  };

  return (
    <View
      $dark-backgroundColor="#121212"
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
        gap: 20,
      }}>
      {loading && (
        <Box
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Spinner />
        </Box>
      )}

      {!loading && (
        <>
          <Box
            style={{
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <IconButton icon={ArrowLeft} onPress={router.back} />

            <Box
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
              }}>
              <Text
                style={{
                  fontSize: 24,
                  lineHeight: 32,
                  fontWeight: 'bold',
                }}>
                {boardName || 'Whiteboard'}
              </Text>

              <IconButton
                icon={Edit}
                onPress={handleEditWhiteboardName}
                variant="ghost"
                size={15}
              />

              <IconButton icon={Copy} onPress={handleCopyWhiteboardId} variant="ghost" size={15} />
            </Box>
          </Box>

          {!roomId ? (
            <Box
              style={{
                width: '100%',
                alignItems: 'center',
                gap: 20,
              }}>
              <Modal isOpen={showModal}>
                <ModalBackdrop onPress={() => setShowModal(false)} />

                <ModalContent>
                  <ModalCloseButton onPress={() => setShowModal(false)} />

                  <ModalHeader>
                    <Text>Whiteboard ID</Text>
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
                        placeholder="Whiteboard ID"
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
            </Box>
          ) : (
            <Whiteboard
              pathCallback={pathsCallback}
              canvasColorCallback={canvasCallback}
              incomingPaths={storedPaths}
              incomingCanvasColor={storedCanvasColor}
            />
          )}
        </>
      )}

      <Modal isOpen={editNameModal}>
        <ModalBackdrop onPress={() => setEditNameModal(false)} />

        <ModalContent>
          <ModalCloseButton onPress={() => setEditNameModal(false)} />

          <ModalHeader>
            <Text>Edit Whiteboard Name</Text>
          </ModalHeader>

          <Box
            style={{
              padding: 20,
              gap: 20,
            }}>
            <Input>
              <InputField
                value={newBoardName}
                onChangeText={(text) => setNewBoardName(text)}
                placeholder="Whiteboard Name"
              />
            </Input>

            <Button
              onPress={() => {
                updateWhiteBoardName(newBoardName, roomId);
                setEditNameModal(false);
              }}
              style={{
                width: '100%',
              }}>
              <Text>Save</Text>
            </Button>
          </Box>
        </ModalContent>
      </Modal>

      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </View>
  );
}
