import { useFirebase } from './useFirebase';
import {
  launchImageLibraryAsync,
  MediaTypeOptions,
  useMediaLibraryPermissions,
} from 'expo-image-picker';
import { useAppToast } from './useAppToast';

export const useImageUpload = () => {
  const { showToast } = useAppToast();
  const [status, requestPermission] = useMediaLibraryPermissions();

  const uploadImage = async (): Promise<void | { uri: string; fileName: string }> => {
    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      selectionLimit: 1,
    });

    if (result.canceled) {
      showToast({
        title: 'Image upload',
        description: 'Image upload cancelled',
        status: 'info',
      });
    } else {
      const { uri, fileName } = result.assets[0];

      const fallbackName = new Date().getTime().toString() + '.jpg';

      return { uri, fileName: fileName || fallbackName };
    }
  };

  const askPermission = async () => {
    if (status?.status !== 'granted') {
      requestPermission();
    }
  };

  return { uploadImage, askPermission };
};
