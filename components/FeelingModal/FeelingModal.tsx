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
  return (
    <Modal isOpen={isOpen}>
      <ModalBackdrop onPress={onClose} />

      <ModalContent>
        <ModalCloseButton onPress={onClose} />

        <ModalHeader>
          <Box>
            <Text>How i'm feeling</Text>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 12,
              }}>
              Only your partner will see it
            </Text>
          </Box>
        </ModalHeader>
        <ModalBody>
          <ScrollView
            style={{
              gap: 20,
              height: 350,
            }}>
            <Box
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent: 'center',
              }}>
              {Object.keys(FEELINGS_MAP).map((feeling) => (
                <Pressable
                  key={feeling}
                  onPress={() => {
                    setOwnFeeling(feeling);
                  }}>
                  <Image
                    source={FEELINGS_MAP[feeling]}
                    alt={feeling}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 10,
                      borderWidth: feeling === ownFeeling ? 3 : 0,
                      borderColor: feeling === ownFeeling ? '#8438ff' : 'transparent',
                    }}
                  />

                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: 12,
                    }}>
                    {capitalize(FEELINGS_LABELS[feeling] || feeling)}
                  </Text>
                </Pressable>
              ))}
            </Box>
          </ScrollView>
        </ModalBody>
        <Button
          onPress={handleFeelingSend}
          style={{
            width: '100%',
          }}>
          <Text>Save</Text>
        </Button>
      </ModalContent>
    </Modal>
  );
};
