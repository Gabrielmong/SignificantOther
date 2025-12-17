import { StatusBar } from 'expo-status-bar';
import {
  Input,
  InputField,
  Button,
  ButtonSpinner,
  View,
  Text,
  Box,
  HStack,
  Icon,
} from '@gluestack-ui/themed';
import { useEffect, useState } from 'react';
import { Link, router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { AuthFooter } from '../../components';
import { Eye, EyeOff } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const { signIn } = useAuth();
  const { theme } = useAppTheme();

  const handleSignIn = async () => {
    setLoading(true);
    const success = await signIn(email, password);

    if (success) {
      router.replace('/(tabs)/Home');
    }

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
        }}></Box>

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
          Significant Other
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
            inputMode="email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.text,
            }}
          />
        </Input>

        <Input
          variant="outline"
          style={{
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.inputBackground,
          }}>
          <InputField
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!visible}
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.text,
            }}
          />

          <TouchableOpacity
            style={{
              width: 40,
              borderRadius: theme.radii.full,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setVisible(!visible)}>
            <Icon
              as={visible ? EyeOff : Eye}
              style={{
                color: theme.colors.textTertiary,
                width: 24,
                height: 24,
              }}
            />
          </TouchableOpacity>
        </Input>

        <Button
          onPress={handleSignIn}
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
            Sign In
          </Text>

          {loading && <ButtonSpinner />}
        </Button>

        <HStack
          style={{
            justifyContent: 'space-between',
          }}>
          <Link href="/Auth/Signup">
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.medium,
              }}>
              Sign Up
            </Text>
          </Link>

          <Link href="/Auth/ForgotPassword">
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.medium,
              }}>
              Forgot Password?
            </Text>
          </Link>
        </HStack>
      </Box>

      <AuthFooter />
    </View>
  );
}
