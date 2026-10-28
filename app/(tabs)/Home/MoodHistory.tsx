import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Box, HStack, Heading, Text } from '@gluestack-ui/themed';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAppTheme, useAppToast, useAuth, useFirebase } from '../../../hooks';
import {
  AnimatedHeartLoader,
  MoodCalendar,
  MoodDayModal,
  MoodDaySection,
} from '../../../components';
import { useAppSelector } from '../../../state';
import { FeelingHistoryEntry } from '../../../types';
import {
  formatDayTitle,
  formatMonthTitle,
  groupByDay,
  lastFeelingPerDay,
  monthKey,
  shiftMonth,
} from '../../../utils/feelingHistory';

type MonthData = {
  mine: FeelingHistoryEntry[];
  partner: FeelingHistoryEntry[];
};

export default function MoodHistory() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { getFeelingHistoryMonth } = useFirebase();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);

  const roomId = user.roomId || null;
  const userId = user.uid || null;
  const currentMonth = monthKey(Date.now());
  const partnerLabel = partnerName || 'Partner';

  const [month, setMonth] = useState(currentMonth);
  // Results are stored per month key, so a slow response for one month
  // can never overwrite another month's data.
  const [months, setMonths] = useState<{ [month: string]: MonthData }>({});
  const [failed, setFailed] = useState<{ [month: string]: boolean }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const loadMonth = async (target: string) => {
    if (!roomId || !userId) return;

    try {
      const [mine, partner] = await Promise.all([
        getFeelingHistoryMonth(roomId, userId, target),
        partnerId
          ? getFeelingHistoryMonth(roomId, partnerId, target)
          : Promise.resolve([] as FeelingHistoryEntry[]),
      ]);
      setMonths((prev) => ({ ...prev, [target]: { mine, partner } }));
      setFailed((prev) => ({ ...prev, [target]: false }));
    } catch (error) {
      console.error('Error loading mood history:', error);
      setFailed((prev) => ({ ...prev, [target]: true }));
      showToast({
        title: "Couldn't load mood history",
        description: 'Pull down to try again',
        status: 'error',
      });
    }
  };

  // Fetch each month once per visit; pull-to-refresh refetches.
  useEffect(() => {
    if (months[month]) return;
    loadMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, roomId, userId, partnerId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMonth(month);
    setRefreshing(false);
  };

  const handleChangeMonth = (delta: number) => {
    setSelectedDay(null);
    setMonth((prev) => shiftMonth(prev, delta));
  };

  const data = months[month];
  const mineByDay = useMemo(() => groupByDay(data?.mine ?? [], month), [data, month]);
  const partnerByDay = useMemo(() => groupByDay(data?.partner ?? [], month), [data, month]);
  const isLoading = !!roomId && !data && !failed[month];
  const isEmpty =
    !!data && Object.keys(mineByDay).length === 0 && Object.keys(partnerByDay).length === 0;
  const isCurrentMonth = month === currentMonth;
  const todayDay = isCurrentMonth ? new Date().getDate() : null;

  const sections: MoodDaySection[] =
    selectedDay === null
      ? []
      : [
          { label: 'You', entries: mineByDay[selectedDay] ?? [] },
          ...(partnerId ? [{ label: partnerLabel, entries: partnerByDay[selectedDay] ?? [] }] : []),
        ];

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
            Mood history
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
        {/* Month navigation */}
        <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => handleChangeMonth(-1)} style={{ padding: 8 }}>
            <ChevronLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: theme?.fontSize?.lg,
              fontWeight: theme?.fontWeight?.semibold,
              color: theme?.colors?.text,
            }}>
            {formatMonthTitle(month)}
          </Text>
          <TouchableOpacity
            onPress={() => handleChangeMonth(1)}
            disabled={isCurrentMonth}
            style={{ padding: 8, opacity: isCurrentMonth ? 0.3 : 1 }}>
            <ChevronRight size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
        </HStack>

        {/* Legend */}
        <Text
          style={{
            fontSize: theme?.fontSize?.xs,
            color: theme?.colors?.textTertiary,
            textAlign: 'center',
          }}>
          {partnerId
            ? `Each day shows you on the left and ${partnerLabel} on the right`
            : 'Each day shows your last feeling'}
        </Text>

        {isLoading ? (
          <Box style={{ paddingVertical: 60, alignItems: 'center' }}>
            <AnimatedHeartLoader />
          </Box>
        ) : (
          <>
            <MoodCalendar
              month={month}
              mineByDay={lastFeelingPerDay(mineByDay)}
              partnerByDay={lastFeelingPerDay(partnerByDay)}
              todayDay={todayDay}
              onDayPress={setSelectedDay}
            />
            {isEmpty && (
              <Text
                style={{
                  fontSize: theme?.fontSize?.sm,
                  color: theme?.colors?.textSecondary,
                  textAlign: 'center',
                  marginTop: 8,
                }}>
                No feelings logged this month yet
              </Text>
            )}
            {failed[month] && !data && (
              <Text
                style={{
                  fontSize: theme?.fontSize?.sm,
                  color: theme?.colors?.textSecondary,
                  textAlign: 'center',
                  marginTop: 8,
                }}>
                Couldn't load this month. Pull down to try again.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <MoodDayModal
        isOpen={selectedDay !== null}
        title={selectedDay === null ? '' : formatDayTitle(month, selectedDay)}
        sections={sections}
        onClose={() => setSelectedDay(null)}
      />
    </Box>
  );
}
