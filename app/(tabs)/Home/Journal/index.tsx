import {
  View,
  Text,
  RefreshControl,
  ScrollView,
  StatusBar,
  Box,
  HStack,
} from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Calendar, User, ChevronRight, Eye } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { applyOpacity } from '../../../../config/theme';
import { useAppTheme, useAuth, useFirebase } from '../../../../hooks';
import { Journal as JournalEntry, JournalObject } from '../../../../types';
import { listItemExiting, listLayout, useListEntering } from '../../../../utils/motion';

interface ParsedJournal extends JournalEntry {
  id: string;
}

export default function Journal() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const [journal, setJournal] = useState<ParsedJournal[] | null>(null);
  const { getJournal, listenToJournalChanges } = useFirebase();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const enterListItem = useListEntering(!!journal?.length);

  const loadData = async () => {
    if (user.roomId) {
      const data = (await getJournal(user.roomId)) as JournalObject;

      const orderedData = Object.keys(data)
        .map((key) => {
          return {
            id: key,
            ...data[key],
          };
        })
        .sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      setJournal(orderedData);

      setLoading(false);
    }
  };
  useEffect(() => {
    if (user.roomId) {
      loadData();
      listenToJournalChanges(({ journal }) => {
        const parsedJournal = Object.keys(journal).map((key) => {
          return {
            id: key,
            ...journal[key],
          };
        });

        const orderedData = parsedJournal.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        console.log(orderedData);

        setJournal(orderedData);
      }, user.roomId);
    }
  }, []);

  const handleCreateEntry = () => {
    router.push('/(tabs)/Home/Journal/editor');
  };

  const getTextPreview = (text: string) => {
    if (!text) return '';

    if (text.length > 120) {
      return text.slice(0, 120) + '...';
    }
    return text;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const goToEntry = (entryId: string) => {
    try {
      router.push(`/(tabs)/Home/Journal/${entryId}`);
    } catch (e) {
      console.log(e);
    }
  };

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
            Journal 📔
          </Text>

          <TouchableOpacity onPress={handleCreateEntry}>
            <Plus size={24} color={theme?.gradients?.primary?.colors?.[0]} />
          </TouchableOpacity>
        </HStack>
      </Box>
      <ScrollView
        style={{
          backgroundColor: theme.colors.background,
        }}
        contentContainerStyle={{
          paddingTop: theme.spacing[4],
          paddingHorizontal: theme.commonSpacing.screenPadding,
          paddingBottom: 60,
          gap: theme.spacing[3],
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}>
        {journal &&
          journal.length > 0 &&
          journal.map(({ id, authorId, title, description, author, createdAt, readAt }, index) => {
            const isSelf = user?.uid === authorId;
            const gradientColors = isSelf
              ? theme.gradients.primary.colors
              : theme.gradients.partner.colors;
            const onColor = isSelf ? theme.colors.onPrimary : theme.colors.onPartner;

            // Keyed by entry id: entering only runs on first mount, not when the
            // listener re-emits the same entries (e.g. a readAt update)
            return (
              <Animated.View
                key={id}
                entering={enterListItem(index)}
                exiting={listItemExiting}
                layout={listLayout}>
                <TouchableOpacity
                  style={{ width: '100%' }}
                  activeOpacity={0.9}
                  onPress={() => goToEntry(id)}>
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: theme.radii.xl,
                      padding: theme.commonSpacing.cardPadding,
                      ...theme.shadows.lg,
                    }}>
                    {/* Header with title and chevron */}
                    <HStack
                      style={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: theme.spacing[2],
                      }}>
                      <Text
                        style={{
                          fontSize: theme.fontSize.xl,
                          fontWeight: theme.fontWeight.bold,
                          color: onColor,
                          flex: 1,
                        }}
                        numberOfLines={2}>
                        {title}
                      </Text>
                      <ChevronRight size={20} color={applyOpacity(onColor, 0.6)} />
                    </HStack>

                    {/* Description */}
                    <Text
                      style={{
                        fontSize: theme.fontSize.sm,
                        color: applyOpacity(onColor, 0.9),
                        lineHeight: theme.lineHeight.relaxed * theme.fontSize.sm,
                        marginBottom: theme.spacing[3],
                      }}>
                      {getTextPreview(description)}
                    </Text>

                    {/* Footer with date and author */}
                    <HStack
                      style={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: theme.spacing[2],
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(255, 255, 255, 0.2)',
                      }}>
                      <HStack
                        style={{
                          alignItems: 'center',
                          gap: theme.spacing[1],
                        }}>
                        <Calendar size={14} color={applyOpacity(onColor, 0.8)} />
                        <Text
                          style={{
                            fontSize: theme.fontSize.xs,
                            color: applyOpacity(onColor, 0.8),
                          }}>
                          {formatDate(createdAt)}
                        </Text>
                      </HStack>

                      <HStack style={{ alignItems: 'center', gap: theme.spacing[2] }}>
                        <HStack
                          style={{
                            alignItems: 'center',
                            gap: theme.spacing[1],
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            paddingHorizontal: theme.spacing[2],
                            paddingVertical: theme.spacing[1],
                            borderRadius: theme.radii.full,
                          }}>
                          <User size={12} color={onColor} />
                          <Text
                            style={{
                              fontSize: theme.fontSize.xs,
                              color: onColor,
                              fontWeight: theme.fontWeight.semibold,
                            }}>
                            {isSelf ? 'You' : author}
                          </Text>
                        </HStack>

                        {isSelf && readAt && (
                          <HStack
                            style={{
                              alignItems: 'center',
                              gap: theme.spacing[1],
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              paddingHorizontal: theme.spacing[2],
                              paddingVertical: theme.spacing[1],
                              borderRadius: theme.radii.full,
                            }}>
                            <Eye size={12} color={onColor} />
                            <Text
                              style={{
                                fontSize: theme.fontSize.xs,
                                color: onColor,
                                fontWeight: theme.fontWeight.semibold,
                              }}>
                              Seen
                            </Text>
                          </HStack>
                        )}
                      </HStack>
                    </HStack>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

        {/* Empty State */}
        {journal && journal.length === 0 && !loading && (
          <Box
            style={{
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: theme.spacing[10],
              gap: theme.spacing[4],
            }}>
            <Text style={{ fontSize: 64 }}>📔</Text>
            <Text
              style={{
                fontSize: theme.fontSize.xl,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text,
                textAlign: 'center',
              }}>
              No journal entries yet
            </Text>
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.colors.textSecondary,
                textAlign: 'center',
                paddingHorizontal: theme.spacing[8],
              }}>
              Start documenting your memories and thoughts together!
            </Text>
            <TouchableOpacity
              onPress={handleCreateEntry}
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
                  Write Your First Entry
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Box>
        )}
      </ScrollView>

      <StatusBar backgroundColor="transparent" translucent />
    </View>
  );
}
