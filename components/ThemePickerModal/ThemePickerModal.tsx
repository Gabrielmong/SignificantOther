import {
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  Modal,
  ModalBody,
  Box,
  Text,
} from '@gluestack-ui/themed';
import { Pressable } from 'react-native';

import {
  ACCENT_IDS,
  accentThemes,
  partnerPair,
  readableTextOn,
  type AccentId,
} from '../../config/theme';
import { useAppTheme } from '../../hooks';

const Bubble = ({
  color,
  label,
  alignSelf,
}: {
  color: string;
  label: string;
  alignSelf: 'flex-start' | 'flex-end';
}) => (
  <Box
    style={{
      alignSelf,
      backgroundColor: color,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    }}>
    <Text style={{ fontSize: 11, color: readableTextOn(color) }}>{label}</Text>
  </Box>
);

export const ThemePickerModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { theme, colorMode, accentId, partnerAccentId, setAccentId } = useAppTheme();

  const renderCard = (id: AccentId) => {
    const shades = accentThemes[id][colorMode];
    const partnerColor = partnerPair(colorMode, id, partnerAccentId).solid;
    const selected = id === accentId;

    return (
      <Pressable
        key={id}
        onPress={() => setAccentId(id)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${accentThemes[id].name} theme`}
        style={{
          width: '48%',
          padding: theme.spacing[3],
          gap: theme.spacing[2],
          borderRadius: theme.radii.md,
          borderWidth: 2,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
        }}>
        <Box style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <Box style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: shades.main }} />
          <Box style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: shades.alt }} />
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text,
            }}>
            {accentThemes[id].name}
          </Text>
        </Box>
        <Bubble color={partnerColor} label="Partner" alignSelf="flex-start" />
        <Bubble color={shades.main} label="Me" alignSelf="flex-end" />
      </Pressable>
    );
  };

  return (
    <Modal isOpen={isOpen}>
      <ModalBackdrop onPress={onClose} />

      <ModalContent style={{ backgroundColor: theme.colors.surface }}>
        <ModalCloseButton onPress={onClose} />

        <ModalHeader>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            Theme
          </Text>
        </ModalHeader>

        <ModalBody>
          <Box
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: theme.spacing[3],
              paddingBottom: theme.spacing[3],
            }}>
            {ACCENT_IDS.map(renderCard)}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
