import { StatusBar } from 'expo-status-bar';
import {
  Input,
  InputField,
  Button,
  ButtonSpinner,
  View,
  Text,
  Box,
  Icon,
} from '@gluestack-ui/themed';
import { useState } from 'react';

import { Link, router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { AuthFooter } from '../../components/AuthFooter/AuthFooter';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';
import { IconButton } from '../../components';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const { signUp } = useAuth();
  const { theme } = useAppTheme();

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      return;
    }
    setLoading(true);
    const success = await signUp(email, password);
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

        <Input
          variant="outline"
          style={{
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.inputBackground,
          }}>
          <InputField
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!confirmVisible}
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
            onPress={() => setConfirmVisible(!confirmVisible)}>
            <Icon
              as={confirmVisible ? EyeOff : Eye}
              style={{
                color: theme.colors.textTertiary,
                width: 24,
                height: 24,
              }}
            />
          </TouchableOpacity>
        </Input>

        <Button
          onPress={handleSignUp}
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
            Sign Up
          </Text>

          {loading && (
            <ButtonSpinner
              style={{
                marginLeft: theme.spacing[2],
              }}
            />
          )}
        </Button>

        <Link href="/Auth/Signin">
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.medium,
            }}>
            Sign In
          </Text>
        </Link>
      </Box>

      <AuthFooter />
    </View>
  );
}
