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
  const { colorMode } = useAppTheme();
  const { forgotPassword } = useAuth();

  const handleForgotPassword = async () => {
    setLoading(true);
    const success = await forgotPassword(email);

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
        }}>
        <IconButton icon={ArrowLeft} onPress={router.back} />
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
          <Text>Send code</Text>

          {loading && <ButtonSpinner />}
        </Button>
      </Box>

      <AuthFooter />
    </View>
  );
}
