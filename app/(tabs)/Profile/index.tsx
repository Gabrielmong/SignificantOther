import { StatusBar } from 'expo-status-bar';
import { Text, View, Button, Image, Box } from '@gluestack-ui/themed';
import { useAuth } from '../../../hooks/useAuth';
import { useAppSelector } from '../../../state';
import { useAppTheme } from '../../../hooks';
import { router } from 'expo-router';
import { IconButton } from '../../../components';
import { Edit } from 'lucide-react-native';

export default function Profile() {
  const user = useAppSelector((state) => state.user);
  const { colorMode } = useAppTheme();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  function handleEdit() {
    router.push('/(tabs)/Profile/EditProfile');
  }

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
