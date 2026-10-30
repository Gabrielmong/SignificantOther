import type { Unsubscribe } from '@react-native-firebase/database';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';

import { Stroke, WhiteboardBoard } from '../types';

interface UseWhiteboardProps {
  roomId: string | null;
  listenToWhiteboardEvents: (
    callback: (board: WhiteboardBoard) => void,
    roomId: string,
  ) => Unsubscribe;
  setShowModal: (show: boolean) => void;
}

export const useWhiteboard = ({
  roomId,
  listenToWhiteboardEvents,
  setShowModal,
}: UseWhiteboardProps) => {
  const [storedStrokes, setStoredStrokes] = useState<Stroke[]>([]);
  const [storedCanvasColor, setStoredCanvasColor] = useState<string>('white');
  const [boardName, setBoardName] = useState<string>('');

  // Listen to whiteboard changes
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = listenToWhiteboardEvents((board) => {
      setStoredStrokes(board.strokes);
      setStoredCanvasColor(board.canvasColor);
      setBoardName(board.name);
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

  const loadWhiteboardData = useCallback((board: WhiteboardBoard) => {
    setStoredStrokes(board.strokes);
    setStoredCanvasColor(board.canvasColor);
    setBoardName(board.name);
  }, []);

  return {
    // State
    storedStrokes,
    storedCanvasColor,
    boardName,

    // Handlers
    handleOpenWhiteboard,
    handleJoinWhiteboard,
    loadWhiteboardData,
  };
};
