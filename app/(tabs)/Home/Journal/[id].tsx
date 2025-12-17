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
  RefreshControl,
  Spinner,
  HStack,
} from '@gluestack-ui/themed';
import { useAppTheme, useAuth, useFirebase } from '../../../../hooks';
import { StatusBar, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Journal } from '../../../../types';
import { ArrowLeft, Edit, Trash, Calendar, User, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Note() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  console.log(params.id);
  const { getEntryInJournal, deleteEntryInJournal } = useFirebase();
  const [note, setNote] = useState<Journal | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
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
        setLoading(false);
      });
    }
  };

  const createdDate = new Date(String(note?.createdAt));
  const updatedDate = new Date(String(note?.updatedAt));

  const isUpdated = createdDate.getTime() !== updatedDate.getTime();

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleEdit = () => {
    router.push(`/(tabs)/Home/Journal/editor?id=${params.id}`);
  };

  const handleDeleteModalOpen = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteNote = () => {
    deleteEntryInJournal(String(user.roomId), String(params.id)).then(() => {
      router.push('/(tabs)/Home/Journal/');
    });
  };

  const isSelf = user?.uid === note?.authorId;
  const gradientColors = isSelf ? ['#8B5CF6', '#7C3AED'] : ['#3B82F6', '#2563EB'];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
            Journal Entry
          </Text>

          <HStack style={{ gap: theme.spacing[2] }}>
            {user?.uid === note?.authorId && (
              <>
                <TouchableOpacity onPress={handleEdit}>
                  <Edit size={22} color={theme?.colors?.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDeleteModalOpen}>
                  <Trash size={22} color={theme?.colors?.error} />
                </TouchableOpacity>
              </>
            )}
          </HStack>
        </HStack>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.commonSpacing.screenPadding,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }>
        {loading ? (
          <Box
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: theme.spacing[10],
            }}>
            <Spinner size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: theme.spacing[3], color: theme.colors.textSecondary }}>
              Loading...
            </Text>
          </Box>
        ) : (
          <>
            {/* Content Card with Gradient */}
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: theme.radii.xl,
                padding: theme.spacing[5],
                ...theme.shadows.lg,
                marginBottom: theme.spacing[4],
              }}>
              {/* Title */}
              <Text
                style={{
                  fontSize: theme.fontSize['3xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: '#FFFFFF',
                  lineHeight: theme.lineHeight.tight * theme.fontSize['3xl'],
                  marginBottom: theme.spacing[4],
                }}>
                {note?.title}
              </Text>

              {/* Author Badge */}
              <HStack
                style={{
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[4],
                  paddingBottom: theme.spacing[4],
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.2)',
                }}>
                <Box
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    paddingHorizontal: theme.spacing[3],
                    paddingVertical: theme.spacing[1],
                    borderRadius: theme.radii.full,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                  }}>
                  <User size={14} color="#FFFFFF" />
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: '#FFFFFF',
                      fontWeight: theme.fontWeight.semibold,
                    }}>
                    {isSelf ? 'You' : note?.author}
                  </Text>
                </Box>
              </HStack>

              {/* Description */}
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontSize: theme.fontSize.md,
                  lineHeight: theme.lineHeight.relaxed * theme.fontSize.md,
                }}>
                {note?.description}
              </Text>
            </LinearGradient>

            {/* Metadata Card */}
            <Box
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.lg,
                padding: theme.spacing[4],
                gap: theme.spacing[3],
                ...theme.shadows.sm,
              }}>
              {/* Created Date */}
              <HStack style={{ alignItems: 'center', gap: theme.spacing[2] }}>
                <Calendar size={16} color={theme.colors.textSecondary} />
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}>
                  Created: {formatDateTime(String(note?.createdAt))}
                </Text>
              </HStack>

              {/* Updated Date */}
              {isUpdated && (
                <HStack style={{ alignItems: 'center', gap: theme.spacing[2] }}>
                  <Clock size={16} color={theme.colors.textSecondary} />
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}>
                    Updated: {formatDateTime(String(note?.updatedAt))}
                  </Text>
                </HStack>
              )}
            </Box>
          </>
        )}
      </ScrollView>

      <StatusBar backgroundColor="transparent" translucent />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <ModalBackdrop onPress={() => setDeleteModalOpen(false)} />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>
            <Text
              style={{
                fontSize: theme.fontSize.xl,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text,
              }}>
              Delete Entry?
            </Text>
          </ModalHeader>

          <Box
            style={{
              padding: theme.commonSpacing.screenPadding,
              gap: theme.spacing[3],
            }}>
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing[2],
              }}>
              This action cannot be undone. The entry will be permanently deleted.
            </Text>

            <HStack style={{ gap: theme.spacing[3] }}>
              <TouchableOpacity onPress={() => setDeleteModalOpen(false)} style={{ flex: 1 }}>
                <Box
                  style={{
                    padding: theme.spacing[3],
                    borderRadius: theme.radii.lg,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    alignItems: 'center',
                  }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.fontSize.md,
                      fontWeight: theme.fontWeight.semibold,
                    }}>
                    Cancel
                  </Text>
                </Box>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleDeleteNote} style={{ flex: 1 }}>
                <Box
                  style={{
                    padding: theme.spacing[3],
                    borderRadius: theme.radii.lg,
                    backgroundColor: theme.colors.error,
                    alignItems: 'center',
                  }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: theme.fontSize.md,
                      fontWeight: theme.fontWeight.semibold,
                    }}>
                    Delete
                  </Text>
                </Box>
              </TouchableOpacity>
            </HStack>
          </Box>
        </ModalContent>
      </Modal>
    </View>
  );
}
