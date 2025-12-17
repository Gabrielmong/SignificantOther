import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { PathData } from '../components';

interface UseWhiteboardProps {
  roomId: string | null;
  listenToWhiteboardEvents: (
    callback: (data: { paths: PathData[]; canvasColor: string; name: string }) => void,
    roomId: string,
  ) => void;
  setShowModal: (show: boolean) => void;
}

export const useWhiteboard = ({
  roomId,
  listenToWhiteboardEvents,
  setShowModal,
}: UseWhiteboardProps) => {
  const [storedPaths, setStoredPaths] = useState<PathData[]>([]);
  const [storedCanvasColor, setStoredCanvasColor] = useState<string>('white');
  const [boardName, setBoardName] = useState<string>('');

  // Listen to whiteboard changes
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = listenToWhiteboardEvents((data) => {
      setStoredPaths(data.paths);
      setStoredCanvasColor(data.canvasColor || 'white');
      setBoardName(data.name || '');
    }, roomId);

    // Cleanup Firebase listener on unmount or when dependencies change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleOpenWhiteboard = useCallback(() => {
    router.push('/(tabs)/Home/WhiteBoard');
  }, []);

  const handleJoinWhiteboard = useCallback(() => {
    router.push('/(tabs)/Home/WhiteBoard');
    setShowModal(false);
  }, [setShowModal]);

  const loadWhiteboardData = useCallback(
    async (whiteboardSnapshot?: {
      val: () => { paths: PathData[]; canvasColor: string; name: string } | null;
    }) => {
      if (whiteboardSnapshot?.val()) {
        const data = whiteboardSnapshot.val();
        if (data) {
          setStoredPaths(data.paths);
          setStoredCanvasColor(data.canvasColor || 'white');
          setBoardName(data.name || '');
        }
      }
    },
    [],
  );

  return {
    // State
    storedPaths,
    storedCanvasColor,
    boardName,

    // Handlers
    handleOpenWhiteboard,
    handleJoinWhiteboard,
    loadWhiteboardData,
  };
};
