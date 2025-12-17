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
  const { theme } = useAppTheme();
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
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        padding: theme.commonSpacing.screenPadding,
        backgroundColor: theme.colors.background,
      }}>
      <StatusBar backgroundColor={theme.colors.background} />

      <Box
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <IconButton icon={ArrowLeft} onPress={router.back} variant="ghost" />

        <Text
          style={{
            fontSize: theme.fontSize['2xl'],
            lineHeight: theme.lineHeight.tight * theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
          }}>
          Edit Profile
        </Text>

        <IconButton
          icon={isUploading ? Spinner : Save}
          onPress={handleSave}
          disabled={!hasChanged || isLoading}
          variant="primary"
        />
      </Box>

      <Box
        style={{
          width: '100%',
          paddingTop: theme.spacing[5],
        }}>
        <Box
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: theme.spacing[5],
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.commonSpacing.screenPadding,
          }}>
          <Image
            alt="Profile Picture"
            source={{ uri: photoURL || 'https://via.placeholder.com/150' }}
            style={{
              width: 100,
              height: 100,
              borderRadius: theme.radii.full,
              borderWidth: 3,
              borderColor: theme.colors.primary,
            }}
          />

          <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[3],
            }}>
            <Button
              onPress={handleUploadImage}
              style={{
                backgroundColor: theme.colors.primary,
                ...theme.shadows.sm,
              }}>
              <Text
                style={{
                  color: theme.colors.white,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                }}>
                {isUploading ? 'Uploading...' : photoURL ? 'Change Image' : 'Upload Image'}
              </Text>
            </Button>

            {photoURL && (
              <Button
                onPress={() => setPhotoURL('')}
                variant="outline"
                style={{
                  borderColor: theme.colors.border,
                }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.semibold,
                  }}>
                  Remove Image
                </Text>
              </Button>
            )}
          </Box>
        </Box>

        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[5],
            padding: theme.commonSpacing.cardPadding,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.lg,
            ...theme.shadows.md,
          }}>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            Profile Information
          </Text>

          <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}>
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                color: theme.colors.text,
              }}>
              Name
            </Text>
            <Input
              variant="outline"
              style={{
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.inputBackground,
              }}>
              <InputField
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display Name"
                style={{
                  fontSize: theme.fontSize.md,
                  color: theme.colors.text,
                }}
              />
            </Input>
          </Box>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
            Maybe more content here later
          </Text>
        </Card>
      </Box>
    </View>
  );
}
