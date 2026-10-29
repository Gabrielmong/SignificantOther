import {
  View,
  Text,
  RefreshControl,
  ScrollView,
  Box,
  Button,
  Input,
  InputField,
  ModalBackdrop,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectItem,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectBackdrop,
  Divider,
  HStack,
} from '@gluestack-ui/themed';
import { useAppTheme, useAppToast, useAuth, useFirebase, useShareToChat } from '../../../hooks';
import { Fragment, useEffect, useState } from 'react';
import { FavoriteThing, FavoriteThings as FavoriteThingsType } from '../../../types';
import { router } from 'expo-router';
import { ArrowLeft, ChevronDownIcon, Plus, Send, Trash } from 'lucide-react-native';
import { Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { GradientColors } from '../../../config/theme';
import { KeyboardAwareModal } from '../../../components';
import Animated from 'react-native-reanimated';
import { listItemExiting, listLayout, useListEntering } from '../../../utils/motion';
import { useAppSelector } from '../../../state';

export default function FavoriteThings() {
  const { theme } = useAppTheme();

  const categoryGradients: Record<string, GradientColors> = {
    music: ['#EC4899', '#DB2777'],
    snacks: ['#F59E0B', '#D97706'],
    drinks: ['#06B6D4', '#0891B2'],
    books: ['#10B981', '#059669'],
    movies: ['#3B82F6', '#2563EB'],
    flowers: ['#F472B6', '#DB2777'],
    scents: ['#A855F7', '#9333EA'],
    colors: ['#F59E0B', '#EA580C'],
    other: ['#6366F1', '#4F46E5'],
  };
  const { showToast } = useAppToast();
  const shareToChat = useShareToChat();
  const { partnerName } = useAppSelector((state) => state.room);
  const partnerLabel = partnerName || 'your partner';
  const { user } = useAuth();
  const [favoriteThings, setFavoriteThings] = useState<FavoriteThingsType | null>(null);
  const {
    getFavoriteThings,
    listenToFavoriteThingsChanges,
    createFavoriteThing,
    deleteFavoriteThing,
  } = useFirebase();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalValues, setModalValues] = useState({
    title: '',
    note: '',
    under: '',
  });
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const loadData = async () => {
    if (user.roomId && user.uid) {
      const data = await getFavoriteThings(user.roomId, user.uid);
      setFavoriteThings(data);

      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.roomId && user.uid) {
      loadData();
      listenToFavoriteThingsChanges(
        (data) => {
          setFavoriteThings(data.favoriteThings);
        },
        user.roomId,
        user.uid,
      );
    }
  }, []);

  const handleNewEntry = async ({
    title,
    note,
    under,
  }: {
    title: string;
    note: string;
    under: string;
  }) => {
    if (!title || !under) {
      showToast({ title: 'Error', description: 'Please fill all fields', status: 'error' });
      return;
    }

    if (user.roomId && user.uid) {
      await createFavoriteThing(user.roomId, user.uid, { title, note }, under);
      loadData();
      setModalOpen(false);

      showToast({ title: 'Success', description: 'New entry added', status: 'success' });

      setModalValues({
        title: '',
        note: '',
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

  const capitalize = (s: string) => {
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const handleDeleteEntry = async (id: string, under: string) => {
    if (user.roomId && user.uid) {
      await deleteFavoriteThing(user.roomId, user.uid, id, under);
      loadData();
    }
  };

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'books', label: 'Books', emoji: '📚' },
    { value: 'colors', label: 'Colors', emoji: '🎨' },
    { value: 'drinks', label: 'Drinks', emoji: '🥤' },
    { value: 'flowers', label: 'Flowers', emoji: '💐' },
    { value: 'food', label: 'Food', emoji: '🍔' },
    { value: 'movies', label: 'Movies', emoji: '📽' },
    { value: 'music', label: 'Music', emoji: '🎵' },
    { value: 'other', label: 'Other', emoji: '💛' },
    { value: 'scents', label: 'Scents', emoji: '🌸' },
    { value: 'snacks', label: 'Snacks', emoji: '🍿' },
  ];

  // Favorites are private to their author, so sharing one is confirmed first
  const handleShareEntry = (id: string, entry: FavoriteThing, under: string) => {
    const category = categories.find((c) => c.value === under);
    Alert.alert(`Share with ${partnerLabel}?`, `"${entry.title}" will be posted in your chat.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share',
        onPress: () =>
          shareToChat({
            kind: 'favorite',
            id,
            title: entry.title,
            subtitle: category?.label ?? capitalize(under),
            emoji: category?.emoji,
          }),
      },
    ]);
  };

  const getFilteredFavoriteThings = () => {
    if (!favoriteThings) return null;

    if (selectedFilter === 'all') {
      return favoriteThings;
    }

    const categoryData = favoriteThings[selectedFilter as keyof typeof favoriteThings];
    return {
      [selectedFilter]: categoryData || {},
    };
  };

  const filteredFavoriteThings = getFilteredFavoriteThings();

  // One running stagger index across headers and cards, so the grouped list
  // fades in top to bottom as a single list rather than per category
  const enterListItem = useListEntering(!!filteredFavoriteThings && Object.keys(filteredFavoriteThings).length > 0);
  let staggerIndex = 0;

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
            Favorites
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
                ? theme.gradients.primary.colors
                : categoryGradients[category.value] || theme.gradients.primary.colors;
            const chipTextColor = category.value === 'all' ? theme.colors.onPrimary : '#FFFFFF';

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
                        color: chipTextColor,
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
        {filteredFavoriteThings && !loading && (
          <View
            style={{
              width: '100%',
              gap: theme.spacing[4],
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            }}>
            {Object.keys(filteredFavoriteThings).map((key, index) => {
              const categoryKey = key as keyof typeof filteredFavoriteThings;
              const hasItems = Object.keys(filteredFavoriteThings[categoryKey]).length > 0;

              if (!hasItems) return null;

              return (
                <Fragment key={key}>
                  {/* Category Header */}
                  <Animated.View
                    key={`header-${key}`}
                    entering={enterListItem(staggerIndex++)}
                    exiting={listItemExiting}
                    layout={listLayout}>
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
                        {Object.keys(filteredFavoriteThings[categoryKey]).length}
                      </Text>
                    </Box>
                  </Box>
                  </Animated.View>

                  {Object.keys(filteredFavoriteThings[categoryKey]).map((entryId) => {
                    const item = filteredFavoriteThings[categoryKey][entryId];
                    const gradientColors = categoryGradients[key] || theme.gradients.primary.colors;

                    // Keyed by entry id: entering only runs on first mount, not when
                    // loadData / the listener hands back the same entries
                    return (
                      <Animated.View
                        key={entryId}
                        style={{ width: '100%' }}
                        entering={enterListItem(staggerIndex++)}
                        exiting={listItemExiting}
                        layout={listLayout}>
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

                              {item.note && (
                                <Text
                                  style={{
                                    fontSize: theme.fontSize.sm,
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    lineHeight: theme.lineHeight.relaxed * theme.fontSize.sm,
                                  }}>
                                  {item.note}
                                </Text>
                              )}
                            </Box>

                            <HStack style={{ gap: theme.spacing[2], alignItems: 'center' }}>
                              <TouchableOpacity
                                onPress={() => handleShareEntry(entryId, item, key)}
                                accessibilityRole="button"
                                accessibilityLabel={`Share ${item.title} with ${partnerLabel}`}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}>
                                <Send size={16} color="#FFFFFF" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleDeleteEntry(entryId, categoryKey)}
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
                        </LinearGradient>
                      </Animated.View>
                    );
                  })}

                  {/* Layout-only wrapper so the divider slides with the cards around it */}
                  {index !== Object.keys(filteredFavoriteThings).length - 1 && (
                    <Animated.View style={{ width: '100%' }} layout={listLayout}>
                      <Divider />
                    </Animated.View>
                  )}
                </Fragment>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {filteredFavoriteThings &&
          !loading &&
          Object.keys(filteredFavoriteThings).every(
            (key) =>
              Object.keys(filteredFavoriteThings[key as keyof typeof filteredFavoriteThings])
                .length === 0,
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
                  ? '💛'
                  : categories.find((c) => c.value === selectedFilter)?.emoji || '💛'}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text,
                  textAlign: 'center',
                }}>
                {selectedFilter === 'all' ? 'No favorites yet' : `No ${selectedFilter} yet`}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.textSecondary,
                  textAlign: 'center',
                  paddingHorizontal: theme.spacing[8],
                }}>
                {selectedFilter === 'all'
                  ? 'Jot down the music, snacks, books, and little things your partner loves. Only you can see this list.'
                  : `Add your first ${selectedFilter} entry!`}
              </Text>
              <TouchableOpacity
                onPress={handleOpenModal}
                style={{
                  marginTop: theme.spacing[4],
                }}>
                <LinearGradient
                  colors={theme.gradients.primary.colors}
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
                  <Plus size={20} color={theme.colors.onPrimary} />
                  <Text
                    style={{
                      color: theme.colors.onPrimary,
                      fontWeight: theme.fontWeight.semibold,
                      fontSize: theme.fontSize.md,
                    }}>
                    Add Your First Entry
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Box>
          )}
      </ScrollView>
      <KeyboardAwareModal isOpen={modalOpen}>
        <ModalBackdrop onPress={handleCloseModal} />

        <ModalContent>
          <ModalCloseButton onPress={handleCloseModal} />

          <ModalHeader>
            <Text>New favorite thing</Text>
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
                placeholder="What do they love? (e.g. Radiohead)"
              />
            </Input>

            <Input>
              <InputField
                value={modalValues.note}
                onChangeText={(text) => setModalValues({ ...modalValues, note: text })}
                placeholder="Note (optional)"
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

                  {categories
                    .filter((category) => category.value !== 'all')
                    .map((category) => (
                      <SelectItem
                        key={category.value}
                        value={category.value}
                        label={`${category.label} ${category.emoji || ''}`}
                      />
                    ))}
                </SelectContent>
              </SelectPortal>
            </Select>

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
      </KeyboardAwareModal>
    </View>
  );
}
