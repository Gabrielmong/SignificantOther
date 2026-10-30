import { Icon, Input, InputField, InputSlot } from '@gluestack-ui/themed';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { TextInputProps, TouchableOpacity } from 'react-native';

import { useAppTheme } from '../../hooks';

interface AuthInputProps {
  icon: any;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Hides the text and adds a show/hide toggle */
  secure?: boolean;
  isInvalid?: boolean;
  inputMode?: TextInputProps['inputMode'];
  keyboardType?: TextInputProps['keyboardType'];
  autoComplete?: TextInputProps['autoComplete'];
}

export const AuthInput: React.FC<AuthInputProps> = ({
  icon,
  placeholder,
  value,
  onChangeText,
  secure,
  isInvalid,
  inputMode,
  keyboardType,
  autoComplete,
}) => {
  const { theme } = useAppTheme();
  const [visible, setVisible] = useState(false);

  return (
    <Input
      variant="outline"
      size="xl"
      isInvalid={isInvalid}
      style={{
        borderRadius: theme.radii.lg,
        backgroundColor: theme.colors.inputBackground,
        borderColor: isInvalid ? theme.colors.error : theme.colors.border,
      }}>
      <InputSlot style={{ paddingLeft: theme.spacing[3] }}>
        <Icon as={icon} style={{ color: theme.colors.textTertiary, width: 20, height: 20 }} />
      </InputSlot>

      <InputField
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure && !visible}
        inputMode={inputMode}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          fontSize: theme.fontSize.md,
          color: theme.colors.text,
        }}
      />

      {secure && (
        <TouchableOpacity
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          style={{
            width: 44,
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setVisible(!visible)}>
          <Icon
            as={visible ? EyeOff : Eye}
            style={{ color: theme.colors.textTertiary, width: 22, height: 22 }}
          />
        </TouchableOpacity>
      )}
    </Input>
  );
};
