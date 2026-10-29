import {
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  Input,
  InputField,
  Image,
  Box,
  Text,
  Button,
} from '@gluestack-ui/themed';
import { useState, useEffect } from 'react';
import { Pressable, ScrollView } from 'react-native';

import { FLOWER_MAP } from '../../constants';
import { useAppTheme } from '../../hooks';
import { KeyboardAwareModal } from '../KeyboardAwareModal';

export const FlowerModal = ({
  showFlowerModal,
  ownFlower,
  setOwnFlower,
  ownFlowerMessage,
  setOwnFlowerMessage,
  handleFlowerSend,
  onClose,
}: {
  showFlowerModal: boolean;
  ownFlower: string;
  setOwnFlower: (flower: string) => void;
  ownFlowerMessage: string;
  setOwnFlowerMessage: (message: string) => void;
  handleFlowerSend: (flower: string, message: string) => void;
  onClose: () => void;
}) => {
  const [internalFlower, setInternalFlower] = useState(ownFlower);
  const [internalFlowerMessage, setInternalFlowerMessage] = useState(ownFlowerMessage);

  useEffect(() => {
    if (showFlowerModal) {
      setInternalFlower(ownFlower);
      setInternalFlowerMessage(ownFlowerMessage);
    }
    // Reset to the saved values on open only, so a prop change can't clobber edits in progress
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFlowerModal]);
  const { theme } = useAppTheme();

  const handleFlowerSelect = (flower: string) => {
    setInternalFlower(flower);
  };

  const handleFlowerMessageChange = (message: string) => {
    setInternalFlowerMessage(message);
  };

  const handleSave = () => {
    handleFlowerSend(internalFlower, internalFlowerMessage);
  };

  return (
    <KeyboardAwareModal isOpen={showFlowerModal}>
      <ModalBackdrop onPress={onClose} />

      {/* Shrinks to fit above the keyboard; only the flower grid gets shorter */}
      <ModalContent style={{ flexShrink: 1, maxHeight: '90%' }}>
        <ModalCloseButton onPress={onClose} />

        <ModalHeader>
          <Box>
            <Text
              style={{
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text,
              }}>
              Flowers I wish I could give you
            </Text>
            <Text
              style={{
                color: theme.colors.textTertiary,
                fontSize: theme.fontSize.xs,
                marginTop: theme.spacing[1],
              }}>
              Only your partner will see it
            </Text>
          </Box>
        </ModalHeader>

        <ScrollView
          style={{ flexShrink: 1 }}
          contentContainerStyle={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing[3],
            justifyContent: 'center',
            padding: theme.commonSpacing.screenPadding,
          }}
          keyboardShouldPersistTaps="handled">
          {Object.keys(FLOWER_MAP).map((flower) => (
            <Pressable
              key={flower}
              onPress={() => {
                handleFlowerSelect(flower);
              }}>
              <Image
                source={FLOWER_MAP[flower]}
                alt={flower}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: theme.radii.md,
                  borderWidth: flower === internalFlower ? 3 : 0,
                  borderColor: flower === internalFlower ? theme.colors.primary : 'transparent',
                }}
              />
            </Pressable>
          ))}
        </ScrollView>

        <Box style={{ paddingHorizontal: theme.commonSpacing.screenPadding }}>
          <Input
            variant="outline"
            style={{
              height: 'auto',
              paddingVertical: theme.spacing[2],
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.inputBackground,
            }}>
            <InputField
              value={internalFlowerMessage}
              onChangeText={(text) => handleFlowerMessageChange(text)}
              placeholder="Flower Message"
              maxLength={100}
              multiline
              style={{
                fontSize: theme.fontSize.md,
                color: theme.colors.text,
              }}
            />
          </Input>

          <Text
            style={{
              textAlign: 'right',
              color: theme.colors.textTertiary,
              fontSize: theme.fontSize.xs,
              marginTop: theme.spacing[1],
            }}>
            {internalFlowerMessage.length}/100
          </Text>
        </Box>
        <Button
          onPress={handleSave}
          style={{
            width: '100%',
            backgroundColor: theme.colors.primary,
            ...theme.shadows.sm,
          }}>
          <Text
            style={{
              color: theme.colors.white,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            Save
          </Text>
        </Button>
      </ModalContent>
    </KeyboardAwareModal>
  );
};
