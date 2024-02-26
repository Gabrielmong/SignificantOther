import React, { useEffect, useState } from 'react';
import { Box, Button, Input, InputField, Text, View } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme, useAuth, useFirebase } from '../../../hooks';
import { PathData, Whiteboard } from '../../../components';

export default function Home() {
  const { colorMode } = useAppTheme();
  const [storedPaths, setStoredPaths] = useState<PathData[]>([]);
  const [storedCanvasColor, setStoredCanvasColor] = useState<string>('white');
  const { user, editExtraProfile } = useAuth();
  const [boardId, setBoardId] = useState<string>(user.whiteboardId || '');

  const {
    joinWhiteboard,
    createWhiteboard,
    listenToWhiteboardEvents,
    updateWhiteboard,
    getWhiteboard,
  } = useFirebase();

  useEffect(() => {
    if (user.whiteboardId) {
      setBoardId(user.whiteboardId);
    }
  }, [user.whiteboardId]);

  useEffect(() => {
    const loadData = async () => {
      if (boardId) {
        getWhiteboard(boardId).then((data) => {
          setStoredPaths(data.paths);
          setStoredCanvasColor(data.canvasColor || 'white');
        });

        listenToWhiteboardEvents((data) => {
          setStoredPaths(data.paths);
          setStoredCanvasColor(data.canvasColor || 'white');
        }, boardId);
      }
    };

    loadData();
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

  return (
    <View
      $dark-backgroundColor="#121212"
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
      <Whiteboard
        pathCallback={pathsCallback}
        canvasColorCallback={canvasCallback}
        incomingPaths={storedPaths}
        incomingCanvasColor={storedCanvasColor}
      />

      <Input>
        <InputField
          placeholder="Whiteboard ID"
          value={boardId}
          onChangeText={setBoardId}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Input>

      <Box
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <Button
          onPress={() => {
            joinWhiteboard(boardId);
          }}>
          <Text>Join Whiteboard</Text>
        </Button>

        {!user.whiteboardId && (
          <Button onPress={handleCreateWhiteboard}>
            <Text>Create Whiteboard</Text>
          </Button>
        )}
      </Box>

      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </View>
  );
}
