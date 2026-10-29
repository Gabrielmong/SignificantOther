import { Box, Heading, HStack, Text } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Star } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { Skeleton } from '../../../components';
import { getChatMessage, useAppTheme, useChatStars } from '../../../hooks';
import { useAppSelector } from '../../../state';
import { MessageType } from '../../../types';
import { messagePreview } from '../../../utils/chat';
import { tapFeedback } from '../../../utils/haptics';
import { listItemExiting, listLayout, useListEntering } from '../../../utils/motion';

const formatStarredDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
};

// A message from the database: null while loading, 'deleted' once gone
type Loaded = MessageType | 'deleted';

/** Your starred messages, newest starred first */
export default function StarredMessages() {
  const { theme } = useAppTheme();
  const user = useAppSelector((state) => state.user);
  const room = useAppSelector((state) => state.room);
  const roomId = user.roomId || null;
  const uid = user.uid || null;
  const { stars, loading, setStarred } = useChatStars(roomId, uid);
  const [messages, setMessages] = useState<Record<string, Loaded>>({});

  const starredIds = useMemo(
    () =>
      Object.entries(stars)
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => id),
    [stars],
  );

  // Fetches each newly starred message once
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    const missing = starredIds.filter((id) => !(id in messages));
    missing.forEach((id) =>
      getChatMessage(roomId, id)
        .then((message) => {
          if (!cancelled) setMessages((prev) => ({ ...prev, [id]: message ?? 'deleted' }));
        })
        .catch((error) => console.error('Error loading starred message:', error)),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, starredIds]);

  const rows = starredIds
    .map((id) => messages[id])
    .filter((m): m is MessageType => !!m && m !== 'deleted');
  const fetching = loading || starredIds.some((id) => !(id in messages));
  const enterListItem = useListEntering(rows.length > 0);
  const partnerName = room.partnerName || 'Your partner';

  const unstar = (id: string) => {
    tapFeedback();
    setStarred(id, false);
  };

  return (
    <Box style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        backgroundColor={theme.colors.background}
        style={theme.colorMode === 'dark' ? 'light' : 'dark'}
      />

      {/* Header */}
      <Box
        style={{
          padding: 16,
          backgroundColor: theme.colors.surface,
          ...theme.shadows.sm,
        }}>
        <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Heading
            style={{
              fontSize: theme.fontSize.xl,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            Starred messages
          </Heading>
          {/* Balances the back arrow so the title stays centered */}
          <Box style={{ width: 24 }} />
        </HStack>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.commonSpacing.screenPadding, gap: 12 }}>
        {rows.length === 0 && fetching ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={72} />)
        ) : rows.length === 0 ? (
          <Box style={{ alignItems: 'center', paddingTop: 48, gap: 8 }}>
            <Star size={32} color={theme.colors.textTertiary} />
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
              No starred messages yet.{'\n'}Long-press a message and tap Star to keep it here.
            </Text>
          </Box>
        ) : (
          rows.map((message, index) => {
            const own = message.uid === uid;
            return (
              <Animated.View
                key={message.id}
                entering={enterListItem(index)}
                exiting={listItemExiting}
                layout={listLayout}>
                <Box
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 14,
                    borderRadius: theme.radii.md,
                    backgroundColor: theme.colors.surface,
                    borderLeftWidth: 3,
                    borderLeftColor: own ? theme.colors.messageSelf : theme.colors.messagePartner,
                    ...theme.shadows.sm,
                  }}>
                  <Box style={{ flex: 1, gap: 4 }}>
                    <HStack style={{ justifyContent: 'space-between', gap: 8 }}>
                      <Text
                        style={{
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text,
                        }}>
                        {own ? 'You' : partnerName}
                      </Text>
                      <Text
                        style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
                        {formatStarredDate(message.timestamp)}
                      </Text>
                    </HStack>
                    <Text
                      style={{ fontSize: theme.fontSize.md, color: theme.colors.text }}
                      numberOfLines={6}>
                      {messagePreview(message)}
                    </Text>
                  </Box>
                  <TouchableOpacity
                    onPress={() => unstar(message.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Unstar">
                    <Star size={20} color={theme.colors.warning} fill={theme.colors.warning} />
                  </TouchableOpacity>
                </Box>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </Box>
  );
}
