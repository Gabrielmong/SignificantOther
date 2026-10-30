import { Text } from '@gluestack-ui/themed';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { applyOpacity, type GradientColors } from '../../config/theme';
import { useAppTheme } from '../../hooks';

export type Person = { name: string; photoURL?: string | null };

interface YouTwoHeaderProps {
  me: Person;
  partner: Person;
  counter: { big: string; detail: string; since: string } | null;
  onAddDatingPress: () => void;
}

const AVATAR = 76;

const Avatar = ({
  person,
  colors,
  onColor,
  style,
}: {
  person: Person;
  colors: GradientColors;
  onColor: string;
  style?: object;
}) => {
  const { theme } = useAppTheme();
  const frame = {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 3,
    borderColor: theme.colors.background,
    overflow: 'hidden' as const,
    ...style,
  };

  if (person.photoURL) {
    return (
      <View style={frame}>
        <Image source={{ uri: person.photoURL }} style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ ...frame, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: onColor, fontSize: 26, fontWeight: '700' }}>
        {person.name.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );
};

// Both photos, both names, and the "together" counter (style C)
export const YouTwoHeader: React.FC<YouTwoHeaderProps> = ({
  me,
  partner,
  counter,
  onAddDatingPress,
}) => {
  const { theme } = useAppTheme();

  return (
    <LinearGradient
      colors={[applyOpacity(theme.colors.primary, 0.35), applyOpacity(theme.colors.background, 0)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Avatar
          person={partner}
          colors={theme.gradients.partner.colors}
          onColor={theme.colors.onPartner}
        />
        <Avatar
          person={me}
          colors={theme.gradients.primary.colors}
          onColor={theme.colors.onPrimary}
          style={{ marginLeft: -14 }}
        />
      </View>

      <Text
        style={{
          fontSize: theme.fontSize['2xl'],
          lineHeight: theme.lineHeight.tight * theme.fontSize['2xl'],
          fontWeight: theme.fontWeight.bold,
          color: theme.colors.text,
        }}>
        {partner.name}{' '}
        <Text style={{ color: theme.colors.primary, fontSize: theme.fontSize['2xl'] }}>&amp;</Text>{' '}
        {me.name}
      </Text>

      {counter ? (
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Text
            style={{
              fontSize: 34,
              lineHeight: 40,
              fontWeight: '800',
              color: theme.colors.primary,
            }}>
            {counter.big}
          </Text>
          <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
            {counter.detail}
          </Text>
          <Text
            style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 4 }}>
            {counter.since}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onAddDatingPress}
          accessibilityRole="button"
          style={{
            marginTop: 14,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: theme.radii.full,
            backgroundColor: applyOpacity(theme.colors.primary, 0.15),
          }}>
          <Text style={{ color: theme.colors.primary, fontWeight: theme.fontWeight.semibold }}>
            When did you start dating?
          </Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};
