import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '../state';
import { useFirebase } from './useFirebase';
import { useAppToast } from './useAppToast';
import { MilestoneObject, PhotoObject, Place, PlaceObject } from '../types';
import { unlinkUpdates } from '../utils/places';

export type PlaceInput = {
  id?: string; // Missing for a new place
  name: string;
  emoji: string;
  latitude: number;
  longitude: number;
  venue?: string;
  day?: string;
  note?: string;
};

// The room's places, plus saving and deleting. Deleting a place clears the
// links to it in the same write, so milestones and photos survive it.
export const usePlaces = () => {
  const uid = useAppSelector((state) => state.user.uid) || '';
  const roomId = useAppSelector((state) => state.user.roomId) || '';
  const {
    listenToPlaceChanges,
    listenToMilestoneChanges,
    listenToPhotoChanges,
    setPlace,
    applyUpdates,
    isConnected,
    newId,
  } = useFirebase();
  const { showToast } = useAppToast();

  const [byId, setById] = useState<PlaceObject>({});
  const [loading, setLoading] = useState(true);

  // Only needed to unlink on delete, so kept out of render state
  const milestones = useRef<MilestoneObject>({});
  const photos = useRef<PhotoObject>({});

  useEffect(() => {
    if (!roomId) return;

    const unsubscribePlaces = listenToPlaceChanges((data) => {
      setById(data);
      setLoading(false);
    }, roomId);
    const unsubscribeMilestones = listenToMilestoneChanges((data) => {
      milestones.current = data;
    }, roomId);
    const unsubscribePhotos = listenToPhotoChanges((data) => {
      photos.current = data;
    }, roomId);

    return () => {
      unsubscribePlaces();
      unsubscribeMilestones();
      unsubscribePhotos();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const places = useMemo(
    () => Object.values(byId).sort((a, b) => a.name.localeCompare(b.name)),
    [byId],
  );

  const savePlace = useCallback(
    async (input: PlaceInput): Promise<Place | null> => {
      if (!(await isConnected())) {
        showToast({
          title: "You're offline",
          description: 'Connect to the internet to save this place.',
          status: 'error',
        });
        return null;
      }

      const previous = input.id ? byId[input.id] : undefined;
      const venue = input.venue?.trim();
      const note = input.note?.trim();

      // RTDB rejects undefined values, so optional keys are only added when set
      const place: Place = {
        id: input.id ?? newId(),
        name: input.name.trim(),
        emoji: input.emoji,
        latitude: input.latitude,
        longitude: input.longitude,
        createdAt: previous?.createdAt ?? Date.now(),
        createdBy: previous?.createdBy ?? uid,
        ...(previous ? { updatedAt: Date.now() } : {}),
        ...(venue ? { venue } : {}),
        ...(input.day ? { day: input.day } : {}),
        ...(note ? { note } : {}),
      };

      try {
        await setPlace(roomId, place);
        return place;
      } catch (error) {
        console.error('Error saving place:', error);
        showToast({
          title: "Couldn't save the place",
          description: 'Please check your connection and try again.',
          status: 'error',
        });
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, uid, byId],
  );

  const removePlace = useCallback(
    async (p: Place): Promise<boolean> => {
      const updates: Record<string, unknown> = {
        ...unlinkUpdates(
          p.id,
          Object.values(milestones.current),
          Object.values(photos.current),
          roomId,
        ),
        [`rooms/${roomId}/places/${p.id}`]: null,
      };

      try {
        await applyUpdates(updates);
        return true;
      } catch (error) {
        console.error('Error deleting place:', error);
        showToast({
          title: "Couldn't delete the place",
          description: 'Please check your connection and try again.',
          status: 'error',
        });
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId],
  );

  return { places, byId, loading, savePlace, removePlace };
};
