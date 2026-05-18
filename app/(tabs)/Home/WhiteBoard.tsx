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
  ScrollView,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme, useAuth, useFirebase } from '../../../hooks';
import { IconButton, PathData, Whiteboard } from '../../../components';
import { router } from 'expo-router';
import { Alert, Dimensions, TouchableOpacity } from 'react-native';
import { ArrowLeft, Bookmark, Clock, Edit, Eye, X } from 'lucide-react-native';
import { Path, Svg } from 'react-native-svg';
import { WhiteboardSnapshot } from '../../../types';
import { useAppSelector } from '../../../state';

export default function WhiteBoard() {
  const { colorMode } = useAppTheme();
  const [storedPaths, setStoredPaths] = useState<PathData[]>([]);
  const [storedCanvasColor, setStoredCanvasColor] = useState<string>('white');
  const [boardName, setBoardName] = useState<string>('');
  const { user } = useAuth();
  const [roomId, setRoomId] = useState<string>(user.roomId || '');
  const [loading, setLoading] = useState(true);
  const [editNameModal, setEditNameModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [toolsVisible, setToolsVisible] = useState(true);

  // Snapshot state
  const [snapshots, setSnapshots] = useState<WhiteboardSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<WhiteboardSnapshot | null>(null);

  const { partnerName } = useAppSelector((state) => state.room);

  const {
    listenToWhiteboardEvents,
    updateWhiteboard,
    getWhiteboard,
    updateWhiteBoardName,
    saveWhiteboardSnapshot,
    getWhiteboardSnapshots,
  } = useFirebase();

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

  const toggleTools = () => {
    setToolsVisible((prev) => !prev);
  };

  const handleSaveSnapshot = async () => {
    if (!roomId || !user.uid) return;
    const snapshot: WhiteboardSnapshot = {
      paths: storedPaths,
      canvasColor: storedCanvasColor,
      savedBy: user.uid,
      savedAt: new Date().toISOString(),
    };
    try {
      await saveWhiteboardSnapshot(roomId, snapshot);
      Alert.alert('Saved', 'Board snapshot saved.');
    } catch {
      Alert.alert('Error', 'Failed to save snapshot.');
    }
  };

  const handleOpenGallery = async () => {
    if (!roomId) return;
    setGalleryOpen(true);
    setSnapshotsLoading(true);
    try {
      const data = await getWhiteboardSnapshots(roomId);
      setSnapshots(data);
    } catch {
      setSnapshots([]);
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const formatSnapshotDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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

              <IconButton icon={Bookmark} onPress={handleSaveSnapshot} variant="ghost" size={15} />
              <IconButton icon={Clock} onPress={handleOpenGallery} variant="ghost" size={15} />
              <IconButton icon={Edit} onPress={handleEditWhiteboardName} variant="ghost" size={15} />
              <IconButton icon={Eye} onPress={toggleTools} variant="ghost" size={15} />
            </Box>
          </Box>

          {roomId && (
            <Whiteboard
              pathCallback={pathsCallback}
              canvasColorCallback={canvasCallback}
              incomingPaths={storedPaths}
              incomingCanvasColor={storedCanvasColor}
              toolsVisible={toolsVisible}
              setToolsVisible={setToolsVisible}
            />
          )}
        </>
      )}

      {/* Edit Board Name Modal */}
      <Modal isOpen={editNameModal}>
        <ModalBackdrop onPress={() => setEditNameModal(false)} />
        <ModalContent>
          <ModalCloseButton onPress={() => setEditNameModal(false)} />
          <ModalHeader>
            <Text>Edit Whiteboard Name</Text>
          </ModalHeader>
          <Box style={{ padding: 20, gap: 20 }}>
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
              style={{ width: '100%' }}>
              <Text>Save</Text>
            </Button>
          </Box>
        </ModalContent>
      </Modal>

      {/* Snapshot Gallery Modal */}
      <Modal isOpen={galleryOpen}>
        <ModalBackdrop onPress={() => setGalleryOpen(false)} />
        <ModalContent style={{ maxHeight: '80%', width: '90%' }}>
          <ModalCloseButton onPress={() => setGalleryOpen(false)} />
          <ModalHeader>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Saved boards</Text>
          </ModalHeader>
          <Box style={{ padding: 16 }}>
            {snapshotsLoading ? (
              <Box style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Spinner />
              </Box>
            ) : snapshots.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#888', paddingVertical: 24 }}>
                No saved boards yet
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 480 }}>
                {snapshots.map((snap, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setGalleryOpen(false);
                      setSelectedSnapshot(snap);
                    }}
                    style={{
                      marginBottom: 16,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#e0e0e0',
                    }}>
                    <Svg height={120} width="100%" style={{ backgroundColor: snap.canvasColor }}>
                      {snap.paths?.map((p, pi) => (
                        <Path
                          key={pi}
                          d={p.path.join(' ')}
                          fill="none"
                          stroke={p.color}
                          strokeWidth={p.width}
                        />
                      ))}
                    </Svg>
                    <Box
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        padding: 8,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                      }}>
                      <Text style={{ fontSize: 12, color: '#555' }}>
                        {formatSnapshotDate(snap.savedAt)}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#555' }}>
                        {snap.savedBy === user.uid ? 'You' : partnerName || 'Partner'}
                      </Text>
                    </Box>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Box>
        </ModalContent>
      </Modal>

      {/* Full-Screen Snapshot Viewer */}
      <Modal isOpen={!!selectedSnapshot}>
        <ModalBackdrop onPress={() => setSelectedSnapshot(null)} />
        <ModalContent style={{ width: '95%', maxHeight: '90%' }}>
          <Box
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
            }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Snapshot</Text>
            <TouchableOpacity onPress={() => setSelectedSnapshot(null)}>
              <X size={22} color="#555" />
            </TouchableOpacity>
          </Box>

          {selectedSnapshot && (
            <>
              <Svg
                height={Dimensions.get('window').height * 0.65}
                width="100%"
                style={{ backgroundColor: selectedSnapshot.canvasColor }}>
                {selectedSnapshot.paths?.map((p, pi) => (
                  <Path
                    key={pi}
                    d={p.path.join(' ')}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={p.width}
                  />
                ))}
              </Svg>
              <Box
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  padding: 12,
                  backgroundColor: 'rgba(0,0,0,0.05)',
                }}>
                <Text style={{ fontSize: 12, color: '#555' }}>
                  {formatSnapshotDate(selectedSnapshot.savedAt)}
                </Text>
                <Text style={{ fontSize: 12, color: '#555' }}>
                  Saved by{' '}
                  {selectedSnapshot.savedBy === user.uid ? 'you' : partnerName || 'partner'}
                </Text>
              </Box>
            </>
          )}
        </ModalContent>
      </Modal>

      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </View>
  );
}
