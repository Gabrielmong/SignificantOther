import {
  View,
  Text,
  RefreshControl,
  ScrollView,
  StatusBar,
  Box,
  HStack,
} from '@gluestack-ui/themed';
import { useAppTheme, useAuth, useFirebase } from '../../../../hooks';
import { useEffect, useState } from 'react';
import { JournalObject } from '../../../../types';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Calendar, User, ChevronRight } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ParsedJournal extends JournalType {
  id: string;
}

export default function Journal() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const [journal, setJournal] = useState<ParsedJournal[] | null>(null);
  const { getJournal, listenToJournalChanges } = useFirebase();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
        {journal && journal.length > 0 &&
          journal.map(({ id, authorId, title, description, author, createdAt }) => {
            const isSelf = user?.uid === authorId;
            const gradientColors = isSelf
              ? ['#8B5CF6', '#7C3AED'] // Purple for self
              : ['#3B82F6', '#2563EB']; // Blue for partner

            return (
              <TouchableOpacity
                key={id}
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
                        color: '#FFFFFF',
                        flex: 1,
                      }}
                      numberOfLines={2}>
                      {title}
                    </Text>
                    <ChevronRight size={20} color="rgba(255, 255, 255, 0.6)" />
                  </HStack>

                  {/* Description */}
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: 'rgba(255, 255, 255, 0.9)',
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
                      <Calendar size={14} color="rgba(255, 255, 255, 0.8)" />
                      <Text
                        style={{
                          fontSize: theme.fontSize.xs,
                          color: 'rgba(255, 255, 255, 0.8)',
                        }}>
                        {formatDate(createdAt)}
                      </Text>
                    </HStack>

                    <HStack
                      style={{
                        alignItems: 'center',
                        gap: theme.spacing[1],
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        paddingHorizontal: theme.spacing[2],
                        paddingVertical: theme.spacing[1],
                        borderRadius: theme.radii.full,
                      }}>
                      <User size={12} color="#FFFFFF" />
                      <Text
                        style={{
                          fontSize: theme.fontSize.xs,
                          color: '#FFFFFF',
                          fontWeight: theme.fontWeight.semibold,
                        }}>
                        {isSelf ? 'You' : author}
                      </Text>
                    </HStack>
                  </HStack>
                </LinearGradient>
              </TouchableOpacity>
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
