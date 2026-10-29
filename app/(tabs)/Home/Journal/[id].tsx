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
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit, Trash, Calendar, User, Clock, Eye, Send } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StatusBar, TouchableOpacity } from 'react-native';

import { applyOpacity } from '../../../../config/theme';
import { useAppTheme, useAuth, useFirebase, useShareToChat } from '../../../../hooks';
import { Journal } from '../../../../types';

export default function Note() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  console.log(params.id);
  const { getEntryInJournal, deleteEntryInJournal, markJournalEntryAsRead } = useFirebase();
  const [note, setNote] = useState<Journal | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const shareToChat = useShareToChat();

  // Reload on focus, not just mount: the stack keeps this screen mounted while
  // the editor is open, so coming back must pick up the edit
  useFocusEffect(
    useCallback(() => {
      if (params.id && user.roomId) {
        loadData();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id, user.roomId]),
  );

  const loadData = async () => {
    if (params.id && user.roomId) {
      getEntryInJournal(user.roomId, String(params.id)).then((data) => {
        setNote(data);
        if (data && data.authorId !== user.uid && !data.readAt) {
          markJournalEntryAsRead(user.roomId!, String(params.id)).catch(() => {});
        }
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

  // Title + date only: the body can be long or private
  const handleShare = () => {
    if (!note || !params.id) return;
    shareToChat({
      kind: 'journal',
      id: String(params.id),
      title: note.title,
      subtitle: createdDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      emoji: '📖',
    });
  };

  const handleDeleteModalOpen = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteNote = () => {
    deleteEntryInJournal(String(user.roomId), String(params.id)).then(() => {
      // Back, not push: pushing left the deleted note one back-swipe away
      router.back();
    });
  };

  const isSelf = user?.uid === note?.authorId;
  const gradientColors = isSelf ? theme.gradients.primary.colors : theme.gradients.partner.colors;
  const onColor = isSelf ? theme.colors.onPrimary : theme.colors.onPartner;

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
            {note && (
              <TouchableOpacity
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share entry to chat">
                <Send size={22} color={theme?.colors?.text} />
              </TouchableOpacity>
            )}

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
                  color: onColor,
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
                  <User size={14} color={onColor} />
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: onColor,
                      fontWeight: theme.fontWeight.semibold,
                    }}>
                    {isSelf ? 'You' : note?.author}
                  </Text>
                </Box>
              </HStack>

              {/* Description */}
              <Text
                style={{
                  color: applyOpacity(onColor, 0.95),
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

              {/* Read Receipt — only visible to the author */}
              {isSelf && note?.readAt && (
                <HStack style={{ alignItems: 'center', gap: theme.spacing[2] }}>
                  <Eye size={16} color={theme.colors.textSecondary} />
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}>
                    Seen: {formatDateTime(note.readAt)}
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
