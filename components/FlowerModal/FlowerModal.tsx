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
  return (
    <Modal isOpen={showFlowerModal}>
      <ModalBackdrop onPress={onClose} />

      <ModalContent>
        <ModalCloseButton onPress={onClose} />

        <ModalHeader>
          <Box>
            <Text>Flowers I wish I could give you</Text>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 12,
              }}>
              Only your partner will see it
            </Text>
          </Box>
        </ModalHeader>

        <Box
          style={{
            padding: 20,
            gap: 20,
          }}>
          <Box
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: 'center',
            }}>
            {Object.keys(FLOWER_MAP).map((flower) => (
              <Pressable
                key={flower}
                onPress={() => {
                  setOwnFlower(flower);
                }}>
                <Image
                  source={FLOWER_MAP[flower]}
                  alt={flower}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 10,
                    borderWidth: flower === ownFlower ? 3 : 0,
                    borderColor: flower === ownFlower ? '#8438ff' : 'transparent',
                  }}
                />
              </Pressable>
            ))}
          </Box>

          <Box>
            <Input
              style={{
                height: 'auto',
                paddingVertical: 5,
              }}>
              <InputField
                value={ownFlowerMessage}
                onChangeText={(text) => setOwnFlowerMessage(text)}
                placeholder="Flower Message"
                maxLength={100}
                multiline
              />
            </Input>

            <Text
              style={{
                textAlign: 'right',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 12,
              }}>
              {ownFlowerMessage.length}/100
            </Text>
          </Box>
        </Box>
        <Button
          onPress={handleFlowerSend}
          style={{
            width: '100%',
          }}>
          <Text>Save</Text>
        </Button>
      </ModalContent>
    </Modal>
  );
};
