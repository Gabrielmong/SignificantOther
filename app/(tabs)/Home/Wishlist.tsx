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
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  Image,
  SelectPortal,
  SelectContent,
  SelectItem,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectBackdrop,
  Divider,
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
} from '@gluestack-ui/themed';
import { useAppTheme, useAppToast, useAuth, useFirebase, useImageUpload } from '../../../hooks';
import { useEffect, useState } from 'react';
import { Activity, Wishlist as WishlistType } from '../../../types';
import { IconButton } from '../../../components';
import { router } from 'expo-router';
import { ArrowLeft, CheckIcon, ChevronDownIcon, Plus, Trash } from 'lucide-react-native';
import { Linking } from 'react-native';

const activitiesBackgroundColors = {
  activities: '#005e78',
  music: '#558a42',
  movies: '#94250f',
  books: '#4682B4',
  food: '#610d82',
  dates: '#a30052',
  other: '#006a75',
};

export default function Wishlist() {
  const { colorMode } = useAppTheme();
  const { showToast } = useAppToast();
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistType | null>(null);
  const { uploadImage, askPermission } = useImageUpload();
  const [isUploading, setIsUploading] = useState(false);
  const {
    getWishlist,
    listenToWishlistChanges,
    updateEntryInWishlist,
    createEntryInWishlist,
    uploadToFirebaseStorage,
    deleteWishlistEntry,
  } = useFirebase();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalValues, setModalValues] = useState({
    description: '',
    image: '',
    title: '',
    link: '',
    under: '',
  });

  const loadData = async () => {
    if (user.roomId) {
      const data = await getWishlist(user.roomId);
      setWishlist(data);

      setLoading(false);
    }
  };
  useEffect(() => {
    if (user.roomId) {
      loadData();
      listenToWishlistChanges((data) => {
        setWishlist(data.wishlist);
      }, user.roomId);
    }
  }, []);

  const handleNewEntry = async ({
    description,
    image,
    title,
    link,
    under,
  }: {
    description: string;
    image: string;
    title: string;
    link: string;
    under: string;
  }) => {
    if (!description || !title || !under) {
      showToast({ title: 'Error', description: 'Please fill all fields', status: 'error' });
      return;
    }

    if (user.roomId) {
      await createEntryInWishlist(
        user.roomId,
        {
          description,
          done: false,
          image,
          title,
          link,
        },
        under,
      );
      loadData();
      setModalOpen(false);

      showToast({ title: 'Success', description: 'New entry added', status: 'success' });

      setModalValues({
        description: '',
        image: '',
        title: '',
        link: '',
        under: '',
      });
    }
  };

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleUploadImage = async () => {
    askPermission();
    const res = await uploadImage();
    if (!res) return;

    const { uri, fileName } = res;

    setIsUploading(true);
    const url = await uploadToFirebaseStorage(uri, fileName);

    if (!url) return;

    setModalValues({ ...modalValues, image: url });
    setIsUploading(false);
  };

  const capitalize = (s: string) => {
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const handleToggleDone = async ({
    id,
    entry,
    under,
  }: {
    id: string;
    entry: Activity;
    under: string;
  }) => {
    if (user.roomId) {
      await updateEntryInWishlist(user.roomId, id, entry, under);
      loadData();
    }
  };

  const handleDeleteEntry = async (id: string, under: string) => {
    if (user.roomId) {
      await deleteWishlistEntry(user.roomId, id, under);
      loadData();
    }
  };

  const handleLinkClick = (link: string) => {
    Linking.openURL(link);
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
            Wishlist
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
        {wishlist && !loading && (
          <View
            style={{
              width: '100%',
              gap: 10,
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            }}>
            {Object.keys(wishlist).map((key, index) => {
              return (
                <>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: 'bold',
                    }}>
                    {capitalize(key)}
                  </Text>
                  {Object.keys(wishlist[key as keyof typeof wishlist]).map((activity) => {
                    const item = wishlist[key as keyof typeof wishlist][activity];

                    return (
                      <Box
                        key={activity}
                        style={{
                          width: '100%',
                          padding: 20,
                          gap: 10,
                          borderRadius: 10,
                          backgroundColor: activitiesBackgroundColors[key as keyof typeof wishlist],
                        }}>
                        <Box
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                          }}>
                          <Box>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: 'bold',
                              }}>
                              {item.title}
                            </Text>

                            <Text>{item.description}</Text>
                          </Box>

                          <Box
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              gap: 10,
                            }}>
                            <Checkbox
                              value={String(item.done)}
                              isChecked={item.done}
                              aria-label="Done or not done"
                              onChange={(value) => {
                                handleToggleDone({
                                  id: activity,
                                  entry: { ...item, done: value },
                                  under: key,
                                });
                              }}>
                              <CheckboxIndicator>
                                <CheckboxIcon as={CheckIcon} />
                              </CheckboxIndicator>
                            </Checkbox>

                            <IconButton
                              icon={Trash}
                              onPress={() =>
                                handleDeleteEntry(activity, key as keyof typeof wishlist)
                              }
                            />
                          </Box>
                        </Box>

                        <Box>
                          {item.image && (
                            <Image
                              source={{ uri: item.image }}
                              alt="Image"
                              style={{
                                width: '100%',
                                height: 100,
                                borderRadius: 10,
                              }}
                            />
                          )}

                          {item.link && (
                            <Button onPress={() => handleLinkClick(String(item.link))}>
                              <Text>Link</Text>
                            </Button>
                          )}
                        </Box>
                      </Box>
                    );
                  })}

                  {index !== Object.keys(wishlist).length - 1 && <Divider />}
                </>
              );
            })}
          </View>
        )}

        <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
      </ScrollView>
      <Modal isOpen={modalOpen}>
        <ModalBackdrop onPress={handleCloseModal} />

        <ModalContent>
          <ModalCloseButton onPress={handleCloseModal} />

          <ModalHeader>
            <Text>New item</Text>
          </ModalHeader>

          <Box
            style={{
              padding: 20,
              gap: 20,
            }}>
            <Input>
              <InputField
                value={modalValues.title}
                onChangeText={(text) => setModalValues({ ...modalValues, title: text })}
                placeholder="Title"
              />
            </Input>

            <Input>
              <InputField
                value={modalValues.description}
                onChangeText={(text) => setModalValues({ ...modalValues, description: text })}
                placeholder="Description"
                multiline
              />
            </Input>

            <Select onValueChange={(value) => setModalValues({ ...modalValues, under: value })}>
              <SelectTrigger>
                <SelectInput placeholder="Select a category" />

                <SelectIcon
                  sx={{
                    mr: 8,
                  }}
                  as={ChevronDownIcon}
                />
              </SelectTrigger>

              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>

                  <SelectItem value="activities" label={'Activities 💤'} />
                  <SelectItem value="music" label={'Music 🎵'} />
                  <SelectItem value="movies" label={'Movies 📽'} />
                  <SelectItem value="books" label={'Books 📚'} />
                  <SelectItem value="food" label={'Food 🍔'} />
                  <SelectItem value="dates" label={'Dates 👩‍❤️‍👨'} />
                  <SelectItem value="other" label={'Other 🎊'} />
                </SelectContent>
              </SelectPortal>
            </Select>

            <Box
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}>
              {modalValues.image && (
                <Image
                  source={{ uri: modalValues.image }}
                  alt="Image"
                  style={{
                    width: '50%',
                    height: 'auto',
                  }}
                />
              )}
              <Box
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  width: modalValues.image ? '45%' : '100%',
                }}>
                <Button onPress={handleUploadImage}>
                  <Text>
                    {isUploading
                      ? 'Uploading...'
                      : modalValues.image
                        ? 'Change'
                        : 'Upload Image (optional)'}
                  </Text>
                </Button>

                {modalValues.image && (
                  <Button onPress={() => setModalValues({ ...modalValues, image: '' })}>
                    <Text>Remove</Text>
                  </Button>
                )}
              </Box>
            </Box>

            <Input>
              <InputField
                value={modalValues.link}
                onChangeText={(text) => setModalValues({ ...modalValues, link: text })}
                placeholder="Link (optional)"
              />
            </Input>
            <Button
              onPress={() => {
                handleNewEntry(modalValues);
              }}
              style={{
                width: '100%',
              }}>
              <Text>Save</Text>
            </Button>
          </Box>
        </ModalContent>
      </Modal>
    </View>
  );
}
