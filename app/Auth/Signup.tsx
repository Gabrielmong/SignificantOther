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
import { useEffect, useState } from 'react';

import { Link, router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { AuthFooter } from '../../components/AuthFooter/AuthFooter';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const { signUp } = useAuth();

  // TODO: put this in useAuth hook
  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      console.log('Password does not match');
      return;
    }

    setLoading(true);
    const success = await signUp(email, password);

    setLoading(false);
    if (success) {
      console.log('Sign up success');

      router.replace('/(tabs)/Home');
    } else {
      console.log('Sign up failed');
    }
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
      <Box
        style={{
          width: '100%',
        }}>
        <TouchableOpacity
          style={{
            backgroundColor: 'grey',
            width: 40,
            height: 40,
            borderRadius: 20,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => {
            router.back();
          }}>
          <Icon
            as={ArrowLeft}
            style={{
              color: 'white',
              width: 20,
              height: 20,
            }}
          />
        </TouchableOpacity>
      </Box>

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
            secureTextEntry={visible}
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

        <Input>
          <InputField
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={confirmVisible}
          />

          <TouchableOpacity
            style={{
              width: 40,
              borderRadius: 20,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setConfirmVisible(!confirmVisible)}>
            <Icon
              as={confirmVisible ? EyeOff : Eye}
              style={{
                color: 'grey',
                width: 30,
                height: 30,
              }}
            />
          </TouchableOpacity>
        </Input>

        <Button onPress={handleSignUp} isDisabled={loading}>
          <Text>Sign Up</Text>

          {loading && <ButtonSpinner />}
        </Button>

        <Link href="/Auth/Signin">
          <Text>Sign In</Text>
        </Link>
      </Box>

      <AuthFooter />
    </View>
  );
}
