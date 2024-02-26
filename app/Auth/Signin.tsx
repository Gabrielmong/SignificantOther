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
  const { colorMode } = useAppTheme();

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
          <InputField
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            inputMode="email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Input>

        <Input>
          <InputField
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!visible}
          />

          <TouchableOpacity
            style={{
              width: 40,
              borderRadius: 20,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setVisible(!visible)}>
            <Icon
              as={visible ? EyeOff : Eye}
              style={{
                color: 'grey',
                width: 30,
                height: 30,
              }}
            />
          </TouchableOpacity>
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
