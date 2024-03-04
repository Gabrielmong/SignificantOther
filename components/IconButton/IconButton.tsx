import { Icon } from '@gluestack-ui/themed';
import { TouchableOpacity } from 'react-native';

export interface IconButtonProps {
  icon: any;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  variant?: IconButtonVariant;
}

type IconButtonVariant = 'solid' | 'outline' | 'ghost';

export const IconButton = ({
  icon,
  onPress,
  disabled,
  size = 40,
  variant = 'solid',
}: IconButtonProps) => {
  const BACKGROUNDS: Record<IconButtonVariant, string> = {
    solid: 'rgba(255, 255, 255, 0.3)',
    outline: 'transparent',
    ghost: 'transparent',
  };

  const BORDER: Record<IconButtonVariant, string> = {
    solid: 'transparent',
    outline: 'rgba(255, 255, 255, 0.3)',
    ghost: 'transparent',
  };

  const iconSize = size * 0.6;

  const backgroundColor = BACKGROUNDS[variant];
  return (
    <TouchableOpacity
      style={{
        backgroundColor: disabled ? 'rgba(255, 255, 255, 0.1)' : backgroundColor,
        width: size,
        height: size,
        borderRadius: 20,
        borderColor: BORDER[variant],
        borderWidth: variant === 'outline' ? 1 : 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      disabled={disabled}
      onPress={onPress}>
      <Icon
        as={icon}
        style={{
          color: disabled ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.8)',
          width: iconSize,
          height: iconSize,
        }}
      />
    </TouchableOpacity>
  );
};
