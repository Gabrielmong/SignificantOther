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
import { ArrowLeft, Copy, Save } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

export default function WhiteBoard() {
  const { colorMode } = useAppTheme();
  const [storedPaths, setStoredPaths] = useState<PathData[]>([]);
  const [storedCanvasColor, setStoredCanvasColor] = useState<string>('white');
  const [boardName, setBoardName] = useState<string>('');
  const { user, editExtraProfile } = useAuth();
  const [boardId, setBoardId] = useState<string>(user.whiteboardId || '');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    joinWhiteboard,
    createWhiteboard,
    listenToWhiteboardEvents,
    updateWhiteboard,
    getWhiteboard,
  } = useFirebase();

  const { showToast } = useAppToast();

  useEffect(() => {
    if (user.whiteboardId) {
      setBoardId(user.whiteboardId);
    }
  }, [user.whiteboardId]);

  useEffect(() => {
    const loadData = async () => {
      if (boardId) {
        getWhiteboard(boardId).then((snapshot) => {
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
    }, boardId);
  }, [boardId]);

  const pathsCallback = (paths: PathData[]) => {
    setStoredPaths(paths);

    if (boardId) {
      updateWhiteboard(paths, boardId, storedCanvasColor);
    }
  };

  const canvasCallback = (color: string) => {
    setStoredCanvasColor(color);

    if (boardId) {
      updateWhiteboard(storedPaths, boardId, color);
    }
  };

  const handleCreateWhiteboard = async () => {
    const id = await createWhiteboard();
    setBoardId(id);

    editExtraProfile({ whiteboardId: id });
  };

  const handleJoinWhiteboard = () => {
    joinWhiteboard(boardId);
    editExtraProfile({ whiteboardId: boardId });
  };

  const handleCopyWhiteboardId = () => {
    Clipboard.setStringAsync(boardId).then(() => {
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

              <IconButton icon={Copy} onPress={handleCopyWhiteboardId} variant="ghost" size={15} />
            </Box>
          </Box>

          {!boardId ? (
            <Box
              style={{
                width: '100%',
                alignItems: 'center',
                gap: 20,
              }}>
              <Button
                onPress={handleCreateWhiteboard}
                style={{
                  width: '100%',
                }}>
                <Text>Create Whiteboard</Text>
              </Button>

              <Button
                onPress={() => setShowModal(true)}
                style={{
                  width: '100%',
                }}>
                <Text>Join Whiteboard</Text>
              </Button>

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
                        value={boardId}
                        onChangeText={(text) => setBoardId(text)}
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

      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </View>
  );
}
