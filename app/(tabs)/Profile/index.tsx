import { StatusBar } from 'expo-status-bar';
import { Text, View, Button, Image, Box, Switch, HStack, VStack } from '@gluestack-ui/themed';
import { useAuth } from '../../../hooks/useAuth';
import { useAppSelector } from '../../../state';
import { useAppTheme, useAppToast } from '../../../hooks';
import { router } from 'expo-router';
import { IconButton, NotificationsModal } from '../../../components';
import { Edit, Copy, Moon, Sun } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { useState } from 'react';

export default function Profile() {
  const user = useAppSelector((state) => state.user);
  const { theme, colorMode, toggleColorMode } = useAppTheme();
  const { logout } = useAuth();
  const { showToast } = useAppToast();
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

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
        title: 'Board ID copied',
        status: 'success',
        description: 'You can now share the ID with your significant other',
      });
    });
  };

  const handleModalOpen = () => {
    setNotificationsModalVisible(true);
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
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
        <Box>
          <Text
            style={{
              fontSize: theme.fontSize['2xl'],
              lineHeight: theme.lineHeight.tight * theme.fontSize['2xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            Profile
          </Text>
        </Box>

        <IconButton icon={Edit} onPress={handleEdit} variant="ghost" />
      </Box>

      <VStack
        style={{
          width: '100%',
          gap: theme.spacing[5],
          alignItems: 'center',
          flex: 1,
        }}>
        <Image
          alt="Profile Picture"
          source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }}
          style={{
            width: 100,
            height: 100,
            borderRadius: 100,
            ...theme.shadows.md,
          }}
        />

        <Text
          style={{
            fontSize: theme.fontSize.xl,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
          }}>
          {user?.displayName || 'Name not set'}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
          {user?.email}
        </Text>

        <Box
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.md,
            ...theme.shadows.sm,
          }}>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
            Room ID:
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: theme.colors.text,
            }}>
            {user?.roomId}
          </Text>
          <IconButton icon={Copy} onPress={handleCopyWhiteboardId} variant="ghost" size={32} />
        </Box>
      </VStack>

      <VStack
        style={{
          width: '100%',
          gap: theme.spacing[3],
        }}>
        {/* Theme Toggle */}
        <HStack
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing[4],
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.md,
            ...theme.shadows.sm,
          }}>
          <HStack
            style={{
              alignItems: 'center',
              gap: theme.spacing[3],
            }}>
            {colorMode === 'dark' ? (
              <Moon size={20} color={theme.colors.text} />
            ) : (
              <Sun size={20} color={theme.colors.text} />
            )}
            <Text
              style={{
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.medium,
                color: theme.colors.text,
              }}>
              {colorMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </HStack>
          <Switch
            value={colorMode === 'dark'}
            onValueChange={toggleColorMode}
            trackColor={{
              false: theme.colors.textTertiary,
              true: theme.colors.primary,
            }}
          />
        </HStack>

        <Button
          onPress={handleModalOpen}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.md,
            ...theme.shadows.sm,
          }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            Notification Settings
          </Text>
        </Button>

        <Button
          onPress={handleLogout}
          style={{
            backgroundColor: theme.colors.error,
            borderRadius: theme.radii.md,
            ...theme.shadows.sm,
          }}>
          <Text
            style={{
              color: theme.colors.white,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            Logout
          </Text>
        </Button>
      </VStack>

      <NotificationsModal
        isOpen={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
        onSave={() => setNotificationsModalVisible(false)}
      />
    </View>
  );
}
