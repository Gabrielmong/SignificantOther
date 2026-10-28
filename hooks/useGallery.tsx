import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../state';
import { useFirebase } from './useFirebase';
import { useAppToast } from './useAppToast';
import { MilestoneObject, Photo, PhotoObject } from '../types';
import {
  Columns,
  ZOOM_STEPS,
  milestoneMirrorFields,
  sortPhotos,
  tagCounts,
  tagsFromList,
} from '../utils/photos';
import { PickedPhoto, deletePhoto, uploadPhotoWithThumb } from '../services/photoUpload';

const COLUMNS_KEY = '@SignificantOther:galleryColumns';

// A photo picked but not uploaded yet. `key` is local only (the asset URI).
export type PendingPhoto = {
  key: string;
  picked: PickedPhoto;
  day: string;
  label?: string;
  description?: string;
};

export type PhotoDetails = { label?: string; description?: string; day: string; tags: string[] };

// The room's shared gallery: listening, batch upload with retry, edits,
// deletes, and gallery entries for milestone photos saved before the gallery.
export const useGallery = () => {
  const uid = useAppSelector((state) => state.user.uid) || '';
  const roomId = useAppSelector((state) => state.user.roomId) || '';
  const {
    listenToPhotoChanges,
    listenToMilestoneChanges,
    setPhoto,
    updatePhoto,
    deletePhotoRecord,
    isConnected,
    newId,
  } = useFirebase();
  const { showToast } = useAppToast();

  const [photoObject, setPhotoObject] = useState<PhotoObject>({});
  const [milestones, setMilestones] = useState<MilestoneObject>({});
  const [loading, setLoading] = useState(true);
  const [columns, setColumnsState] = useState<Columns>(3);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribePhotos = listenToPhotoChanges((data) => {
      setPhotoObject(data);
      setLoading(false);
    }, roomId);
    const unsubscribeMilestones = listenToMilestoneChanges(setMilestones, roomId);

    return () => {
      unsubscribePhotos();
      unsubscribeMilestones();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Milestone photos saved before the gallery existed get their entry here
  const backfilled = useRef(new Set<string>());
  useEffect(() => {
    if (!roomId || loading) return;

    for (const m of Object.values(milestones)) {
      const id = `ms-${m.id}`;
      if (!m.photo || photoObject[id] || backfilled.current.has(id)) continue;
      backfilled.current.add(id);
      updatePhoto(roomId, id, {
        ...milestoneMirrorFields(m, Date.now()),
        createdAt: m.createdAt,
        createdBy: m.createdBy,
      }).catch((e) => console.error('Error adding milestone photo to gallery:', e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestones, photoObject, loading, roomId]);

  // Remembered pinch zoom
  useEffect(() => {
    AsyncStorage.getItem(COLUMNS_KEY)
      .then((saved) => {
        const value = Number(saved);
        if ((ZOOM_STEPS as readonly number[]).includes(value)) setColumnsState(value as Columns);
      })
      .catch((e) => console.error('Error loading gallery zoom:', e));
  }, []);

  const setColumns = useCallback((c: Columns) => {
    setColumnsState(c);
    AsyncStorage.setItem(COLUMNS_KEY, String(c)).catch((e) =>
      console.error('Error saving gallery zoom:', e),
    );
  }, []);

  const photos = useMemo(() => sortPhotos(Object.values(photoObject)), [photoObject]);
  const tags = useMemo(() => tagCounts(photos), [photos]);

  // Uploads one at a time and keeps going past failures. Returns the items
  // that failed (empty when everything was saved), so they can be retried.
  const addPhotos = useCallback(
    async (
      items: PendingPhoto[],
      shared: { tags: string[]; label?: string },
      onProgress?: (done: number, total: number) => void,
    ): Promise<PendingPhoto[]> => {
      if (!(await isConnected())) {
        showToast({
          title: "You're offline",
          description: 'Connect to the internet to upload photos.',
          status: 'error',
        });
        return items;
      }

      const tagMap = tagsFromList(shared.tags);
      const sharedLabel = shared.label?.trim();
      const failed: PendingPhoto[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = newId();
        try {
          const uploaded = await uploadPhotoWithThumb(item.picked, `rooms/${roomId}/photos/${id}`);
          const label = item.label?.trim() || sharedLabel;
          const description = item.description?.trim();

          // RTDB rejects undefined values, so optional keys are only added when set
          const photo: Photo = {
            id,
            ...uploaded,
            day: item.day,
            createdAt: Date.now(),
            createdBy: uid,
            ...(label ? { label } : {}),
            ...(description ? { description } : {}),
            ...(tagMap ? { tags: tagMap } : {}),
          };

          try {
            await setPhoto(roomId, photo);
          } catch (error) {
            deletePhoto(uploaded.path).catch((e) => console.error('Error cleaning up photo:', e));
            deletePhoto(uploaded.thumbPath).catch((e) => console.error('Error cleaning up photo:', e));
            throw error;
          }
        } catch (error) {
          console.error('Error adding photo:', error);
          failed.push(item);

          // Lost the connection: don't spend 30s per remaining photo finding out
          if (!(await isConnected())) {
            failed.push(...items.slice(i + 1));
            onProgress?.(items.length, items.length);
            break;
          }
        }
        onProgress?.(i + 1, items.length);
      }

      if (failed.length) {
        showToast({
          title: `${failed.length} ${failed.length === 1 ? "photo couldn't" : "photos couldn't"} be uploaded`,
          description: 'You can retry them now.',
          status: 'error',
        });
      }
      return failed;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, uid],
  );

  const updateDetails = useCallback(
    async (id: string, details: PhotoDetails): Promise<boolean> => {
      const label = details.label?.trim();
      const description = details.description?.trim();
      try {
        // null clears a field through update
        await updatePhoto(roomId, id, {
          label: label || null,
          description: description || null,
          day: details.day,
          tags: tagsFromList(details.tags) ?? null,
          updatedAt: Date.now(),
        });
        return true;
      } catch (error) {
        console.error('Error updating photo:', error);
        showToast({
          title: "Couldn't save the changes",
          description: 'Please check your connection and try again.',
          status: 'error',
        });
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId],
  );

  // Milestone photos belong to their milestone and are never deleted here
  const removePhoto = useCallback(
    async (p: Photo): Promise<boolean> => {
      if (p.milestoneId) return false;

      try {
        await deletePhotoRecord(roomId, p.id);
      } catch (error) {
        console.error('Error deleting photo:', error);
        showToast({
          title: "Couldn't delete the photo",
          description: 'Please check your connection and try again.',
          status: 'error',
        });
        return false;
      }

      for (const path of [p.path, p.thumbPath]) {
        if (path) deletePhoto(path).catch((e) => console.error('Error deleting photo file:', e));
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId],
  );

  return { photos, tags, loading, columns, setColumns, addPhotos, updateDetails, removePhoto };
};
