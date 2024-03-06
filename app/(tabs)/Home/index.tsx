import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme, useAuth, useFirebase } from '../../../hooks';
import { PathData, WhiteBoardPreview } from '../../../components';
import { router } from 'expo-router';
import { Button, RefreshControl, Text } from '@gluestack-ui/themed';
import { ScrollView } from '@gluestack-ui/themed';

export default function Home() {
  const { colorMode } = useAppTheme();
  const [storedPaths, setStoredPaths] = useState<PathData[]>([]);
  const [storedCanvasColor, setStoredCanvasColor] = useState<string>('white');
  const [boardName, setBoardName] = useState<string>('');
  const { user, editExtraProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const { listenToWhiteboardEvents, getWhiteboard, createRoom } = useFirebase();

  const loadData = async () => {
    if (user.roomId) {
      getWhiteboard(user.roomId).then((snapshot) => {
        const data = snapshot.val();
        setStoredPaths(data.paths);
        setStoredCanvasColor(data.canvasColor || 'white');
        setBoardName(data.name || '');

        setRefreshing(false);
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    listenToWhiteboardEvents((data) => {
      setStoredPaths(data.paths);
      setStoredCanvasColor(data.canvasColor || 'white');
      setBoardName(data.name || '');
    }, user.roomId || '');
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
      console.log('id', id);
      await editExtraProfile({ roomId: id });
    }
  };

  return (
    <ScrollView
      $dark-backgroundColor="#121212"
      contentContainerStyle={{
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}>
      {user.roomId && (
        <WhiteBoardPreview
          boardName={boardName}
          paths={storedPaths}
          canvasColor={storedCanvasColor}
          height={100}
          onPress={handleOpenWhiteboard}
          loading={loading}
        />
      )}

      {!user.roomId && (
        <Button onPress={handleCreateRoom}>
          <Text>Create Room</Text>
        </Button>
      )}

      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </ScrollView>
  );
}
