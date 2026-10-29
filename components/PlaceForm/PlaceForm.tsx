import { Text } from '@gluestack-ui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

import { useAppTheme } from '../../hooks';
import type { PlaceInput } from '../../hooks/usePlaces';
import { parseDay, toDay } from '../../utils/milestones';

export const PLACE_EMOJIS = [
  '📍',
  '👋',
  '💕',
  '🍽️',
  '☕',
  '🏠',
  '✈️',
  '🏖️',
  '🎉',
  '💍',
  '🌳',
  '⭐',
];

interface PlaceFormProps {
  value: PlaceInput;
  onChange: (v: PlaceInput) => void;
}

// Name, pin emoji, venue, optional date and note of a place
export const PlaceForm: React.FC<PlaceFormProps> = ({ value, onChange }) => {
  const { theme } = useAppTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const label = (text: string) => (
    <Text
      style={{
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
        marginBottom: 6,
      }}>
      {text}
    </Text>
  );

  const input = (
    text: string | undefined,
    onText: (t: string) => void,
    placeholder: string,
    multiline = false,
  ) => (
    <TextInput
      value={text ?? ''}
      onChangeText={onText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textTertiary}
      multiline={multiline}
      style={{
        color: theme.colors.text,
        backgroundColor: theme.colors.surfaceElevated,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: multiline ? 64 : undefined,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );

  return (
    <View style={{ gap: 14 }}>
      <View>
        {label('Name')}
        {input(value.name, (name) => onChange({ ...value, name }), 'Our first date, Where we met…')}
      </View>

      <View>
        {label('Pin')}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PLACE_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => onChange({ ...value, emoji: e })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    value.emoji === e ? theme.colors.primary : theme.colors.surfaceElevated,
                }}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View>
        {label('Venue (optional)')}
        {input(value.venue, (venue) => onChange({ ...value, venue }), 'La Terrazza, San José')}
      </View>

      <View>
        {label('Date (optional)')}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              flex: 1,
              backgroundColor: theme.colors.surfaceElevated,
              padding: 12,
              borderRadius: 8,
            }}>
            <Text style={{ color: value.day ? theme.colors.text : theme.colors.textTertiary }}>
              {value.day
                ? parseDay(value.day).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Add a date'}
            </Text>
          </TouchableOpacity>
          {!!value.day && (
            <TouchableOpacity onPress={() => onChange({ ...value, day: undefined })}>
              <Text style={{ color: theme.colors.textSecondary }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={value.day ? parseDay(value.day) : new Date()}
            mode="date"
            display="default"
            onChange={(_event, date) => {
              setShowDatePicker(false);
              if (date) onChange({ ...value, day: toDay(date) });
            }}
          />
        )}
      </View>

      <View>
        {label('Note (optional)')}
        {input(value.note, (note) => onChange({ ...value, note }), 'What happened here?', true)}
      </View>
    </View>
  );
};
