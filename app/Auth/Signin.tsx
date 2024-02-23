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

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    setLoading(true);
    const success = await signIn(email, password);

    setLoading(false);
    if (success) {
      console.log('Sign in success');
      router.replace('/(tabs)/Home');
    } else {
      console.log('Sign in failed');
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
      }}>
      <Box
        style={{
          width: '100%',
        }}></Box>

      <Box
        style={{
          width: '100%',
          gap: 20,
        }}>
        <Text
          style={{
            fontSize: 24,
            lineHeight: 32,
            fontWeight: 'bold',
          }}>
          Significant Other
        </Text>

        <Input>
          <InputField placeholder="Email" value={email} onChangeText={setEmail} />
        </Input>

        <Input>
          <InputField
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </Input>

        <Button onPress={handleSignIn} isDisabled={loading}>
          <Text>Sign In</Text>

          {loading && <ButtonSpinner />}
        </Button>

        <HStack
          style={{
            justifyContent: 'space-between',
          }}>
          <Link href="/Auth/Signup">
            <Text>Sign Up</Text>
          </Link>

          <Link href="/Auth/ForgotPassword">
            <Text>Forgot Password?</Text>
          </Link>
        </HStack>
      </Box>

      <AuthFooter />
    </View>
  );
}
