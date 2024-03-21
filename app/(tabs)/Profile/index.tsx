import { StatusBar } from 'expo-status-bar';
import { Text, View, Button, Image, Box } from '@gluestack-ui/themed';
import { useAuth } from '../../../hooks/useAuth';
import { useAppSelector } from '../../../state';
import { useAppTheme, useAppToast } from '../../../hooks';
import { router } from 'expo-router';
import { IconButton } from '../../../components';
import { Edit, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

export default function Profile() {
  const user = useAppSelector((state) => state.user);
  const { colorMode } = useAppTheme();
  const { logout } = useAuth();
  const { showToast } = useAppToast();

  async function handleLogout() {
    await logout();
  }

  function handleEdit() {
    router.push('/(tabs)/Profile/EditProfile');
  }

  const handleCopyWhiteboardId = () => {
    if (!user.roomId) return;

    Clipboard.setStringAsync(user.roomId).then(() => {
      showToast({
        title: 'Whiteboard ID copied',
        status: 'success',
        description: 'You can now share the ID with your significant other',
      });
    });
  };

  return (
    <View
      $dark-backgroundColor="#121212"
      style={{
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
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
        <Box>
          <Text
            style={{
              fontSize: 24,
              lineHeight: 32,
              fontWeight: 'bold',
            }}>
            Profile
          </Text>
        </Box>

        <IconButton icon={Edit} onPress={handleEdit} />
      </Box>

      <Box
        style={{
          width: '100%',
          gap: 20,
          alignItems: 'center',
          flex: 1,
        }}>
        <Image
          alt="Profile Picture"
          source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }}
          style={{ width: 100, height: 100, borderRadius: 100 }}
        />

        <Text>{user?.displayName || 'Name not set'}</Text>
        <Text>{user?.email}</Text>

        <Box
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
          }}>
          <Text>{user?.roomId}</Text>
          <IconButton icon={Copy} onPress={handleCopyWhiteboardId} variant="ghost" size={15} />
        </Box>
      </Box>

      <Box
        style={{
          width: '100%',
          gap: 10,
        }}>
        <Button
          onPress={handleLogout}
          style={{
            backgroundColor: 'red',
          }}>
          <Text>Logout</Text>
        </Button>
      </Box>
    </View>
  );
}
