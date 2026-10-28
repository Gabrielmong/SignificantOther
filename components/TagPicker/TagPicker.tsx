import React, { useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';
import { normalizeTag } from '../../utils/photos';

interface TagPickerProps {
  selected: string[];
  suggestions: string[]; // Tags already used in the gallery
  onChange: (tags: string[]) => void;
}

// Selected tags (tap to remove), existing tags to reuse, and a field for a
// new one. Tags are normalized so "Trips" and "trips " are the same tag.
export const TagPicker: React.FC<TagPickerProps> = ({ selected, suggestions, onChange }) => {
  const { theme } = useAppTheme();
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (tag && !selected.includes(tag)) onChange([...selected, tag]);
    setDraft('');
  };

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={`${active ? 's' : 'o'}-${label}`}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radii.full,
        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceElevated,
      }}>
      <Text
        style={{
          fontSize: theme.fontSize.sm,
          color: active ? theme.colors.onPrimary : theme.colors.text,
        }}>
        {active ? `${label}  ×` : label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {selected.map((tag) => chip(tag, true, () => onChange(selected.filter((t) => t !== tag))))}
        {suggestions
          .filter((tag) => !selected.includes(tag))
          .map((tag) => chip(tag, false, () => addTag(tag)))}
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => addTag(draft)}
        placeholder="+ new tag"
        placeholderTextColor={theme.colors.textTertiary}
        returnKeyType="done"
        blurOnSubmit={false}
        style={{
          color: theme.colors.text,
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      />
    </View>
  );
};
