import {
  View,
  Text,
  RefreshControl,
  ScrollView,
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
  HStack,
} from '@gluestack-ui/themed';
import { useAppTheme, useAppToast, useAuth, useFirebase, useImageUpload } from '../../../hooks';
import { Fragment, useEffect, useState } from 'react';
import { Activity, Wishlist as WishlistType } from '../../../types';
import { router } from 'expo-router';
import {
  ArrowLeft,
  CheckIcon,
  ChevronDownIcon,
  Plus,
  Trash,
  ExternalLink,
} from 'lucide-react-native';
import { Linking, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Wishlist() {
  const { theme } = useAppTheme();

  // Map categories to gradient colors
  const categoryGradients: Record<string, string[]> = {
    activities: ['#8B5CF6', '#7C3AED'],
    music: ['#EC4899', '#DB2777'],
    movies: ['#3B82F6', '#2563EB'],
    books: ['#10B981', '#059669'],
    food: ['#F59E0B', '#D97706'],
    dates: ['#EF4444', '#DC2626'],
    other: ['#6366F1', '#4F46E5'],
    gifts: ['#8B5CF6', '#EC4899'],
  };
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
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

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

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'activities', label: 'Activities', emoji: '💤' },
    { value: 'music', label: 'Music', emoji: '🎵' },
    { value: 'movies', label: 'Movies', emoji: '📽' },
    { value: 'books', label: 'Books', emoji: '📚' },
    { value: 'food', label: 'Food', emoji: '🍔' },
    { value: 'dates', label: 'Dates', emoji: '👩‍❤️‍👨' },
    { value: 'gifts', label: 'Gifts', emoji: '🎁' },
    { value: 'other', label: 'Other', emoji: '🎊' },
  ];

  const getFilteredWishlist = () => {
    if (!wishlist) return null;

    if (selectedFilter === 'all') {
      return wishlist;
    }

    // Return only the selected category, ensuring it exists
    const categoryData = wishlist[selectedFilter as keyof typeof wishlist];
    return {
      [selectedFilter]: categoryData || {},
    };
  };

  const filteredWishlist = getFilteredWishlist();

  return (
    <View
      style={{
        backgroundColor: theme.colors.background,
        flex: 1,
      }}>
      {/* Header */}
      <Box
        style={{
          paddingTop: 16,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: theme?.colors?.surface,
          ...theme?.shadows?.sm,
        }}>
        <HStack
          style={{
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <TouchableOpacity onPress={router.back}>
            <ArrowLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: theme?.fontSize?.xl,
              fontWeight: theme?.fontWeight?.bold,
              color: theme?.colors?.text,
            }}>
            Wishlist
          </Text>

          <TouchableOpacity onPress={handleOpenModal}>
            <Plus size={24} color={theme?.gradients?.primary?.colors?.[0]} />
          </TouchableOpacity>
        </HStack>
      </Box>

      {/* Filter Chips */}
      <Box
        style={{
          backgroundColor: theme.colors.background,
        }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.commonSpacing.screenPadding,
            paddingVertical: theme.spacing[3],
            gap: theme.spacing[2],
          }}>
        {categories.map((category) => {
          const isSelected = selectedFilter === category.value;
          const gradientColors =
            category.value === 'all'
              ? ['#8B5CF6', '#EC4899']
              : categoryGradients[category.value] || ['#8B5CF6', '#EC4899'];

          return (
            <TouchableOpacity
              key={category.value}
              onPress={() => setSelectedFilter(category.value)}
              activeOpacity={0.7}>
              {isSelected ? (
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingHorizontal: theme.spacing[4],
                    paddingVertical: theme.spacing[2],
                    borderRadius: theme.radii.full,
                    ...theme.shadows.sm,
                  }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                    }}>
                    {category.emoji ? `${category.emoji} ${category.label}` : category.label}
                  </Text>
                </LinearGradient>
              ) : (
                <Box
                  style={{
                    paddingHorizontal: theme.spacing[4],
                    paddingVertical: theme.spacing[2],
                    borderRadius: theme.radii.full,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                    }}>
                    {category.emoji ? `${category.emoji} ${category.label}` : category.label}
                  </Text>
                </Box>
              )}
            </TouchableOpacity>
          );
        })}
        </ScrollView>
      </Box>
      <ScrollView
        style={{
          backgroundColor: theme.colors.background,
        }}
        contentContainerStyle={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingBottom: 60,
          paddingTop: theme.spacing[4],
          paddingHorizontal: theme.commonSpacing.screenPadding,
          gap: theme.spacing[4],
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}>
        {filteredWishlist && !loading && (
          <View
            style={{
              width: '100%',
              gap: theme.spacing[4],
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            }}>
            {Object.keys(filteredWishlist).map((key, index) => {
              const categoryKey = key as keyof typeof filteredWishlist;
              const hasItems = Object.keys(filteredWishlist[categoryKey]).length > 0;

              if (!hasItems) return null;

              return (
                <Fragment key={key}>
                  {/* Category Header */}
                  <Box
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      marginTop: index > 0 ? theme.spacing[2] : 0,
                    }}>
                    <Text
                      style={{
                        fontSize: theme.fontSize.xl,
                        fontWeight: theme.fontWeight.bold,
                        color: theme.colors.text,
                      }}>
                      {capitalize(key)}
                    </Text>
                    <Box
                      style={{
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: theme.spacing[2],
                        paddingVertical: theme.spacing[1],
                        borderRadius: theme.radii.full,
                      }}>
                      <Text
                        style={{
                          fontSize: theme.fontSize.xs,
                          color: theme.colors.textSecondary,
                          fontWeight: theme.fontWeight.semibold,
                        }}>
                        {Object.keys(filteredWishlist[categoryKey]).length}
                      </Text>
                    </Box>
                  </Box>

                  {Object.keys(filteredWishlist[categoryKey]).map((activity) => {
                    const item = filteredWishlist[categoryKey][activity];
                    const gradientColors = categoryGradients[key] || ['#8B5CF6', '#EC4899'];

                    return (
                      <TouchableOpacity
                        key={activity}
                        style={{ width: '100%' }}
                        activeOpacity={0.95}>
                        <LinearGradient
                          colors={gradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            borderRadius: theme.radii.xl,
                            padding: theme.commonSpacing.cardPadding,
                            gap: theme.spacing[3],
                            ...theme.shadows.lg,
                          }}>
                          <HStack
                            style={{
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: theme.spacing[3],
                            }}>
                            <Box style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: theme.fontSize.lg,
                                  fontWeight: theme.fontWeight.bold,
                                  color: '#FFFFFF',
                                  marginBottom: theme.spacing[1],
                                }}>
                                {item.title}
                              </Text>

                              <Text
                                style={{
                                  fontSize: theme.fontSize.sm,
                                  color: 'rgba(255, 255, 255, 0.9)',
                                  lineHeight: theme.lineHeight.relaxed * theme.fontSize.sm,
                                }}>
                                {item.description}
                              </Text>
                            </Box>

                            <HStack
                              style={{
                                gap: theme.spacing[2],
                                alignItems: 'center',
                              }}>
                              <TouchableOpacity
                                onPress={() => {
                                  handleToggleDone({
                                    id: activity,
                                    entry: { ...item, done: !item.done },
                                    under: key,
                                  });
                                }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: item.done
                                    ? 'rgba(255, 255, 255, 1)'
                                    : 'rgba(255, 255, 255, 0.2)',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  borderWidth: 2,
                                  borderColor: '#FFFFFF',
                                }}>
                                {item.done && <CheckIcon size={18} color={gradientColors[0]} />}
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleDeleteEntry(activity, categoryKey)}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}>
                                <Trash size={16} color="#FFFFFF" />
                              </TouchableOpacity>
                            </HStack>
                          </HStack>

                          {/* Image */}
                          {item.image && (
                            <Image
                              source={{ uri: item.image }}
                              alt="Image"
                              style={{
                                width: '100%',
                                height: 160,
                                borderRadius: theme.radii.lg,
                                marginTop: theme.spacing[2],
                              }}
                              resizeMode="cover"
                            />
                          )}

                          {/* Link Button */}
                          {item.link && (
                            <TouchableOpacity
                              onPress={() => handleLinkClick(String(item.link))}
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                paddingVertical: theme.spacing[3],
                                paddingHorizontal: theme.spacing[4],
                                borderRadius: theme.radii.lg,
                                marginTop: theme.spacing[2],
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: theme.spacing[2],
                              }}>
                              <ExternalLink size={18} color={gradientColors[0]} />
                              <Text
                                style={{
                                  color: gradientColors[0],
                                  fontWeight: theme.fontWeight.semibold,
                                  fontSize: theme.fontSize.sm,
                                }}>
                                Open Link
                              </Text>
                            </TouchableOpacity>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}

                  {index !== Object.keys(filteredWishlist).length - 1 && <Divider />}
                </Fragment>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {filteredWishlist &&
          !loading &&
          Object.keys(filteredWishlist).every(
            (key) =>
              Object.keys(filteredWishlist[key as keyof typeof filteredWishlist]).length === 0,
          ) && (
            <Box
              style={{
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: theme.spacing[10],
                gap: theme.spacing[4],
              }}>
              <Text style={{ fontSize: 64 }}>
                {selectedFilter === 'all'
                  ? '🎁'
                  : categories.find((c) => c.value === selectedFilter)?.emoji || '🎁'}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text,
                  textAlign: 'center',
                }}>
                {selectedFilter === 'all'
                  ? 'Your wishlist is empty'
                  : `No ${selectedFilter} items yet`}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.textSecondary,
                  textAlign: 'center',
                  paddingHorizontal: theme.spacing[8],
                }}>
                {selectedFilter === 'all'
                  ? "Start adding items you'd like to do, watch, read, or get!"
                  : `Add your first ${selectedFilter} item to the wishlist!`}
              </Text>
              <TouchableOpacity
                onPress={handleOpenModal}
                style={{
                  marginTop: theme.spacing[4],
                }}>
                <LinearGradient
                  colors={theme?.gradients?.primary?.colors || ['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: theme.spacing[3],
                    paddingHorizontal: theme.spacing[6],
                    borderRadius: theme.radii.full,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                  }}>
                  <Plus size={20} color="#FFFFFF" />
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontWeight: theme.fontWeight.semibold,
                      fontSize: theme.fontSize.md,
                    }}>
                    Add Your First Item
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Box>
          )}
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
                  <SelectItem value="gifts" label={'Gifts 🎁'} />
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
