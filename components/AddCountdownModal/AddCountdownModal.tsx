import React, { useState } from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  Box,
  Text,
  Button,
  Input,
  InputField,
  Select,
  SelectTrigger,
  SelectInput,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
} from '@gluestack-ui/themed';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RecurrenceType, RecurrenceUnit } from '../../types';

interface AddCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (countdown: {
    title: string;
    date: number;
    icon: string;
    recurrence?: RecurrenceType;
    recurrenceInterval?: number;
    recurrenceUnit?: RecurrenceUnit;
  }) => void;
  initialData?: {
    title: string;
    date: number;
    icon: string;
    recurrence?: RecurrenceType;
    recurrenceInterval?: number;
    recurrenceUnit?: RecurrenceUnit;
  };
}

const ICON_OPTIONS = [
  '❤️',
  '💕',
  '💑',
  '🎉',
  '🎂',
  '✈️',
  '🏖️',
  '💍',
  '🌹',
  '🎁',
  '📅',
  '⏰',
  '🌟',
  '💝',
  '🎊',
];

export const AddCountdownModal: React.FC<AddCountdownModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const { theme } = useAppTheme();
  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(
    initialData?.date ? new Date(initialData.date) : new Date(),
  );
  const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || '❤️');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(
    initialData?.recurrence || 'none',
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState<string>(
    initialData?.recurrenceInterval?.toString() || '1',
  );
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>(
    initialData?.recurrenceUnit || 'months',
  );

  const handleSave = () => {
    if (!title.trim()) return;

    const countdownData: any = {
      title: title.trim(),
      date: date.getTime(),
      icon: selectedIcon,
      recurrence,
    };

    // Only include recurrence fields if recurrence is 'custom'
    if (recurrence === 'custom') {
      countdownData.recurrenceInterval = parseInt(recurrenceInterval) || 1;
      countdownData.recurrenceUnit = recurrenceUnit;
    }

    onSave(countdownData);

    // Reset form
    setTitle('');
    setDate(new Date());
    setSelectedIcon('❤️');
    setRecurrence('none');
    setRecurrenceInterval('1');
    setRecurrenceUnit('months');
    onClose();
  };

  const handleCancel = () => {
    setTitle(initialData?.title || '');
    setDate(initialData?.date ? new Date(initialData.date) : new Date());
    setSelectedIcon(initialData?.icon || '❤️');
    setRecurrence(initialData?.recurrence || 'none');
    setRecurrenceInterval(initialData?.recurrenceInterval?.toString() || '1');
    setRecurrenceUnit(initialData?.recurrenceUnit || 'months');
    onClose();
  };

  return (
    <Modal isOpen={isOpen}>
      <ModalBackdrop onPress={handleCancel} />
      <ModalContent>
        <ModalCloseButton onPress={handleCancel} />
        <ModalHeader>
          <Text
            style={{
              fontSize: theme?.fontSize?.lg || 18,
              fontWeight: theme?.fontWeight?.bold || '700',
              color: theme?.colors?.text || '#000000',
            }}>
            {initialData ? 'Edit Countdown' : 'New Countdown'}
          </Text>
        </ModalHeader>

        <Box style={{ padding: 20, gap: 20 }}>
          {/* Title Input */}
          <Box>
            <Text
              style={{
                fontSize: theme?.fontSize?.sm || 14,
                fontWeight: theme?.fontWeight?.semibold || '600',
                color: theme?.colors?.text || '#000000',
                marginBottom: 8,
              }}>
              Title
            </Text>
            <Input>
              <InputField
                value={title}
                onChangeText={setTitle}
                placeholder="Anniversary, Next Date, etc."
              />
            </Input>
          </Box>

          {/* Icon Selection */}
          <Box>
            <Text
              style={{
                fontSize: theme?.fontSize?.sm || 14,
                fontWeight: theme?.fontWeight?.semibold || '600',
                color: theme?.colors?.text || '#000000',
                marginBottom: 8,
              }}>
              Icon
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Box style={{ flexDirection: 'row', gap: 8 }}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    onPress={() => setSelectedIcon(icon)}
                    style={[
                      styles.iconButton,
                      {
                        backgroundColor:
                          selectedIcon === icon
                            ? theme?.gradients?.primary?.colors?.[0] || '#8B5CF6'
                            : theme?.colors?.surface || '#F3F4F6',
                      },
                    ]}>
                    <Text style={styles.iconText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </Box>
            </ScrollView>
          </Box>

          {/* Date Selection */}
          <Box>
            <Text
              style={{
                fontSize: theme?.fontSize?.sm || 14,
                fontWeight: theme?.fontWeight?.semibold || '600',
                color: theme?.colors?.text || '#000000',
                marginBottom: 8,
              }}>
              Date
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                backgroundColor: theme?.colors?.surface || '#F3F4F6',
                padding: 12,
                borderRadius: 8,
              }}>
              <Text
                style={{
                  fontSize: theme?.fontSize?.md || 16,
                  color: theme?.colors?.text || '#000000',
                }}>
                {date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          </Box>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
            />
          )}

          {/* Recurrence Selection */}
          <Box>
            <Text
              style={{
                fontSize: theme?.fontSize?.sm || 14,
                fontWeight: theme?.fontWeight?.semibold || '600',
                color: theme?.colors?.text || '#000000',
                marginBottom: 8,
              }}>
              Recurrence
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Box style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { value: 'none', label: 'None' },
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'custom', label: 'Custom' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setRecurrence(option.value as RecurrenceType)}
                    style={[
                      styles.recurrenceButton,
                      {
                        backgroundColor:
                          recurrence === option.value
                            ? theme?.gradients?.primary?.colors?.[0] || '#8B5CF6'
                            : theme?.colors?.surface || '#F3F4F6',
                      },
                    ]}>
                    <Text
                      style={{
                        color:
                          recurrence === option.value
                            ? '#FFFFFF'
                            : theme?.colors?.text || '#000000',
                        fontSize: theme?.fontSize?.sm || 14,
                        fontWeight: theme?.fontWeight?.semibold || '600',
                      }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Box>
            </ScrollView>
          </Box>

          {/* Custom Interval Input */}
          {recurrence === 'custom' && (
            <Box style={{ flexDirection: 'row', gap: 12 }}>
              <Box style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme?.fontSize?.sm || 14,
                    fontWeight: theme?.fontWeight?.semibold || '600',
                    color: theme?.colors?.text || '#000000',
                    marginBottom: 8,
                  }}>
                  Every
                </Text>
                <Input>
                  <InputField
                    value={recurrenceInterval}
                    onChangeText={setRecurrenceInterval}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </Input>
              </Box>
              <Box style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme?.fontSize?.sm || 14,
                    fontWeight: theme?.fontWeight?.semibold || '600',
                    color: theme?.colors?.text || '#000000',
                    marginBottom: 8,
                  }}>
                  Unit
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Box style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { value: 'days', label: 'Days' },
                      { value: 'weeks', label: 'Weeks' },
                      { value: 'months', label: 'Months' },
                      { value: 'years', label: 'Years' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() =>
                          setRecurrenceUnit(option.value as RecurrenceUnit)
                        }
                        style={[
                          styles.unitButton,
                          {
                            backgroundColor:
                              recurrenceUnit === option.value
                                ? theme?.gradients?.primary?.colors?.[0] ||
                                  '#8B5CF6'
                                : theme?.colors?.surface || '#F3F4F6',
                          },
                        ]}>
                        <Text
                          style={{
                            color:
                              recurrenceUnit === option.value
                                ? '#FFFFFF'
                                : theme?.colors?.text || '#000000',
                            fontSize: theme?.fontSize?.sm || 14,
                          }}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </Box>
                </ScrollView>
              </Box>
            </Box>
          )}

          {/* Action Buttons */}
          <Box style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              onPress={handleCancel}
              style={{
                flex: 1,
                backgroundColor: theme?.colors?.surface || '#F3F4F6',
              }}>
              <Text style={{ color: theme?.colors?.text || '#000000' }}>Cancel</Text>
            </Button>
            <Button
              onPress={handleSave}
              disabled={!title.trim()}
              style={{
                flex: 1,
                backgroundColor: theme?.gradients?.primary?.colors?.[0] || '#8B5CF6',
                opacity: title.trim() ? 1 : 0.5,
              }}>
              <Text style={{ color: '#FFFFFF' }}>Save</Text>
            </Button>
          </Box>
        </Box>
      </ModalContent>
    </Modal>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  recurrenceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
