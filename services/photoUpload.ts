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

const THUMB_EDGE = 400;
const THUMB_QUALITY = 0.7;

export type UploadedPhoto = {
  url: string;
  path: string;
  thumbUrl: string;
  thumbPath: string;
  width: number;
  height: number;
};

// Saves a resized JPEG copy of `uri` with its long edge at most `maxEdge`
const renderJpeg = async (photo: PickedPhoto, maxEdge: number, compress: number) => {
  // Loaded lazily, see uploadResizedPhoto
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');

  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > maxEdge) {
    context.resize(photo.width >= photo.height ? { width: maxEdge } : { height: maxEdge });
  }
  const image = await context.renderAsync();
  return image.saveAsync({ compress, format: SaveFormat.JPEG });
};

const uploadFile = async (uri: string, path: string): Promise<string> => {
  const blob = await (await fetch(uri)).blob();
  const storage = getStorage();
  // Fail within 30s instead of retrying for the default 10 minutes
  storage.maxUploadRetryTime = 30000;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(fileRef);
};

// Uploads a picked photo twice: the full image (≤ 1600px) as
// `${folder}/{uuid}.jpg` and a grid thumbnail (≤ 400px) as
// `${folder}/{uuid}_thumb.jpg`. If the thumbnail fails, the full image is
// removed again so nothing is left behind. Throws on failure.
export const uploadPhotoWithThumb = async (
  photo: PickedPhoto,
  folder: string,
): Promise<UploadedPhoto> => {
  const full = await renderJpeg(photo, MAX_EDGE, JPEG_QUALITY);
  const thumb = await renderJpeg(photo, THUMB_EDGE, THUMB_QUALITY);

  const name = uuid.v4().toString();
  const path = `${folder}/${name}.jpg`;
  const thumbPath = `${folder}/${name}_thumb.jpg`;

  const url = await uploadFile(full.uri, path);
  try {
    const thumbUrl = await uploadFile(thumb.uri, thumbPath);
    return { url, path, thumbUrl, thumbPath, width: full.width, height: full.height };
  } catch (error) {
    deletePhoto(path).catch((e) => console.error('Error cleaning up photo:', e));
    throw error;
  }
};

// Deletes an uploaded photo. A file that's already gone is not an error.
export const deletePhoto = async (path: string): Promise<void> => {
  try {
    await deleteObject(ref(getStorage(), path));
  } catch (error: any) {
    if (error?.code !== 'storage/object-not-found') throw error;
  }
};
