import { Box, HStack, Text } from '@gluestack-ui/themed';
import { Link, router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';

import {
  AuthButton,
  AuthDivider,
  AuthInput,
  AuthScreen,
  GoogleSignInButton,
} from '../../components';
import { useAppTheme } from '../../hooks';
import { useAuth } from '../../hooks/useAuth';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signIn, signInWithGoogle } = useAuth();
  const { theme } = useAppTheme();

  const handleSignIn = async () => {
    setLoading(true);
    const success = await signIn(email, password);

    if (success) {
      router.replace('/(tabs)/Home');
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const success = await signInWithGoogle();

    if (success) {
      router.replace('/(tabs)/Home');
    }

    setGoogleLoading(false);
  };

  return (
    <AuthScreen title="Significant Other" subtitle="Welcome back, your person is waiting">
      <AuthInput
        icon={Mail}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        inputMode="email"
        keyboardType="email-address"
        autoComplete="email"
      />

      <AuthInput
        icon={Lock}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        secure
      />

      <Box style={{ alignItems: 'flex-end', marginTop: -theme.spacing[1] }}>
        <Link href="/Auth/ForgotPassword">
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
            }}>
            Forgot password?
          </Text>
        </Link>
      </Box>

      <AuthButton
        title="Sign In"
        onPress={handleSignIn}
        loading={loading}
        disabled={googleLoading}
      />

      <AuthDivider />

      <GoogleSignInButton onPress={handleGoogleSignIn} loading={googleLoading} disabled={loading} />

      <HStack style={{ justifyContent: 'center', gap: theme.spacing[1] }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.md }}>
          New here?
        </Text>
        <Link href="/Auth/Signup">
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            Create an account
          </Text>
        </Link>
      </HStack>
    </AuthScreen>
  );
}
