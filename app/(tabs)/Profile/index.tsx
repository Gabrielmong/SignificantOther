import { StatusBar } from 'expo-status-bar';
import { Text, View, Button } from '@gluestack-ui/themed';
import { useAuth } from '../../../hooks/useAuth';
import { useAppSelector } from '../../../state';

export default function Profile() {
  const user = useAppSelector((state) => state.user);
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <View
      $dark-backgroundColor="#121212"
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text>Profile Goes Here</Text>

      <Text>UID: {user?.uid}</Text>
      <Text>Email: {user?.email}</Text>
      <Text>Displayname: {user?.displayName || 'Not set'}</Text>
      <Text>PhotoURL: {user?.photoURL || 'Not set'}</Text>

      <Button onPress={handleLogout}>
        <Text>Logout</Text>
      </Button>

      <StatusBar style="auto" />
    </View>
  );
}
