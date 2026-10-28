import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import uuid from 'react-native-uuid';
import type { MilestonePhoto } from '../types';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

export type PickedPhoto = { uri: string; width: number; height: number };

// Resizes a picked photo (long edge at most 1600px, JPEG) and uploads it to
// `${folder}/{uuid}.jpg`. Throws on failure; callers decide how to report it.
export const uploadResizedPhoto = async (
  photo: PickedPhoto,
  folder: string,
): Promise<MilestonePhoto> => {
  // Loaded lazily: it's a native module, and a dev build made before it was
  // added would otherwise crash on startup instead of only failing here.
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');

  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > MAX_EDGE) {
    context.resize(photo.width >= photo.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  const resized = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  const blob = await (await fetch(resized.uri)).blob();
  const path = `${folder}/${uuid.v4().toString()}.jpg`;
  const storage = getStorage();
  // Fail within 30s instead of retrying for the default 10 minutes
  storage.maxUploadRetryTime = 30000;
  const fileRef = ref(storage, path);

  await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
  return { url: await getDownloadURL(fileRef), path };
};

// Deletes an uploaded photo. A file that's already gone is not an error.
export const deletePhoto = async (path: string): Promise<void> => {
  try {
    await deleteObject(ref(getStorage(), path));
  } catch (error: any) {
    if (error?.code !== 'storage/object-not-found') throw error;
  }
};
