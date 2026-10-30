import { HStack, Text } from '@gluestack-ui/themed';
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

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const { theme } = useAppTheme();

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const success = await signInWithGoogle();

    if (success) {
      router.replace('/(tabs)/Home');
    }

    setGoogleLoading(false);
  };

  return (
    <AuthScreen title="Create your account" subtitle="Then invite your person to join you" showBack>
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
        autoComplete="new-password"
        secure
      />

      <AuthInput
        icon={Lock}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        autoComplete="new-password"
        isInvalid={passwordsMismatch}
        secure
      />

      {passwordsMismatch && (
        <Text
          style={{
            color: theme.colors.error,
            fontSize: theme.fontSize.sm,
            marginTop: -theme.spacing[2],
          }}>
          Passwords don&apos;t match
        </Text>
      )}

      <AuthButton
        title="Sign Up"
        onPress={handleSignUp}
        loading={loading}
        disabled={googleLoading || passwordsMismatch}
      />

      <AuthDivider />

      <GoogleSignInButton onPress={handleGoogleSignIn} loading={googleLoading} disabled={loading} />

      <HStack style={{ justifyContent: 'center', gap: theme.spacing[1] }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.md }}>
          Already have an account?
        </Text>
        <Link href="/Auth/Signin">
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            Sign In
          </Text>
        </Link>
      </HStack>
    </AuthScreen>
  );
}
