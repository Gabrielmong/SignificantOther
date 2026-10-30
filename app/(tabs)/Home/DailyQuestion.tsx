import { Box, HStack, Heading, Text } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';

import { AnimatedHeartLoader, AnswerModal } from '../../../components';
import { useAppTheme, useAppToast, useAuth, useFirebase } from '../../../hooks';
import { useAppSelector } from '../../../state';
import { DailyAnswer, DailyQuestionDay } from '../../../types';
import {
  MAX_ANSWER_LENGTH,
  addDays,
  formatDateKey,
  questionForDate,
  todayKey,
} from '../../../utils/dailyQuestion';

const HISTORY_DAYS = 30;

type HistoryItem = { dateKey: string; day: DailyQuestionDay };

// Days nobody answered have no data, but can still be answered late, so list
// them too: back to the first stored day, so a new couple doesn't start with a
// month of missed questions. `stored` is newest first.
const withMissedDays = (stored: HistoryItem[], today: string): HistoryItem[] => {
  const oldestStored = stored[stored.length - 1]?.dateKey;
  if (!oldestStored) return stored;

  const byDate = new Map(stored.map((item) => [item.dateKey, item.day]));
  const windowStart = addDays(today, -(HISTORY_DAYS - 1));
  const items: HistoryItem[] = [];
  for (let dateKey = today; dateKey >= windowStart && dateKey >= oldestStored; ) {
    items.push({ dateKey, day: byDate.get(dateKey) ?? {} });
    dateKey = addDays(dateKey, -1);
  }
  // Older answered days the query returned stay listed
  return [...items, ...stored.filter((item) => item.dateKey < windowStart)];
};

const formatAnsweredAt = (answeredAt: number) =>
  new Date(answeredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function DailyQuestionHistory() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { getDailyQuestionHistory, saveDailyAnswer } = useFirebase();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);

  const roomId = user.roomId || null;
  const userId = user.uid || null;
  const partnerLabel = partnerName || 'Partner';

  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // The missed day being answered late
  const [answering, setAnswering] = useState<HistoryItem | null>(null);

  const load = useCallback(async () => {
    if (!roomId) {
      setItems([]);
      return;
    }

    try {
      setItems(withMissedDays(await getDailyQuestionHistory(roomId, HISTORY_DAYS), todayKey()));
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

  const handleSaveLate = async (text: string) => {
    const answer = text.trim().slice(0, MAX_ANSWER_LENGTH);
    if (!answering || !roomId || !userId || !answer) return;

    const { dateKey, day } = answering;
    try {
      await saveDailyAnswer(
        roomId,
        userId,
        dateKey,
        day.question ?? questionForDate(dateKey),
        answer,
      );
      setAnswering(null);
      await load();
    } catch (error) {
      console.error('Error saving late answer:', error);
      showToast({
        title: "Couldn't save your answer",
        description: 'Please try again',
        status: 'error',
      });
    }
  };

  const today = todayKey();

  // `answer` is passed only when its text is shown, to tag it if it was late
  const answerRow = (label: string, text: string, muted: boolean, answer?: DailyAnswer) => (
    <Box style={{ marginTop: theme.spacing[2] }}>
      <HStack style={{ alignItems: 'center', gap: theme.spacing[2] }}>
        <Text
          style={{
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.textSecondary,
          }}>
          {label}
        </Text>
        {answer?.late && (
          <Box
            style={{
              paddingHorizontal: theme.spacing[2],
              borderRadius: theme.radii.full,
              borderWidth: 1,
              borderColor: theme.colors.warning,
            }}>
            <Text
              style={{
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.warning,
              }}>
              {`Late · ${formatAnsweredAt(answer.answeredAt)}`}
            </Text>
          </Box>
        )}
      </HStack>
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
            const question = day.question ?? questionForDate(dateKey);

            // Same rule as the Home card on every day, since a missed day can
            // still be answered late: the partner's answer shows once you've
            // answered too.
            const partnerRevealed = !!theirs && !!mine;
            let partnerText = theirs?.text ?? 'Not answered yet';
            let partnerMuted = !theirs;
            if (theirs && !mine) {
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
                  {question}
                </Text>
                {answerRow('You', mine?.text ?? 'Not answered yet', !mine, mine)}
                {!!partnerId &&
                  answerRow(
                    partnerLabel,
                    partnerText,
                    partnerMuted,
                    partnerRevealed ? theirs : undefined,
                  )}
                {!isToday && !mine && (
                  <TouchableOpacity
                    onPress={() => setAnswering({ dateKey, day })}
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: theme.spacing[3],
                      paddingHorizontal: theme.spacing[4],
                      paddingVertical: theme.spacing[2],
                      borderRadius: theme.radii.full,
                      backgroundColor: theme.colors.primary,
                    }}>
                    <Text
                      style={{
                        color: theme.colors.white,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.semibold,
                      }}>
                      Answer late
                    </Text>
                  </TouchableOpacity>
                )}
              </Box>
            );
          })
        )}
      </ScrollView>

      <AnswerModal
        isOpen={!!answering}
        question={answering ? (answering.day.question ?? questionForDate(answering.dateKey)) : ''}
        initialText=""
        note={
          answering
            ? `${formatDateKey(answering.dateKey)} is over, so your answer will be marked late.`
            : undefined
        }
        onClose={() => setAnswering(null)}
        onSave={handleSaveLate}
      />
    </Box>
  );
}
