import {
  View,
  Text,
  Box,
  ScrollView,
  Modal,
  ModalBackdrop,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Button,
  Input,
  InputField,
  RefreshControl,
  Spinner,
} from '@gluestack-ui/themed';
import { useAppTheme, useAuth, useFirebase } from '../../../../hooks';
import { StatusBar } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Journal } from '../../../../types';
import { IconButton } from '../../../../components';
import { ArrowLeft, Edit, Trash } from 'lucide-react-native';

export default function Note() {
  const { colorMode } = useAppTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  console.log(params.id);
  const { getEntryInJournal, updateEntryInJournal, deleteEntryInJournal } = useFirebase();
  const [note, setNote] = useState<Journal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalValues, setModalValues] = useState<Journal>({
    author: user.displayName || '',
    authorId: user.uid || '',
    title: '',
    description: '',
    createdAt: '',
    updatedAt: '',
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (params.id && user.roomId) {
      loadData();
    }
  }, []);

  const loadData = async () => {
    if (params.id && user.roomId) {
      getEntryInJournal(user.roomId, String(params.id)).then((data) => {
        setNote(data);

        setModalValues({
          author: data.author,
          authorId: data.authorId,
          title: data.title,
          description: data.description,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });

        setLoading(false);
      });
    }
  };

  const createdDate = new Date(String(note?.createdAt));
  const updatedDate = new Date(String(note?.updatedAt));

  const isUpdated = createdDate.getTime() !== updatedDate.getTime();

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleUpdateNote = () => {
    const updatedNote: Journal = {
      author: modalValues.author,
      authorId: modalValues.authorId,
      createdAt: modalValues.createdAt,
      title: modalValues.title,
      description: modalValues.description,
      updatedAt: new Date().toISOString(),
    };

    updateEntryInJournal(String(user.roomId), String(params.id), updatedNote).then(() => {
      setModalOpen(false);
      loadData();
    });
  };

  const handleDeleteModalOpen = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteNote = () => {
    deleteEntryInJournal(String(user.roomId), String(params.id)).then(() => {
      router.push('/(tabs)/Home/Journal/');
    });
  };

  return (
    <ScrollView
      style={{
        backgroundColor: colorMode === 'dark' ? '#121212' : '#F5F5F5',
        padding: 20,
        paddingBottom: 20,
        flex: 1,
        gap: 10,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}>
      <>
        {loading ? (
          <Box
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 20,
            }}>
            <Text>Loading...</Text>
          </Box>
        ) : (
          <>
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
                  Note
                </Text>

                {user?.uid === note?.authorId && (
                  <>
                    <IconButton icon={Edit} onPress={handleOpenModal} />

                    <IconButton icon={Trash} onPress={handleDeleteModalOpen} />
                  </>
                )}
              </Box>
            </Box>
            <Box
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: colorMode === 'dark' ? '#FFFFFF' : '#000000',
                }}>
                {note?.title}
              </Text>

              <Text>{note?.author}</Text>
            </Box>
            <Box paddingBottom={20}>
              <Text
                style={{
                  color: colorMode === 'dark' ? '#FFFFFF' : '#000000',
                }}>
                {note?.description}
              </Text>
            </Box>
            <Box>
              <Text>
                Created{' '}
                {createdDate.toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                })}
              </Text>

              {isUpdated && <Text>Updated {updatedDate.toDateString()}</Text>}
            </Box>
          </>
        )}
      </>
      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />

      <Modal isOpen={modalOpen} onClose={handleCloseModal}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text>Update Note</Text>
          </ModalHeader>
          <ModalCloseButton />
          <Box
            style={{
              padding: 20,
              gap: 10,
            }}>
            <Input>
              <InputField
                value={modalValues.title}
                onChangeText={(text) => setModalValues({ ...modalValues, title: text })}
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
                onChangeText={(text) => setModalValues({ ...modalValues, description: text })}
                placeholder="Description"
                multiline
                style={{
                  height: 200,
                  textAlignVertical: 'top',
                }}
              />
            </Input>
            <Button
              onPress={handleUpdateNote}
              style={{
                backgroundColor: '#005e78',
                padding: 10,
                borderRadius: 10,
              }}>
              <Text>Update</Text>
            </Button>
          </Box>
        </ModalContent>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text>Are you sure?</Text>
          </ModalHeader>
          <ModalCloseButton />
          <Box
            style={{
              padding: 20,
              gap: 10,
            }}>
            <Button
              onPress={() => setDeleteModalOpen(false)}
              style={{
                padding: 10,
                borderRadius: 10,
              }}>
              <Text>Cancel</Text>
            </Button>
            <Button onPress={handleDeleteNote} variant="outline">
              <Text>Delete</Text>
            </Button>
          </Box>
        </ModalContent>
      </Modal>
    </ScrollView>
  );
}
