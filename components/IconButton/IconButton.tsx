import { Icon } from '@gluestack-ui/themed';
import { TouchableOpacity } from 'react-native';

export interface IconButtonProps {
  icon: any;
  onPress: () => void;
  disabled?: boolean;
}

export const IconButton = ({ icon, onPress, disabled }: IconButtonProps) => {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: disabled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)',
        width: 40,
        height: 40,
        borderRadius: 20,
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
          width: 20,
          height: 20,
        }}
      />
    </TouchableOpacity>
  );
};
