import {
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  Image,
  Modal,
  Box,
  Text,
  Button,
  ScrollView,
  ModalBody,
} from '@gluestack-ui/themed';
import { Pressable } from 'react-native';
import { FEELINGS_LABELS, FEELINGS_MAP } from '../../constants';
import { useAppTheme } from '../../hooks';
import { useState, useEffect } from 'react';

const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const FeelingModal = ({
  isOpen,
  ownFeeling,
  setOwnFeeling,
  handleFeelingSend,
  onClose,
}: {
  isOpen: boolean;
  ownFeeling: string;
  setOwnFeeling: (feeling: string) => void;
  handleFeelingSend: () => void;
  onClose: () => void;
}) => {
  const [internalFeeling, setInternalFeeling] = useState(ownFeeling);

  useEffect(() => {
    if (isOpen) {
      setInternalFeeling(ownFeeling);
    }
  }, [isOpen]);
  const { theme } = useAppTheme();

  const handleFeelingSelect = (feeling: string) => {
    setInternalFeeling(feeling);
  };

  const handleSave = () => {
    setOwnFeeling(internalFeeling);
    handleFeelingSend();
  };

  return (
    <Modal isOpen={isOpen}>
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
              How I'm feeling
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
        <ModalBody>
          <ScrollView
            style={{
              gap: theme.spacing[5],
              height: 350,
            }}>
            <Box
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing[3],
                justifyContent: 'center',
              }}>
              {Object.keys(FEELINGS_MAP).map((feeling) => (
                <Pressable
                  key={feeling}
                  onPress={() => {
                    handleFeelingSelect(feeling);
                  }}>
                  <Image
                    source={FEELINGS_MAP[feeling]}
                    alt={feeling}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: theme.radii.md,
                      borderWidth: feeling === internalFeeling ? 3 : 0,
                      borderColor:
                        feeling === internalFeeling ? theme.colors.primary : 'transparent',
                    }}
                  />

                  <Text
                    style={{
                      textAlign: 'center',
                      color: theme.colors.textTertiary,
                      fontSize: theme.fontSize.xs,
                      marginTop: theme.spacing[1],
                    }}>
                    {capitalize(FEELINGS_LABELS[feeling] || feeling)}
                  </Text>
                </Pressable>
              ))}
            </Box>
          </ScrollView>
        </ModalBody>
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
