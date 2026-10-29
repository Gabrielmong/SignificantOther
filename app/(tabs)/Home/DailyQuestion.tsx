import { Box, HStack, Heading, Text } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';

import { AnimatedHeartLoader } from '../../../components';
import { useAppTheme, useAppToast, useAuth, useFirebase } from '../../../hooks';
import { useAppSelector } from '../../../state';
import { DailyQuestionDay } from '../../../types';
import { formatDateKey, todayKey } from '../../../utils/dailyQuestion';

const HISTORY_DAYS = 30;

type HistoryItem = { dateKey: string; day: DailyQuestionDay };

export default function DailyQuestionHistory() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { getDailyQuestionHistory } = useFirebase();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);

  const roomId = user.roomId || null;
  const userId = user.uid || null;
  const partnerLabel = partnerName || 'Partner';

  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) {
      setItems([]);
      return;
    }

    try {
      setItems(await getDailyQuestionHistory(roomId, HISTORY_DAYS));
    } catch (error) {
      console.error('Error loading daily questions:', error);
      setItems((prev) => prev ?? []);
      showToast({
        title: "Couldn't load past questions",
        description: 'Pull down to try again',
        status: 'error',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const today = todayKey();

  const answerRow = (label: string, text: string, muted: boolean) => (
    <Box style={{ marginTop: theme.spacing[2] }}>
      <Text
        style={{
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textSecondary,
        }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: theme.fontSize.md,
          color: muted ? theme.colors.textTertiary : theme.colors.text,
          fontStyle: muted ? 'italic' : 'normal',
        }}>
        {text}
      </Text>
    </Box>
  );

  return (
    <Box style={{ flex: 1, backgroundColor: theme?.colors?.background }}>
      <StatusBar
        backgroundColor={theme?.colors?.background}
        style={theme?.colorMode === 'dark' ? 'light' : 'dark'}
      />

      {/* Header */}
      <Box
        style={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: theme?.colors?.surface,
          ...theme?.shadows?.sm,
        }}>
        <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
          <Heading
            style={{
              fontSize: theme?.fontSize?.xl,
              fontWeight: theme?.fontWeight?.bold,
              color: theme?.colors?.text,
            }}>
            Daily questions
          </Heading>
          <Box style={{ width: 24 }} />
        </HStack>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }>
        {items === null ? (
          <Box style={{ paddingVertical: 60, alignItems: 'center' }}>
            <AnimatedHeartLoader />
          </Box>
        ) : items.length === 0 ? (
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.textSecondary,
              textAlign: 'center',
              paddingVertical: 60,
            }}>
            No questions answered yet
          </Text>
        ) : (
          items.map(({ dateKey, day }) => {
            const isToday = dateKey === today;
            const mine = userId ? day.answers?.[userId] : undefined;
            const theirs = partnerId ? day.answers?.[partnerId] : undefined;

            // Today follows the same rule as the Home card; past days are over,
            // so both answers show.
            let partnerText = theirs?.text ?? (isToday ? 'Not answered yet' : "didn't answer");
            let partnerMuted = !theirs;
            if (isToday && theirs && !mine) {
              partnerText = 'Answered — answer yours to see it';
              partnerMuted = true;
            }

            return (
              <Box
                key={dateKey}
                style={{
                  padding: 16,
                  borderRadius: theme.radii.lg,
                  backgroundColor: theme.colors.surface,
                  ...theme.shadows.sm,
                }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.primary,
                  }}>
                  {isToday ? 'Today' : formatDateKey(dateKey)}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.md,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text,
                    marginTop: 2,
                  }}>
                  {day.question ?? ''}
                </Text>
                {answerRow(
                  'You',
                  mine?.text ?? (isToday ? 'Not answered yet' : "didn't answer"),
                  !mine,
                )}
                {!!partnerId && answerRow(partnerLabel, partnerText, partnerMuted)}
              </Box>
            );
          })
        )}
      </ScrollView>
    </Box>
  );
}
