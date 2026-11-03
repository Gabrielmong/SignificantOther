import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useFirebase } from './useFirebase';
import { getMoonInfo } from '../utils/moon';

const REFRESH_MS = 10 * 60 * 1000;

/** Tonight's moon, refreshed every 10 minutes and whenever the app comes back */
export const useMoonNow = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), REFRESH_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const moon = useMemo(() => getMoonInfo(now), [now]);

  return { now, moon };
};

interface UseMoonFavoritesProps {
  roomId: string | null | undefined;
  userId: string | null | undefined;
  partnerId: string | null | undefined;
}

/** Both partners' favorite moon phases (degrees), kept live */
export const useMoonFavorites = ({ roomId, userId, partnerId }: UseMoonFavoritesProps) => {
  const { listenToFavoriteMoonPhase, updateFavoriteMoonPhase } = useFirebase();
  const [myFavorite, setMyFavorite] = useState<number | null>(null);
  const [partnerFavorite, setPartnerFavorite] = useState<number | null>(null);

  useEffect(() => {
    setMyFavorite(null);
    if (!roomId || !userId) return;
    return listenToFavoriteMoonPhase(roomId, userId, setMyFavorite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  useEffect(() => {
    setPartnerFavorite(null);
    if (!roomId || !partnerId || partnerId.trim() === '') return;
    return listenToFavoriteMoonPhase(roomId, partnerId, setPartnerFavorite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, partnerId]);

  const saveFavorite = useCallback(
    async (angle: number) => {
      if (!roomId || !userId) return;
      await updateFavoriteMoonPhase(roomId, userId, angle);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, userId],
  );

  return { myFavorite, partnerFavorite, saveFavorite };
};
