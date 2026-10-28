import React from 'react';
import { Text } from '@gluestack-ui/themed';
import { TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../hooks';
import { buildCalendarCells, feelingDisplay } from '../../utils/feelingHistory';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL_WIDTH = '14.2857%' as const;

interface MoodCalendarProps {
  month: string;
  mineByDay: { [day: number]: string };
  partnerByDay: { [day: number]: string };
  eventIconsByDay: { [day: number]: string };
  todayDay: number | null;
  onDayPress: (day: number) => void;
}

// Monday-first month grid. Each day shows the user's last feeling on the
// left and the partner's on the right, with the day's first countdown
// event emoji next to the day number.
export const MoodCalendar = ({
  month,
  mineByDay,
  partnerByDay,
  eventIconsByDay,
  todayDay,
  onDayPress,
}: MoodCalendarProps) => {
  const { theme } = useAppTheme();
  const cells = buildCalendarCells(month);

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((label, index) => (
          <View
            key={index}
            style={{ width: CELL_WIDTH, alignItems: 'center', paddingVertical: theme.spacing[1] }}>
            <Text
              style={{
                fontSize: theme.fontSize.xs,
                color: theme.colors.textTertiary,
                fontWeight: theme.fontWeight.semibold,
              }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`blank-${index}`} style={{ width: CELL_WIDTH, aspectRatio: 0.8 }} />;
          }

          const mine = mineByDay[day];
          const partner = partnerByDay[day];
          const eventIcon = eventIconsByDay[day];
          const hasEntries = !!mine || !!partner || !!eventIcon;
          const isToday = day === todayDay;

          return (
            <TouchableOpacity
              key={day}
              disabled={!hasEntries}
              onPress={() => onDayPress(day)}
              style={{ width: CELL_WIDTH, aspectRatio: 0.8, padding: 2 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: theme.radii.sm,
                  backgroundColor: hasEntries ? theme.colors.surface : 'transparent',
                  borderWidth: isToday ? 2 : 0,
                  borderColor: theme.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: theme.spacing[1],
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: isToday ? theme.colors.primary : theme.colors.textSecondary,
                      fontWeight: isToday ? theme.fontWeight.bold : theme.fontWeight.normal,
                    }}>
                    {day}
                  </Text>
                  {!!eventIcon && <Text style={{ fontSize: theme.fontSize.xs }}>{eventIcon}</Text>}
                </View>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  <Text style={{ fontSize: theme.fontSize.sm }}>
                    {mine ? feelingDisplay(mine).emoji : ' '}
                  </Text>
                  <Text style={{ fontSize: theme.fontSize.sm }}>
                    {partner ? feelingDisplay(partner).emoji : ' '}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
