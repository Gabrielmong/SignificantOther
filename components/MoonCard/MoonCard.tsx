import { Box, Text } from '@gluestack-ui/themed';
import { useMemo } from 'react';

import { useAppTheme } from '../../hooks';
import {
  MoonInfo,
  PHASE_EMOJIS,
  PHASE_LABELS,
  countdownText,
  favoriteStatus,
  nextPhaseTime,
  phaseName,
} from '../../utils/moon';
import { MoonImage } from '../MoonImage';
import { PressableScale } from '../styled';

const IMAGE_SIZE = 100;
const DAY_MS = 86_400_000;

/** Tonight's moon on Home, with a countdown to the partner's favorite phase */
export const MoonCard = ({
  moon,
  now,
  partnerName,
  hasPartner,
  partnerFavorite,
  onPress,
}: {
  moon: MoonInfo;
  now: Date;
  partnerName: string;
  hasPartner: boolean;
  partnerFavorite: number | null;
  onPress: () => void;
}) => {
  const { theme } = useAppTheme();

  const fullMoonText = useMemo(() => {
    if (moon.name === 'full') return 'Full moon tonight';
    const days = Math.max(
      1,
      Math.round((nextPhaseTime(180, now).getTime() - now.getTime()) / DAY_MS),
    );
    return days === 1 ? 'Full moon tomorrow' : `Full moon in ${days} days`;
  }, [moon.name, now]);

  const pill = useMemo(() => {
    if (!hasPartner) return null;
    if (partnerFavorite === null) return countdownText(partnerName, null);
    return `${PHASE_EMOJIS[phaseName(partnerFavorite)]} ${countdownText(
      partnerName,
      favoriteStatus(partnerFavorite, now),
    )}`;
  }, [hasPartner, partnerFavorite, partnerName, now]);

  const lit = `${Math.round(moon.illumination * 100)}% lit`;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[PHASE_LABELS[moon.name], lit, fullMoonText, pill]
        .filter(Boolean)
        .join('. ')}
      style={{
        padding: theme.commonSpacing.cardPaddingCompact,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.md,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        ...theme.shadows.sm,
      }}>
      <MoonImage index={moon.imageIndex} size={IMAGE_SIZE} />
      <Box style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.textTertiary,
            fontSize: theme.fontSize.sm,
            marginBottom: theme.spacing[1],
          }}>
          Tonight's moon
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.fontSize.md,
            fontWeight: theme.fontWeight.bold,
          }}>
          {PHASE_LABELS[moon.name]}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.sm }}>
          {lit} · {fullMoonText}
        </Text>
        {pill && (
          <Box
            style={{
              alignSelf: 'flex-start',
              marginTop: theme.spacing[2],
              paddingHorizontal: theme.spacing[2],
              paddingVertical: 2,
              borderRadius: theme.radii.full,
              backgroundColor: theme.colors.primary + '22',
            }}>
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.semibold,
              }}>
              {pill}
            </Text>
          </Box>
        )}
      </Box>
    </PressableScale>
  );
};
