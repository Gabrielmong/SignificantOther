import {
  Box,
  Button,
  HStack,
  Modal,
  ModalBackdrop,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Text,
} from '@gluestack-ui/themed';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppTheme } from '../../hooks';
import { successFeedback } from '../../utils/haptics';
import {
  PHASE_EMOJIS,
  PHASE_LABELS,
  angleToIndex,
  illuminationAtAngle,
  indexToAngle,
  phaseName,
} from '../../utils/moon';
import { MoonImage } from '../MoonImage';
import { PhaseSlider } from '../PhaseSlider';

export const MoonPhaseModal = ({
  visible,
  initialAngle,
  onSave,
  onClose,
}: {
  visible: boolean;
  initialAngle: number | null;
  onSave: (angle: number) => void;
  onClose: () => void;
}) => {
  const { theme } = useAppTheme();
  const [index, setIndex] = useState(() => angleToIndex(initialAngle ?? 180));

  useEffect(() => {
    if (visible) setIndex(angleToIndex(initialAngle ?? 180));
    // Reset to the saved value on open only, so a live update can't move the slider mid-pick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const angle = indexToAngle(index);
  const name = phaseName(angle);

  const handleSave = () => {
    successFeedback();
    onSave(angle);
  };

  return (
    <Modal isOpen={visible} onClose={onClose}>
      <ModalBackdrop onPress={onClose} />
      <ModalContent>
        <ModalCloseButton onPress={onClose} />
        <ModalHeader>
          <Box>
            <Text
              style={{
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text,
              }}>
              Your favorite moon
            </Text>
            <Text
              style={{
                color: theme.colors.textTertiary,
                fontSize: theme.fontSize.xs,
                marginTop: theme.spacing[1],
              }}>
              Your partner gets a countdown to it
            </Text>
          </Box>
        </ModalHeader>

        {/* The modal renders outside the app's root view, so gestures need their own */}
        <GestureHandlerRootView
          style={{
            alignItems: 'center',
            gap: theme.spacing[3],
            padding: theme.commonSpacing.screenPadding,
          }}>
          <MoonImage index={index} size={200} scrubbing />
          <Box style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.text,
              }}>
              {PHASE_EMOJIS[name]} {PHASE_LABELS[name]}
            </Text>
            <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
              {Math.round(illuminationAtAngle(angle) * 100)}% lit
            </Text>
          </Box>
          <PhaseSlider value={index} onChange={setIndex} />
        </GestureHandlerRootView>

        <HStack style={{ gap: theme.spacing[3] }}>
          <Button
            variant="outline"
            onPress={onClose}
            style={{ flex: 1, borderColor: theme.colors.border }}>
            <Text style={{ color: theme.colors.text, fontSize: theme.fontSize.md }}>Cancel</Text>
          </Button>
          <Button
            onPress={handleSave}
            style={{ flex: 1, backgroundColor: theme.colors.primary, ...theme.shadows.sm }}>
            <Text
              style={{
                color: theme.colors.white,
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.semibold,
              }}>
              Save
            </Text>
          </Button>
        </HStack>
      </ModalContent>
    </Modal>
  );
};
