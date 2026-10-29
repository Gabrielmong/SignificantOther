import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Box, HStack, Heading, Text } from '@gluestack-ui/themed';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAppTheme, useAppToast, useAuth, useFirebase } from '../../../hooks';
import {
  AnimatedHeartLoader,
  MoodCalendar,
  MoodDayModal,
  MoodDaySection,
} from '../../../components';
import { useAppSelector } from '../../../state';
import { CountdownObject, FeelingHistoryEntry } from '../../../types';
import {
  countdownOccurrencesInMonth,
  formatDayTitle,
  formatMonthTitle,
  formatShortDate,
  groupByDay,
  lastFeelingPerDay,
  monthKey,
  shiftMonth,
} from '../../../utils/feelingHistory';

type MonthData = {
  mine: FeelingHistoryEntry[];
  partner: FeelingHistoryEntry[];
};

// How far ahead the calendar can be browsed, so upcoming events are visible.
const MONTHS_AHEAD = 12;

export default function Calendar() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { getFeelingHistoryMonth, listenToCountdownChanges } = useFirebase();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);

  const roomId = user.roomId || null;
  const userId = user.uid || null;
  const [now, setNow] = useState(() => Date.now());
  const currentMonth = monthKey(now);
  const lastMonth = shiftMonth(currentMonth, MONTHS_AHEAD);
  const partnerLabel = partnerName || 'Partner';

  const [month, setMonth] = useState(currentMonth);
  const monthRef = useRef(month);
  monthRef.current = month;
  // Results are stored per month key, so a slow response for one month
  // can never overwrite another month's data.
  const [months, setMonths] = useState<{ [month: string]: MonthData }>({});
  const [failed, setFailed] = useState<{ [month: string]: boolean }>({});
  const [countdowns, setCountdowns] = useState<CountdownObject>({});
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

  // Cached months belong to one room and partner; drop them if either changes.
  useEffect(() => {
    setMonths({});
    setFailed({});
  }, [roomId, userId, partnerId]);

  // The tab stays mounted, so refetch the displayed month on every visit to
  // pick up feelings logged on Home or by the partner since the last fetch.
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      loadMonth(monthRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, userId, partnerId]),
  );

  // Fetch a month when it isn't cached (month navigation); pull-to-refresh refetches.
  useEffect(() => {
    if (months[month]) return;
    loadMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, roomId, userId, partnerId]);

  // Countdowns are live, so new or deleted events show without a refresh.
  useEffect(() => {
    if (!roomId) {
      setCountdowns({});
      return;
    }

    const unsubscribe = listenToCountdownChanges((data) => {
      setCountdowns(data.countdowns);
    }, roomId);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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
  const eventsByDay = useMemo(
    () => countdownOccurrencesInMonth(countdowns, month),
    [countdowns, month],
  );
  const eventIconsByDay = useMemo(() => {
    const icons: { [day: number]: string } = {};
    for (const [day, occurrences] of Object.entries(eventsByDay)) {
      icons[Number(day)] = occurrences[0].icon;
    }
    return icons;
  }, [eventsByDay]);
  const monthEvents = useMemo(
    () =>
      Object.entries(eventsByDay)
        .map(([day, occurrences]) => ({ day: Number(day), occurrences }))
        .sort((a, b) => a.day - b.day)
        .flatMap(({ day, occurrences }) => occurrences.map((occurrence) => ({ day, occurrence }))),
    [eventsByDay],
  );

  const isLoading = !!roomId && !data && !failed[month];
  // YYYY-MM keys sort chronologically as strings.
  const isPastOrCurrent = month <= currentMonth;
  const isEmpty =
    isPastOrCurrent &&
    !!data &&
    Object.keys(mineByDay).length === 0 &&
    Object.keys(partnerByDay).length === 0;
  const isLastMonth = month === lastMonth;
  const todayDay = month === currentMonth ? new Date(now).getDate() : null;

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
          alignItems: 'center',
          ...theme?.shadows?.sm,
        }}>
        <Heading
          style={{
            fontSize: theme?.fontSize?.xl,
            fontWeight: theme?.fontWeight?.bold,
            color: theme?.colors?.text,
          }}>
          Calendar
        </Heading>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        // Extra bottom padding keeps content clear of the floating tab bar.
        contentContainerStyle={{ padding: 16, paddingBottom: theme.spacing[5], gap: 12 }}
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
            disabled={isLastMonth}
            style={{ padding: 8, opacity: isLastMonth ? 0.3 : 1 }}>
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
              eventIconsByDay={eventIconsByDay}
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

        {/* This month's events */}
        {monthEvents.length > 0 && (
          <Box style={{ marginTop: 8, gap: 8 }}>
            <Text
              style={{
                fontSize: theme?.fontSize?.md,
                fontWeight: theme?.fontWeight?.semibold,
                color: theme?.colors?.text,
              }}>
              This month
            </Text>
            {monthEvents.map(({ day, occurrence }) => (
              <TouchableOpacity
                key={`${occurrence.id}-${occurrence.date}`}
                onPress={() => setSelectedDay(day)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: theme?.radii?.md,
                  backgroundColor: theme?.colors?.surface,
                }}>
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    marginRight: 8,
                    fontSize: theme?.fontSize?.sm,
                    color: theme?.colors?.text,
                  }}>
                  {`${occurrence.icon} ${occurrence.title}`}
                </Text>
                <Text style={{ fontSize: theme?.fontSize?.sm, color: theme?.colors?.textSecondary }}>
                  {formatShortDate(month, day)}
                </Text>
              </TouchableOpacity>
            ))}
          </Box>
        )}
      </ScrollView>

      <MoodDayModal
        isOpen={selectedDay !== null}
        title={selectedDay === null ? '' : formatDayTitle(month, selectedDay)}
        events={selectedDay === null ? [] : (eventsByDay[selectedDay] ?? [])}
        sections={sections}
        onClose={() => setSelectedDay(null)}
      />
    </Box>
  );
}
