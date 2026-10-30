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
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Bookmark, Clock, Edit, Eye, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, TouchableOpacity } from 'react-native';

import { BoardCanvas, IconButton, Whiteboard, KeyboardAwareModal } from '../../../components';
import { useAppTheme, useAuth, useFirebase } from '../../../hooks';
import { useAppSelector } from '../../../state';
import { Stroke, WhiteboardSnapshot } from '../../../types';

export default function WhiteBoard() {
  const { colorMode } = useAppTheme();
  const [storedStrokes, setStoredStrokes] = useState<Stroke[]>([]);
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
    addStroke,
    removeStrokes,
    restoreStrokes,
    updateCanvasColor,
    updateWhiteBoardName,
    saveWhiteboardSnapshot,
    getWhiteboardSnapshots,
  } = useFirebase();

  useEffect(() => {
    if (user.roomId) {
      setRoomId(user.roomId);
    }
  }, [user.roomId]);

  // The first event is the current board, converted from the pre-v2 format if needed
  useEffect(() => {
    if (!roomId) return;

    return listenToWhiteboardEvents((board) => {
      setStoredStrokes(board.strokes);
      setStoredCanvasColor(board.canvasColor);
      setBoardName(board.name);
      setLoading(false);
    }, roomId);
  }, [roomId, listenToWhiteboardEvents]);

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
      strokes: storedStrokes,
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
              <IconButton
                icon={Edit}
                onPress={handleEditWhiteboardName}
                variant="ghost"
                size={15}
              />
              <IconButton icon={Eye} onPress={toggleTools} variant="ghost" size={15} />
            </Box>
          </Box>

          {roomId && (
            <Whiteboard
              strokes={storedStrokes}
              canvasColor={storedCanvasColor}
              onStrokeAdd={(stroke) => addStroke(roomId, stroke)}
              onStrokesRemove={(ids) => removeStrokes(roomId, ids)}
              onStrokesRestore={(strokes) => restoreStrokes(roomId, strokes)}
              onCanvasColorChange={(color) => updateCanvasColor(roomId, color)}
              toolsVisible={toolsVisible}
              setToolsVisible={setToolsVisible}
            />
          )}
        </>
      )}

      {/* Edit Board Name Modal */}
      <KeyboardAwareModal isOpen={editNameModal}>
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
      </KeyboardAwareModal>

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
                    <BoardCanvas
                      strokes={snap.strokes}
                      canvasColor={snap.canvasColor}
                      style={{ height: 120, width: '100%' }}
                    />
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
              <BoardCanvas
                strokes={selectedSnapshot.strokes}
                canvasColor={selectedSnapshot.canvasColor}
                style={{ height: Dimensions.get('window').height * 0.9, width: '100%' }}
              />
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
