import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme, useAuth, useFirebase } from '../../../hooks';
import { PathData, WhiteBoardPreview } from '../../../components';
import { router } from 'expo-router';
import { RefreshControl } from '@gluestack-ui/themed';
import { ScrollView } from '@gluestack-ui/themed';

export default function Home() {
  const { colorMode } = useAppTheme();
  const [storedPaths, setStoredPaths] = useState<PathData[]>([]);
  const [storedCanvasColor, setStoredCanvasColor] = useState<string>('white');
  const [boardName, setBoardName] = useState<string>('');
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const { listenToWhiteboardEvents, getWhiteboard } = useFirebase();

  const loadData = async () => {
    if (user.whiteboardId) {
      getWhiteboard(user.whiteboardId).then((snapshot) => {
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
    }, user.whiteboardId || '');
  }, []);

  useEffect(() => {
    if (user.whiteboardId) {
      loadData();
    }
  }, [user]);

  const handleOpenWhiteboard = () => {
    router.push('/(tabs)/Home/WhiteBoard');
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
      <WhiteBoardPreview
        boardName={boardName}
        paths={storedPaths}
        canvasColor={storedCanvasColor}
        height={100}
        onPress={handleOpenWhiteboard}
        loading={loading}
      />

      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </ScrollView>
  );
}
