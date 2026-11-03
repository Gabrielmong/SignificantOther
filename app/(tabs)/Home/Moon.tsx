import { Box, Button, HStack, Heading, Text } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

import { MoonImage, MoonPhaseModal } from '../../../components';
import { useAppTheme, useAppToast, useAuth, useMoonFavorites, useMoonNow } from '../../../hooks';
import { useAppSelector } from '../../../state';
import {
  LunarEvent,
  PHASE_EMOJIS,
  PHASE_LABELS,
  countdownText,
  favoriteStatus,
  phaseName,
  relativeDayLabel,
  upcomingLunarEvents,
} from '../../../utils/moon';

const eventTitle = (e: LunarEvent) => {
  const tags = [e.supermoon && 'Supermoon', e.blueMoon && 'Blue moon'].filter(Boolean);
  const suffix = tags.length ? ` · ${tags.join(' · ')}` : '';
  if (e.type === 'fullMoon') return `🌕 Full Moon${suffix}`;
  if (e.eclipseKind === 'total') return `🔴 Blood Moon (total lunar eclipse)${suffix}`;
  if (e.eclipseKind === 'partial') return `🌘 Partial lunar eclipse${suffix}`;
  return `🌒 Penumbral lunar eclipse${suffix}`;
};

export default function Moon() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);
  const { showToast } = useAppToast();
  const { now, moon } = useMoonNow();
  const { myFavorite, partnerFavorite, saveFavorite } = useMoonFavorites({
    roomId: user.roomId,
    userId: user.uid,
    partnerId,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const partner = partnerName || 'Partner';
  const hasPartner = !!partnerId && partnerId.trim() !== '';

  // The list only changes day to day; computing it is a few hundred searches
  const dayKey = now.toDateString();
  const events = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return upcomingLunarEvents(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  const myStatus = myFavorite === null ? null : favoriteStatus(myFavorite, now);
  const myText = !myStatus
    ? 'Not set'
    : myStatus.isNow
      ? 'Here tonight'
      : myStatus.days === 1
        ? 'Tomorrow'
        : `In ${myStatus.days} days`;
  const partnerText = countdownText(
    partner,
    partnerFavorite === null ? null : favoriteStatus(partnerFavorite, now),
  );

  const handleSave = async (angle: number) => {
    try {
      await saveFavorite(angle);
      setPickerOpen(false);
    } catch (error) {
      console.error('Error saving favorite moon phase:', error);
      showToast({
        title: 'Could not save',
        description: 'Your favorite moon was not saved. Please try again.',
        status: 'error',
      });
    }
  };

  const sectionTitle = (title: string) => (
    <Text
      style={{
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
      {title}
    </Text>
  );

  const favoriteRow = (label: string, angle: number | null, text: string) => (
    <HStack style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Box style={{ flex: 1 }}>
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.md,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text,
          }}>
          {angle === null
            ? '—'
            : `${PHASE_EMOJIS[phaseName(angle)]} ${PHASE_LABELS[phaseName(angle)]}`}
        </Text>
      </Box>
      <Text
        style={{
          fontSize: theme.fontSize.sm,
          color: theme.colors.primary,
          fontWeight: theme.fontWeight.semibold,
          flexShrink: 1,
          textAlign: 'right',
        }}>
        {text}
      </Text>
    </HStack>
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
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
            <ArrowLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
          <Heading
            style={{
              fontSize: theme?.fontSize?.xl,
              fontWeight: theme?.fontWeight?.bold,
              color: theme?.colors?.text,
            }}>
            Moon
          </Heading>
          <Box style={{ width: 24 }} />
        </HStack>
      </Box>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Tonight */}
        <Box style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
          <MoonImage index={moon.imageIndex} size={220} />
          <Text
            style={{
              fontSize: theme.fontSize.xl,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            {PHASE_EMOJIS[moon.name]} {PHASE_LABELS[moon.name]}
          </Text>
          <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
            {Math.round(moon.illumination * 100)}% lit · Day {Math.floor(moon.ageDays)} of 29.5
          </Text>
        </Box>

        {/* Favorites */}
        <Box
          style={{
            gap: 14,
            padding: 16,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surface,
            ...theme.shadows.sm,
          }}>
          {sectionTitle('Favorite moons')}
          {favoriteRow('Your favorite', myFavorite, myText)}
          {hasPartner && favoriteRow(`${partner}'s favorite`, partnerFavorite, partnerText)}
          <Button
            onPress={() => setPickerOpen(true)}
            style={{ backgroundColor: theme.colors.primary, ...theme.shadows.sm }}>
            <Text
              style={{
                color: theme.colors.white,
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.semibold,
              }}>
              {myFavorite === null ? 'Set my favorite' : 'Change my favorite'}
            </Text>
          </Button>
        </Box>

        {/* Upcoming */}
        <Box
          style={{
            gap: 12,
            padding: 16,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surface,
            ...theme.shadows.sm,
          }}>
          {sectionTitle('Next 12 months')}
          {events.map((e) => {
            const total = e.type === 'eclipse' && e.eclipseKind === 'total';
            return (
              <HStack
                key={`${e.type}-${e.date.getTime()}`}
                style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Box style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.md,
                      fontWeight:
                        e.type === 'eclipse' ? theme.fontWeight.semibold : theme.fontWeight.normal,
                      color: total ? theme.colors.error : theme.colors.text,
                    }}>
                    {eventTitle(e)}
                  </Text>
                  <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
                    {e.date.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </Box>
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                  {relativeDayLabel(e.date, now)}
                </Text>
              </HStack>
            );
          })}
        </Box>
      </ScrollView>

      <MoonPhaseModal
        visible={pickerOpen}
        initialAngle={myFavorite}
        onSave={handleSave}
        onClose={() => setPickerOpen(false)}
      />
    </Box>
  );
}
