import {
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  Input,
  InputField,
  Image,
  Modal,
  Box,
  Text,
  Button,
} from '@gluestack-ui/themed';
import { Pressable } from 'react-native';
import { FLOWER_MAP } from '../../constants';
import { useAppTheme } from '../../hooks';
import { useState } from 'react';

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
  handleFlowerSend: () => void;
  onClose: () => void;
}) => {
  const [internalFlower, setInternalFlower] = useState(ownFlower);
  const [internalFlowerMessage, setInternalFlowerMessage] = useState(ownFlowerMessage);
  const { theme } = useAppTheme();

  const handleFlowerSelect = (flower: string) => {
    setInternalFlower(flower);
  };

  const handleFlowerMessageChange = (message: string) => {
    setInternalFlowerMessage(message);
  };

  const handleSave = () => {
    setOwnFlower(internalFlower);
    setOwnFlowerMessage(internalFlowerMessage);
    handleFlowerSend();
  };

  return (
    <Modal isOpen={showFlowerModal}>
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

        <Box
          style={{
            padding: theme.commonSpacing.screenPadding,
            gap: theme.spacing[5],
          }}>
          <Box
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing[3],
              justifyContent: 'center',
            }}>
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
          </Box>

          <Box>
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
    </Modal>
  );
};
