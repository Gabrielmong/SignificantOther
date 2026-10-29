import { Text } from '@gluestack-ui/themed';
import { router, useLocalSearchParams, Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, SectionList, TouchableOpacity, View } from 'react-native';

import { PhotoViewer } from '../../../components';
import { useAppTheme, useGallery, useMilestones, usePlaces } from '../../../hooks';
import { Milestone, Photo } from '../../../types';
import { parseDay } from '../../../utils/milestones';
import { StoryDay, buildStory, capThumbs } from '../../../utils/story';

const THUMB = 46;

export default function Story() {
  const { theme, colorMode } = useAppTheme();
  const { milestones, loading: milestonesLoading } = useMilestones();
  const gallery = useGallery();
  const { places, byId, savePlace } = usePlaces();
  const params = useLocalSearchParams<{ day?: string }>();
  const listRef = useRef<SectionList<StoryDay, { title: string }>>(null);
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null);

  const story = useMemo(() => buildStory(milestones, gallery.photos), [milestones, gallery.photos]);
  const sections = useMemo(() => story.map((y) => ({ title: y.year, data: y.days })), [story]);
  const loading = milestonesLoading || gallery.loading;

  // A milestone's own photo lives in the gallery as "ms-{id}"
  const mirrorById = useMemo(() => {
    const map = new Map<string, Photo>();
    for (const p of gallery.photos) if (p.milestoneId) map.set(p.milestoneId, p);
    return map;
  }, [gallery.photos]);

  const dayPhotos = (d: StoryDay): Photo[] => [
    ...d.milestones.map((m) => mirrorById.get(m.id)).filter((p): p is Photo => !!p),
    ...d.photos,
  ];

  // Opened at a day (from the card or a notification): scroll there once
  const scrolled = useRef(false);
  const target = useRef<{ sectionIndex: number; itemIndex: number } | null>(null);
  const retries = useRef(0);
  const scrollToTarget = () => {
    if (!target.current) return;
    listRef.current?.scrollToLocation({ ...target.current, viewOffset: 80, animated: true });
  };
  useEffect(() => {
    if (loading || scrolled.current || !params.day) return;
    scrolled.current = true;
    const sectionIndex = sections.findIndex((s) => s.title === params.day!.slice(0, 4));
    const itemIndex =
      sectionIndex >= 0 ? sections[sectionIndex].data.findIndex((d) => d.day === params.day) : -1;
    if (itemIndex < 0) return; // Unknown day: stay at the top
    target.current = { sectionIndex, itemIndex };
    setTimeout(scrollToTarget, 300);
  }, [loading, params.day, sections]);

  const openMilestone = (m: Milestone) =>
    router.navigate({ pathname: '/(tabs)/YouTwo', params: { milestone: m.id } } as unknown as Href);
  const openPlace = (placeId: string) =>
    router.push({
      pathname: '/(tabs)/YouTwo/Places',
      params: { focus: placeId },
    } as unknown as Href);

  const placeLink = (placeId?: string) => {
    const place = placeId ? byId[placeId] : undefined;
    if (!place) return null;
    return (
      <TouchableOpacity onPress={() => openPlace(place.id)} accessibilityRole="link">
        <Text
          style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginTop: 4 }}>
          📍 {place.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // At most 12 thumbnails per day; "+N" opens the viewer on the rest
  const thumbs = (photos: Photo[]) => {
    if (photos.length === 0) return null;
    const { shown, extra } = capThumbs(photos);
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {shown.map((p, index) => (
          <TouchableOpacity key={p.id} onPress={() => setViewer({ photos, index })}>
            <Image
              source={{ uri: p.thumbUrl ?? p.url }}
              style={{
                width: THUMB,
                height: THUMB,
                borderRadius: 6,
                backgroundColor: theme.colors.surfaceElevated,
              }}
            />
          </TouchableOpacity>
        ))}
        {extra > 0 && (
          <TouchableOpacity
            onPress={() => setViewer({ photos, index: shown.length })}
            style={{
              width: THUMB,
              height: THUMB,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceElevated,
            }}>
            <Text style={{ color: theme.colors.text, fontWeight: theme.fontWeight.semibold }}>
              +{extra}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderDay = ({ item: d }: { item: StoryDay }) => {
    const photos = dayPhotos(d);
    const date = parseDay(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
          {date}
        </Text>
        <View
          style={{
            marginLeft: 8,
            paddingLeft: 12,
            borderLeftWidth: 2,
            borderLeftColor: theme.colors.border,
            gap: 8,
          }}>
          {d.milestones.length > 0 ? (
            d.milestones.map((m, i) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => openMilestone(m)}
                activeOpacity={0.85}
                style={{
                  padding: 10,
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.surface,
                  ...theme.shadows.sm,
                }}>
                <Text style={{ color: theme.colors.text, fontWeight: theme.fontWeight.bold }}>
                  {m.emoji} {m.title}
                </Text>
                {!!m.note && (
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 2 }}>{m.note}</Text>
                )}
                {placeLink(m.placeId)}
                {/* The day's photos sit under its first milestone */}
                {i === 0 && thumbs(photos)}
              </TouchableOpacity>
            ))
          ) : (
            <View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.sm }}>
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                {d.placeId && byId[d.placeId] ? ` · ${byId[d.placeId].name}` : ''}
              </Text>
              {thumbs(photos)}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={colorMode === 'dark' ? 'light' : 'dark'} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: theme.colors.surface,
          ...theme.shadows.sm,
        }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: theme.fontSize.xl,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
          }}>
          Our story
        </Text>
      </View>

      {!loading && sections.length === 0 ? (
        <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
          <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
            Your story starts with your first milestone or photo
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: theme.radii.full,
              backgroundColor: theme.colors.primary,
            }}>
            <Text style={{ color: theme.colors.onPrimary, fontWeight: theme.fontWeight.semibold }}>
              Add one
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(d) => d.day}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          initialNumToRender={12}
          windowSize={7}
          onScrollToIndexFailed={(info) => {
            // Rows far down aren't rendered yet: jump near them by estimate so
            // they get measured, then aim precisely (at most three tries)
            if (retries.current >= 3) return;
            retries.current += 1;
            listRef.current
              ?.getScrollResponder()
              ?.scrollTo({ y: info.averageItemLength * info.index, animated: false });
            setTimeout(scrollToTarget, 250);
          }}
          renderSectionHeader={({ section }) => (
            <Text
              style={{
                paddingHorizontal: 16,
                paddingTop: 20,
                paddingBottom: 8,
                fontSize: theme.fontSize['2xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.primary,
              }}>
              {section.title}
            </Text>
          )}
          renderItem={renderDay}
        />
      )}

      <PhotoViewer
        isOpen={viewer !== null}
        photos={viewer?.photos ?? []}
        startIndex={viewer?.index ?? 0}
        suggestions={gallery.tags.map((t) => t.tag)}
        onClose={() => setViewer(null)}
        onTagPress={(tag) => {
          setViewer(null);
          router.push({ pathname: '/(tabs)/YouTwo/Photos', params: { tag } } as unknown as Href);
        }}
        onSave={gallery.updateDetails}
        onDelete={gallery.removePhoto}
        places={places}
        savePlace={savePlace}
        onPlacePress={(placeId) => {
          setViewer(null);
          openPlace(placeId);
        }}
        onMilestonePress={() => setViewer(null)}
      />
    </View>
  );
}
