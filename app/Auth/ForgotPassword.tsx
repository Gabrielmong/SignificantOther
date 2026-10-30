import { Mail } from 'lucide-react-native';
import { useState } from 'react';

import { AuthButton, AuthInput, AuthScreen } from '../../components';
import { useAuth } from '../../hooks';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleForgotPassword = async () => {
    setLoading(true);
    await forgotPassword(email);

    setLoading(false);
  };

  return (
    <AuthScreen
      title="Forgot password"
      subtitle="We'll email you a link to choose a new one"
      showBack>
      <AuthInput
        icon={Mail}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        inputMode="email"
        keyboardType="email-address"
        autoComplete="email"
      />

      <AuthButton title="Send reset link" onPress={handleForgotPassword} loading={loading} />
    </AuthScreen>
  );
}
