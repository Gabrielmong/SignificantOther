import {
  Input,
  InputField,
  ButtonSpinner,
  Box,
  View,
  Button,
  Text,
  Icon,
} from '@gluestack-ui/themed';
import { useState } from 'react';
import { useAppTheme, useAuth } from '../../hooks';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { AuthFooter, IconButton } from '../../components';
import { StatusBar } from 'expo-status-bar';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useAppTheme();
  const { forgotPassword } = useAuth();

  const handleForgotPassword = async () => {
    setLoading(true);
    const success = await forgotPassword(email);

    setLoading(false);
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
        }}>
        <IconButton icon={ArrowLeft} onPress={router.back} variant="ghost" />
      </Box>

      <Box
        style={{
          width: '100%',
          gap: theme.spacing[5],
        }}>
        <Text
          style={{
            fontSize: theme.fontSize['3xl'],
            lineHeight: theme.lineHeight.tight * theme.fontSize['3xl'],
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
            textAlign: 'center',
          }}>
          Forgot Password
        </Text>

        <Input
          variant="outline"
          style={{
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.inputBackground,
          }}>
          <InputField
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.text,
            }}
          />
        </Input>

        <Button
          onPress={handleForgotPassword}
          isDisabled={loading}
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radii.md,
            ...theme.shadows.sm,
          }}>
          <Text
            style={{
              color: theme.colors.white,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            Send code
          </Text>

          {loading && <ButtonSpinner />}
        </Button>
      </Box>

      <AuthFooter />
    </View>
  );
}
