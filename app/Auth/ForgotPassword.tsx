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
import { useAuth } from '../../hooks';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { AuthFooter } from '../../components';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleForgotPassword = async () => {
    setLoading(true);
    const success = await forgotPassword(email);

    setLoading(false);
    if (success) {
      console.log('Forgot password success');
    } else {
      console.log('Forgot password failed');
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
          Forgot Password
        </Text>

        <Input>
          <InputField placeholder="Email" value={email} onChangeText={setEmail} />
        </Input>

        <Button onPress={handleForgotPassword} isDisabled={loading}>
          <Text>Sign In</Text>

          {loading && <ButtonSpinner />}
        </Button>
      </Box>

      <AuthFooter />
    </View>
  );
}
