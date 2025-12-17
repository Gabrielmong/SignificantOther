import { Icon } from '@gluestack-ui/themed';
import { TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';
import { applyOpacity } from '../../config/theme';

export interface IconButtonProps {
  icon: any;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  variant?: IconButtonVariant;
}

type IconButtonVariant = 'solid' | 'outline' | 'ghost' | 'primary' | 'secondary';

export const IconButton = ({
  icon,
  onPress,
  disabled,
  size = 40,
  variant = 'solid',
}: IconButtonProps) => {
  const { theme } = useAppTheme();

  const getBackgroundColor = (): string => {
    if (disabled) {
      return applyOpacity(theme.colors.text, 0.1);
    }

    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'solid':
        return applyOpacity(theme.colors.text, 0.3);
      case 'outline':
      case 'ghost':
      default:
        return 'transparent';
    }
  };

  const getBorderColor = (): string => {
    switch (variant) {
      case 'outline':
        return applyOpacity(theme.colors.text, 0.3);
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      default:
        return 'transparent';
    }
  };

  const getIconColor = (): string => {
    if (disabled) {
      return applyOpacity(theme.colors.text, 0.5);
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
        return theme.colors.white;
      default:
        return applyOpacity(theme.colors.text, 0.8);
    }
  };

  const iconSize = size * 0.6;

  return (
    <TouchableOpacity
      style={{
        backgroundColor: getBackgroundColor(),
        width: size,
        height: size,
        borderRadius: theme.radii.xl,
        borderColor: getBorderColor(),
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
          color: getIconColor(),
          width: iconSize,
          height: iconSize,
        }}
      />
    </TouchableOpacity>
  );
};
