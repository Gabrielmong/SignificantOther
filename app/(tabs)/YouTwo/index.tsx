import React, { useEffect, useMemo, useState } from 'react';
import { AppState, ScrollView, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, Href, useLocalSearchParams } from 'expo-router';
import { Text } from '@gluestack-ui/themed';
import { Plus } from 'lucide-react-native';
import {
  useAppTheme,
  useAppToast,
  useFirebase,
  useGallery,
  useMilestones,
  usePlaces,
} from '../../../hooks';
import type { PendingPhoto } from '../../../hooks/useGallery';
import { useAppSelector } from '../../../state';
import {
  MilestoneModal,
  MilestoneRow,
  PhotoAddSheet,
  PhotoStrip,
  PhotoViewer,
  PlacesPreview,
  OnThisDayCard,
  Skeleton,
  YouTwoHeader,
  pickPhotosForGallery,
} from '../../../components';
import { PressableScale } from '../../../components/styled';
import { Milestone, MilestoneKind, SpecialKind } from '../../../types';
import { formatCounter, pickCounterMilestone } from '../../../utils/milestones';
import { buildStory, memoriesOn, pickHighlight } from '../../../utils/story';

// Today's date that also changes at local midnight and when the app comes
// back to the foreground, so the counter never goes stale.
const useToday = (): Date => {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        setToday(new Date());
        arm();
      }, nextMidnight.getTime() - now.getTime() + 1000);
    };
    arm();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(new Date());
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
};

export default function YouTwo() {
  const { theme, colorMode } = useAppTheme();
  const { getUserProfile } = useFirebase();
  const user = useAppSelector((state) => state.user);
  const room = useAppSelector((state) => state.room);
  const {
    milestones,
    loading: milestonesLoading,
    countdowns,
    saveMilestone,
    removeMilestone,
  } = useMilestones();
  const { places, byId: placesById, savePlace } = usePlaces();
  const openPlace = (placeId: string) =>
    router.push({ pathname: '/(tabs)/YouTwo/Places', params: { focus: placeId } } as unknown as Href);
  const params = useLocalSearchParams<{ milestone?: string }>();
  const gallery = useGallery();
  const { showToast } = useAppToast();
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const handleAddPhotos = async () => {
    try {
      const picked = await pickPhotosForGallery();
      if (picked.length) setPending(picked);
    } catch (error) {
      console.error('Error picking photos:', error);
      showToast({
        title: "Couldn't open your photos",
        description: 'Please check the app has permission to access photos.',
        status: 'error',
      });
    }
  };
  const today = useToday();

  // Modal: closed, adding (optionally preset to a kind), or editing a milestone
  const [modal, setModal] = useState<
    { open: false } | { open: true; milestone: Milestone | null; presetKind?: MilestoneKind }
  >({ open: false });

  // Opened from a milestone link (e.g. on a place's card): open that milestone
  useEffect(() => {
    if (milestonesLoading || !params.milestone) return;
    const target = milestones.find((m) => m.id === params.milestone);
    if (target) setModal({ open: true, milestone: target });
    router.setParams({ milestone: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestonesLoading, params.milestone]);

  const usedKinds = useMemo(
    () => milestones.map((m) => m.kind).filter((k): k is SpecialKind => k !== 'custom'),
    [milestones],
  );

  // Edit the latest copy; if the partner deleted it meanwhile, keep the open copy
  const editing = modal.open && modal.milestone
    ? milestones.find((m) => m.id === modal.milestone!.id) ?? modal.milestone
    : null;

  const [partnerProfile, setPartnerProfile] = useState<{
    displayName?: string;
    photoURL?: string | null;
  } | null>(null);

  // Load the partner's name and photo once per partner
  useEffect(() => {
    if (!room.partnerId) return;
    getUserProfile(room.partnerId)
      .then((profile) => setPartnerProfile(profile))
      .catch((error) => console.error('Error loading partner profile:', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.partnerId]);

  const counter = useMemo(() => {
    const m = pickCounterMilestone(milestones, today);
    return m ? formatCounter(m, today) : null;
  }, [milestones, today]);

  // On this day: special milestones count here (they're only left out of notifications)
  const story = useMemo(() => buildStory(milestones, gallery.photos), [milestones, gallery.photos]);
  const highlight = useMemo(() => pickHighlight(memoriesOn(story, today)), [story, today]);
  const openStory = (day?: string) =>
    router.push(
      (day
        ? { pathname: '/(tabs)/YouTwo/Story', params: { day } }
        : '/(tabs)/YouTwo/Story') as unknown as Href,
    );

  // The latest two milestones; the full list lives in the story
  const recentMilestones = useMemo(
    () =>
      [...milestones]
        .sort((a, b) => b.day.localeCompare(a.day) || b.createdAt - a.createdAt)
        .slice(0, 2),
    [milestones],
  );

  // First names only: "Diana & Gabriel"
  const firstName = (name: string | null | undefined, fallback: string) =>
    name?.trim().split(/\s+/)[0] || fallback;
  const me = { name: firstName(user.displayName, 'Me'), photoURL: user.photoURL };
  const partner = {
    name: firstName(partnerProfile?.displayName || room.partnerName, 'Partner'),
    photoURL: partnerProfile?.photoURL,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={colorMode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[5] }}>
        <YouTwoHeader
          me={me}
          partner={partner}
          counter={counter}
          onAddDatingPress={() => setModal({ open: true, milestone: null, presetKind: 'dating' })}
        />

        {highlight && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <OnThisDayCard
              highlight={highlight}
              placeName={highlight.placeId ? placesById[highlight.placeId]?.name : undefined}
              onPress={() => openStory(highlight.day)}
            />
          </View>
        )}

        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <PhotoStrip
            photos={gallery.photos}
            total={gallery.photos.length}
            onSeeAll={() => router.push('/(tabs)/YouTwo/Photos' as Href)}
            onPhotoPress={setViewingIndex}
            onAdd={handleAddPhotos}
          />
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <PlacesPreview
            places={places}
            onOpen={() => router.push('/(tabs)/YouTwo/Places' as Href)}
          />
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text,
              }}>
              Our story
            </Text>
            <TouchableOpacity
              onPress={() => setModal({ open: true, milestone: null })}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: theme.radii.full,
                backgroundColor: theme.colors.primary,
              }}>
              <Plus size={16} color={theme.colors.onPrimary} />
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                }}>
                Add milestone
              </Text>
            </TouchableOpacity>
          </View>

          {milestonesLoading && user.roomId ? (
            // Row-shaped placeholders, so "Add your first milestone" doesn't flash while loading
            // (without a room nothing loads, so the empty state shows instead)
            <>
              <Skeleton height={68} />
              <Skeleton height={68} />
            </>
          ) : milestones.length === 0 ? (
            <PressableScale
              onPress={() => setModal({ open: true, milestone: null })}
              accessibilityRole="button"
              style={{
                padding: 24,
                alignItems: 'center',
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: theme.colors.border,
              }}>
              <Text style={{ color: theme.colors.textSecondary }}>Add your first milestone</Text>
            </PressableScale>
          ) : (
            <>
              {recentMilestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  onPress={() => setModal({ open: true, milestone: m })}
                />
              ))}
              <TouchableOpacity
                onPress={() => openStory()}
                accessibilityRole="link"
                style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
                <Text style={{ color: theme.colors.primary, fontWeight: theme.fontWeight.semibold }}>
                  See full story ›
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <MilestoneModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false })}
        milestone={editing}
        presetKind={modal.open ? modal.presetKind : undefined}
        usedKinds={usedKinds}
        countdowns={countdowns}
        onSave={saveMilestone}
        onDelete={removeMilestone}
        places={places}
        savePlace={savePlace}
      />

      <PhotoAddSheet
        isOpen={pending.length > 0}
        items={pending}
        suggestions={gallery.tags.map((t) => t.tag)}
        onClose={() => setPending([])}
        onUpload={gallery.addPhotos}
        places={places}
        savePlace={savePlace}
      />

      <PhotoViewer
        isOpen={viewingIndex !== null}
        photos={gallery.photos}
        startIndex={viewingIndex ?? 0}
        suggestions={gallery.tags.map((t) => t.tag)}
        onClose={() => setViewingIndex(null)}
        onTagPress={(tag) => {
          setViewingIndex(null);
          router.push({ pathname: '/(tabs)/YouTwo/Photos', params: { tag } } as unknown as Href);
        }}
        onSave={gallery.updateDetails}
        onDelete={gallery.removePhoto}
        onMilestonePress={() => setViewingIndex(null)}
        places={places}
        savePlace={savePlace}
        onPlacePress={(id) => {
          setViewingIndex(null);
          openPlace(id);
        }}
      />
    </View>
  );
}
