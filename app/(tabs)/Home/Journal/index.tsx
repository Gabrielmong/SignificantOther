import {
  View,
  Text,
  RefreshControl,
  ScrollView,
  StatusBar,
  Box,
  Button,
  Input,
  InputField,
  Modal,
  ModalBackdrop,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
} from '@gluestack-ui/themed';
import { useAppTheme, useAppToast, useAuth, useFirebase, useImageUpload } from '../../../../hooks';
import { useEffect, useState } from 'react';
import { Journal as JournalType, JournalObject } from '../../../../types';
import { IconButton } from '../../../../components';
import { router } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

const cardColors = {
  own: '#32285c',
  other: '#1e3375',
};

export default function Journal() {
  const { colorMode } = useAppTheme();
  const { showToast } = useAppToast();
  const { user } = useAuth();
  const [journal, setJournal] = useState<JournalObject | null>(null);
  const { uploadImage, askPermission } = useImageUpload();
  const [isUploading, setIsUploading] = useState(false);
  const { getJournal, listenToJournalChanges, createEntryInJournal } = useFirebase();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalValues, setModalValues] = useState<JournalType>({
    author: user.displayName || '',
    authorId: user.uid || '',
    title: '',
    description: '',
    createdAt: '',
    updatedAt: '',
  });

  const loadData = async () => {
    if (user.roomId) {
      const data = await getJournal(user.roomId);
      setJournal(data);

      setLoading(false);
    }
  };
  useEffect(() => {
    if (user.roomId) {
      loadData();
      listenToJournalChanges((data) => {
        setJournal(data.journal);
      }, user.roomId);
    }
  }, []);

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSave = async () => {
    if (!user.roomId) return;

    if (modalValues.title && modalValues.description) {
      const data = {
        ...modalValues,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createEntryInJournal(user.roomId, data);
      showToast({ description: 'Entry created', status: 'success', title: 'Success' });
      setModalOpen(false);
    }
  };

  const getTextPreview = (text: string) => {
    if (text.length > 100) {
      return text.slice(0, 100) + '...';
    }
    return text;
  };

  const goToEntry = (entryId: string) => {
    router.push(`/(tabs)/Home/Journal/${entryId}`);
  };

  return (
    <View
      style={{
        backgroundColor: colorMode === 'dark' ? '#121212' : '#F5F5F5',
        padding: 20,
        paddingBottom: 20,
        flex: 1,
      }}>
      <Box
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 20,
        }}>
        <IconButton icon={ArrowLeft} onPress={router.back} />

        <Box
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
          }}>
          <Text
            style={{
              fontSize: 24,
              lineHeight: 32,
              fontWeight: 'bold',
            }}>
            Journal
          </Text>

          <IconButton icon={Plus} onPress={handleOpenModal} />
        </Box>
      </Box>
      <ScrollView
        $dark-backgroundColor="#121212"
        contentContainerStyle={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingBottom: 60,
          gap: 10,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}>
        {journal &&
          Object.keys(journal).map((key) => {
            const entry = journal[key];
            return (
              <TouchableOpacity
                key={key}
                style={{
                  minWidth: '100%',
                  backgroundColor: user?.uid === entry.authorId ? cardColors.own : cardColors.other,
                  padding: 20,
                  borderRadius: 10,
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  gap: 10,
                }}
                onPress={() => goToEntry(key)}>
                <Box
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                    }}>
                    {entry.title}
                  </Text>
                </Box>
                <Text
                  style={{
                    fontSize: 14,
                  }}>
                  {getTextPreview(entry.description)}
                </Text>

                <Box
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                  <Text
                    style={{
                      fontSize: 12,
                    }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                    }}>
                    {entry.author}
                  </Text>
                </Box>
              </TouchableOpacity>
            );
          })}
        <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
      </ScrollView>
      <Modal isOpen={modalOpen}>
        <ModalBackdrop onPress={handleCloseModal} />

        <ModalContent>
          <ModalCloseButton onPress={handleCloseModal} />

          <ModalHeader>
            <Text>New note</Text>
          </ModalHeader>

          <Box
            style={{
              padding: 20,
              gap: 20,
            }}>
            <Input>
              <InputField
                value={modalValues.title}
                onChangeText={(value) => setModalValues({ ...modalValues, title: value })}
                placeholder="Title"
              />
            </Input>

            <Input
              style={{
                height: 200,
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignContent: 'flex-start',
              }}>
              <InputField
                value={modalValues.description}
                onChangeText={(value) => setModalValues({ ...modalValues, description: value })}
                placeholder="Note"
                multiline
                numberOfLines={8}
                style={{
                  height: 200,
                  textAlignVertical: 'top',
                }}
              />
            </Input>

            <Button
              onPress={handleSave}
              style={{
                backgroundColor: '#005e78',
                padding: 10,
                borderRadius: 10,
              }}>
              <Text
                style={{
                  color: '#ffffff',
                  textAlign: 'center',
                }}>
                Save
              </Text>
            </Button>
          </Box>
        </ModalContent>
      </Modal>
    </View>
  );
}
