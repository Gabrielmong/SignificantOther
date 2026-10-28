import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '../state';
import { useFirebase } from './useFirebase';
import { useAppToast } from './useAppToast';
import {
  CountdownObject,
  Milestone,
  MilestoneKind,
  MilestoneObject,
  MilestonePhoto,
  Photo,
} from '../types';
import {
  ANNIVERSARY_KINDS,
  buildAnniversaryCountdown,
  resolveMilestoneId,
} from '../utils/milestones';
import { milestoneMirrorFields } from '../utils/photos';
import { PickedPhoto, uploadPhotoWithThumb, deletePhoto } from '../services/photoUpload';

export type MilestoneInput = {
  id?: string; // Missing for a new milestone
  kind: MilestoneKind;
  title: string;
  day: string;
  emoji: string;
  note?: string;
  placeId?: string | null; // undefined keeps the current place, null clears it
};

export type PhotoChange = { type: 'keep' } | { type: 'remove' } | { type: 'new'; photo: PickedPhoto };

const isAnniversaryKind = (kind: MilestoneKind) =>
  (ANNIVERSARY_KINDS as readonly MilestoneKind[]).includes(kind);

// A milestone photo is two files: the image and its gallery thumbnail
const deletePhotoFiles = (photo: MilestonePhoto) => {
  for (const path of [photo.path, photo.thumbPath]) {
    if (path) deletePhoto(path).catch((e) => console.error('Error deleting milestone photo:', e));
  }
};

// Shared milestones for the room, plus the save/delete flows that keep
// photos and anniversary countdowns in step with them.
export const useMilestones = () => {
  const uid = useAppSelector((state) => state.user.uid) || '';
  const roomId = useAppSelector((state) => state.user.roomId) || '';
  const {
    listenToMilestoneChanges,
    listenToCountdownChanges,
    setMilestone,
    deleteMilestone,
    setCountdown,
    deleteCountdown,
    newId,
    isConnected,
    getPhoto,
    updatePhoto,
    deletePhotoRecord,
  } = useFirebase();
  const { showToast } = useAppToast();

  const [milestoneObject, setMilestoneObject] = useState<MilestoneObject>({});
  const [countdowns, setCountdowns] = useState<CountdownObject>({});
  const [loading, setLoading] = useState(true);

  // Latest list for the save flow, without re-creating callbacks on every change
  const latest = useRef<MilestoneObject>({});
  latest.current = milestoneObject;

  useEffect(() => {
    if (!roomId) return;

    const unsubscribeMilestones = listenToMilestoneChanges((data) => {
      setMilestoneObject(data);
      setLoading(false);
    }, roomId);
    const unsubscribeCountdowns = listenToCountdownChanges(
      (data) => setCountdowns(data.countdowns),
      roomId,
    );

    return () => {
      unsubscribeMilestones();
      unsubscribeCountdowns();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Oldest first, so the list reads as a story
  const milestones = useMemo(
    () =>
      Object.values(milestoneObject).sort(
        (a, b) => a.day.localeCompare(b.day) || a.createdAt - b.createdAt,
      ),
    [milestoneObject],
  );

  const saveMilestone = useCallback(
    async (
      input: MilestoneInput,
      photo: PhotoChange,
      options?: { replaceCountdownId?: string },
    ): Promise<boolean> => {
      // Offline, Firebase writes wait silently instead of failing; say so up front
      if (!(await isConnected())) {
        showToast({
          title: "You're offline",
          description: 'Connect to the internet to save this milestone.',
          status: 'error',
        });
        return false;
      }

      const edited: Milestone | undefined = input.id ? latest.current[input.id] : undefined;
      // Special kinds live at a fixed id ("dating"), so they can't be duplicated
      const id = resolveMilestoneId(input.kind, edited, newId);
      const existing: Milestone | undefined = latest.current[id];
      const previous: Milestone | undefined = edited ?? existing;

      // 1. Upload a new photo first, so the milestone is written once
      let uploaded: MilestonePhoto | undefined;
      if (photo.type === 'new') {
        try {
          uploaded = await uploadPhotoWithThumb(photo.photo, `rooms/${roomId}/milestones/${id}`);
        } catch (error) {
          console.error('Error uploading milestone photo:', error);
          showToast({
            title: "Couldn't upload the photo",
            description: 'Your milestone was not saved. Please try again.',
            status: 'error',
          });
          return false;
        }
      }

      const placeId = input.placeId === undefined ? previous?.placeId : input.placeId || undefined;
      const nextPhoto =
        photo.type === 'new' ? uploaded : photo.type === 'keep' ? previous?.photo : undefined;
      const note = input.note?.trim();

      // RTDB rejects undefined values, so optional keys are only added when set
      const milestone: Milestone = {
        id,
        kind: input.kind,
        title: input.title.trim(),
        day: input.day,
        emoji: input.emoji,
        createdAt: previous?.createdAt ?? Date.now(),
        createdBy: previous?.createdBy ?? uid,
        ...(previous ? { updatedAt: Date.now() } : {}),
        ...(note ? { note } : {}),
        ...(nextPhoto ? { photo: nextPhoto } : {}),
        ...(placeId ? { placeId } : {}),
      };

      // 2. Write the milestone; on failure, don't leave the upload behind
      try {
        await setMilestone(roomId, milestone);
      } catch (error) {
        console.error('Error saving milestone:', error);
        if (uploaded) deletePhotoFiles(uploaded);
        showToast({
          title: "Couldn't save the milestone",
          description: 'Please check your connection and try again.',
          status: 'error',
        });
        return false;
      }

      // 3. Photos no longer referenced (the edited one's, and one it overwrote)
      for (const old of [previous?.photo, existing !== previous ? existing?.photo : undefined]) {
        if (old && old.path !== nextPhoto?.path) deletePhotoFiles(old);
      }

      // A type change moved the milestone to a new id; drop the old record
      if (edited && edited.id !== id) {
        deleteMilestone(roomId, edited.id).catch((e) =>
          console.error('Error removing moved milestone:', e),
        );
      }

      // 4. Keep the anniversary countdown in step
      try {
        if (edited && edited.id !== id && isAnniversaryKind(edited.kind)) {
          await deleteCountdown(roomId, `ms-${edited.id}`);
        }
        if (isAnniversaryKind(milestone.kind)) {
          await setCountdown(roomId, buildAnniversaryCountdown(milestone, new Date(), uid));
          if (options?.replaceCountdownId) {
            await deleteCountdown(roomId, options.replaceCountdownId);
          }
        } else if (previous && previous.id === id && isAnniversaryKind(previous.kind)) {
          await deleteCountdown(roomId, `ms-${id}`);
        }
      } catch (error) {
        console.error('Error syncing anniversary countdown:', error);
        showToast({
          title: "Couldn't update the countdown",
          description: 'The milestone was saved, but its anniversary countdown was not updated.',
          status: 'error',
        });
      }

      // 5. Keep the milestone's gallery entry in step. Written with update, so
      //    tags and a description added in the gallery are kept.
      try {
        let carried: Partial<Photo> = {};
        if (edited && edited.id !== id) {
          const old = await getPhoto(roomId, `ms-${edited.id}`);
          if (old) {
            carried = {
              ...(old.tags ? { tags: old.tags } : {}),
              ...(old.description ? { description: old.description } : {}),
            };
            await deletePhotoRecord(roomId, `ms-${edited.id}`);
          }
        }

        if (milestone.photo) {
          const current = await getPhoto(roomId, `ms-${id}`);
          await updatePhoto(roomId, `ms-${id}`, {
            ...milestoneMirrorFields(milestone, Date.now()),
            // The mirror's place follows the milestone, including clearing it
            placeId: milestone.placeId ?? null,
            ...carried,
            createdAt: current?.createdAt ?? Date.now(),
            createdBy: current?.createdBy ?? uid,
          });
        } else if (previous?.photo) {
          await deletePhotoRecord(roomId, `ms-${id}`);
        }
      } catch (error) {
        console.error('Error syncing milestone gallery photo:', error);
        showToast({
          title: "Couldn't update the gallery",
          description: 'The milestone was saved, but its photo was not updated in the gallery.',
          status: 'error',
        });
      }

      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, uid],
  );

  const removeMilestone = useCallback(
    async (m: Milestone): Promise<boolean> => {
      try {
        await deleteMilestone(roomId, m.id);
      } catch (error) {
        console.error('Error deleting milestone:', error);
        showToast({
          title: "Couldn't delete the milestone",
          description: 'Please check your connection and try again.',
          status: 'error',
        });
        return false;
      }

      if (m.photo) {
        deletePhotoFiles(m.photo);
        deletePhotoRecord(roomId, `ms-${m.id}`).catch((e) =>
          console.error('Error removing milestone gallery photo:', e),
        );
      }
      if (isAnniversaryKind(m.kind)) {
        deleteCountdown(roomId, `ms-${m.id}`).catch((e) =>
          console.error('Error deleting anniversary countdown:', e),
        );
      }

      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId],
  );

  return { milestones, loading, countdowns, saveMilestone, removeMilestone };
};
