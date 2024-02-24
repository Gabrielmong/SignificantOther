import {
  View,
  Text,
  Input,
  InputField,
  Box,
  Button,
  Spinner,
  Image,
  set,
  Card,
} from '@gluestack-ui/themed';
import { useAppTheme, useAuth, useFirebase, useImageUpload } from '../../../hooks';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { IconButton } from '../../../components';

export default function EditProfile() {
  const { colorMode } = useAppTheme();
  const { user, editProfile } = useAuth();
  const { uploadImage, askPermission } = useImageUpload();
  const { uploadToFirebaseStorage } = useFirebase();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [hasChanged, setHasChanged] = useState(false);

  async function handleSave() {
    if (!user) return;

    setIsLoading(true);
    await editProfile({
      displayName,
      photoURL,
    });
    setIsLoading(false);
  }

  const handleUploadImage = async () => {
    askPermission();
    const res = await uploadImage();
    if (!res) return;

    const { uri, fileName } = res;

    setIsUploading(true);
    const url = await uploadToFirebaseStorage(uri, fileName);

    if (!url) return;

    setPhotoURL(url);
    setIsUploading(false);
  };

  useEffect(() => {
    if (displayName !== user?.displayName || photoURL !== user?.photoURL) {
      setHasChanged(true);
    } else {
      setHasChanged(false);
    }
  }, [displayName, photoURL]);

  return (
    <View
      $dark-backgroundColor="#121212"
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        padding: 20,
      }}>
      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />

      <Box
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <IconButton icon={ArrowLeft} onPress={router.back} />

        <Text
          style={{
            fontSize: 24,
            lineHeight: 32,
            fontWeight: 'bold',
          }}>
          Edit Profile
        </Text>

        <IconButton
          icon={isUploading ? Spinner : Save}
          onPress={handleSave}
          disabled={!hasChanged || isLoading}
        />
      </Box>

      <Box
        style={{
          width: '100%',
          paddingTop: 20,
        }}>
        <Box
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 20,
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
          }}>
          <Image
            alt="Profile Picture"
            source={{ uri: photoURL || 'https://via.placeholder.com/150' }}
            style={{ width: 100, height: 100, borderRadius: 75 }}
          />

          <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
            <Button onPress={handleUploadImage}>
              <Text>
                {isUploading ? 'Uploading...' : photoURL ? 'Change Image' : 'Upload Image'}
              </Text>
            </Button>

            {photoURL && (
              <Button onPress={() => setPhotoURL('')}>
                <Text>Remove Image</Text>
              </Button>
            )}
          </Box>
        </Box>

        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}>
          <Text>Profile Information</Text>

          <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
            <Text>Name</Text>
            <Input>
              <InputField
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display Name"
              />
            </Input>
          </Box>
          <Text>Maybe more content here later</Text>
        </Card>
      </Box>
    </View>
  );
}
