import {
  Box,
  Button,
  HStack,
  Input,
  InputField,
  ModalBackdrop,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  RefreshControl,
  Text,
  Spinner,
  Divider,
  ScrollView,
} from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  FeelingModal,
  FeelingPressable,
  FlowerModal,
  FlowerPressable,
  WhiteBoardPreview,
  AddCountdownModal,
  AnimatedHeartLoader,
  GradientButton,
  LocationAndZonesSection,
  CountdownsSection,
  DailyQuestionCard,
  KeyboardAwareModal,
  Skeleton,
} from '../../../components';
import { GradientCard } from '../../../components/styled';
import {
  useAppTheme,
  useAppToast,
  useAuth,
  useFirebase,
  useLocation,
  useCountdowns,
  useFlowers,
  useFeelings,
  useDailyQuestion,
  useWhiteboard,
  useZones,
  useShareToChat,
} from '../../../hooks';
import { setLocationTaskUserInfo } from '../../../services/locationTask';
import { useAppSelector } from '../../../state';
import { calculateDistance, formatDistance } from '../../../utils';
import { fadeEntering } from '../../../utils/motion';

// Flower/feeling card height: 100px image plus the card's padding
const PRESSABLE_CARD_HEIGHT = 140;

export default function Home() {
  const { theme } = useAppTheme();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);
  const { showToast } = useAppToast();
  const { user, editExtraProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userDataReady, setUserDataReady] = useState(false);
  const [roomId, setRoomId] = useState<string>(user.roomId || '');
  const [showModal, setShowModal] = useState(false);
  const [numberOfItems, setNumberOfItems] = useState(0);
  const [numberOfItemsInJournal, setNumberOfItemsInJournal] = useState(0);
  const [numberOfFavoriteThings, setNumberOfFavoriteThings] = useState(0);
  const [partnerLocation, setPartnerLocation] = useState<{
    latitude: number;
    longitude: number;
    timestamp: number;
    speed?: number;
  } | null>(null);
  const [userCurrentLocation, setUserCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [areTogether, setAreTogether] = useState(false);

  // Proximity threshold in meters (50 meters = ~164 feet)
  const PROXIMITY_THRESHOLD = 50;

  const { getCurrentLocation, startBackgroundUpdate, isTracking } = useLocation();

  const {
    listenToWhiteboardEvents,
    getWhiteboard,
    createRoom,
    joinRoom,
    getFlower,
    updateFlower,
    listenToFlowerChanges,
    getFeeling,
    updateFeeling,
    logFeelingHistory,
    saveDailyAnswer,
    editDailyAnswer,
    listenToDailyQuestionDay,
    listenToFeelingChanges,
    getNumberOfItemsInWishlist,
    listentoNumberOfItemsInWishlist,
    getNumberOfItemsInJournal,
    getNumberOfFavoriteThings,
    createCountdown,
    updateCountdown,
    deleteCountdown,
    listenToCountdownChanges,
    getZones,
    getZoneStatus,
    listenToZoneChanges,
    listenToZoneStatusChanges,
  } = useFirebase();

  // Memoize setShowModal to prevent hooks from re-rendering
  const handleSetShowModal = useCallback((show: boolean) => {
    setShowModal(show);
  }, []);

  // Custom hooks for feature logic
  const {
    storedStrokes,
    storedCanvasColor,
    boardName,
    handleOpenWhiteboard,
    handleJoinWhiteboard,
    loadWhiteboardData,
  } = useWhiteboard({
    roomId: user.roomId || null,
    listenToWhiteboardEvents,
    setShowModal: handleSetShowModal,
  });

  const {
    flower,
    flowerMessage,
    showFlowerModal,
    ownFlower,
    setOwnFlower,
    ownFlowerMessage,
    setOwnFlowerMessage,
    handleFlowerSend,
    handleFlowerOpenPress,
    handleFlowerClosePress,
    loadFlowerData,
  } = useFlowers({
    roomId: user.roomId || null,
    userId: user.uid || null,
    partnerId: partnerId || null,
    getFlower,
    updateFlower,
    listenToFlowerChanges,
    showToast,
  });

  const {
    showFeelingModal,
    ownFeeling,
    setOwnFeeling,
    feeling,
    handleFeelingPress,
    handleFeelingClosePress,
    handleFeelingSend,
    loadFeelingData,
  } = useFeelings({
    roomId: user.roomId || null,
    userId: user.uid || null,
    partnerId: partnerId || null,
    getFeeling,
    updateFeeling,
    logFeelingHistory,
    listenToFeelingChanges,
    showToast,
  });

  const dailyQuestion = useDailyQuestion({
    roomId: user.roomId || null,
    userId: user.uid || null,
    partnerId: partnerId || null,
    saveDailyAnswer,
    editDailyAnswer,
    listenToDailyQuestionDay,
    showToast,
  });

  const {
    countdowns,
    showCountdownModal,
    editingCountdown,
    handleAddCountdown,
    handleEditCountdown,
    handleSaveCountdown,
    handleDeleteCountdown,
    handleCloseCountdownModal,
  } = useCountdowns({
    roomId: user.roomId || null,
    userId: user.uid || null,
    createCountdown,
    updateCountdown,
    deleteCountdown,
    listenToCountdownChanges,
    showToast,
  });

  const shareToChat = useShareToChat();
  // Snapshot of the saved countdown (not unsaved edits in the modal)
  const handleShareCountdown = () => {
    if (!editingCountdown?.id) return;
    shareToChat({
      kind: 'countdown',
      id: editingCountdown.id,
      title: editingCountdown.title,
      subtitle: new Date(editingCountdown.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      emoji: editingCountdown.icon,
    });
    handleCloseCountdownModal();
  };

  const { zones, partnerCurrentZone, partnerApproachingZone, partnerCurrentZoneObject } = useZones({
    roomId: user.roomId || null,
    userId: user.uid || null,
    partnerId: partnerId || null,
    getZones,
    getZoneStatus,
    listenToZoneChanges,
    listenToZoneStatusChanges,
  });

  // Verify user data is ready before attempting any Firebase operations
  useEffect(() => {
    const verifyUserData = () => {
      // Check if we have all required user data
      if (user.uid && user.roomId && partnerId && partnerId.trim() !== '') {
        setUserDataReady(true);
      } else {
        setUserDataReady(false);
      }
    };

    verifyUserData();
  }, [user.uid, user.roomId, partnerId]);

  const loadData = useCallback(async () => {
    if (user.roomId && user.uid && partnerId && partnerId.trim() !== '') {
      try {
        // Load all data in parallel for faster performance
        const [
          whiteboardSnapshot,
          partnerFlowerSnapshot,
          ownFlowerSnapshot,
          ownFeelingSnapshot,
          partnerFeelingSnapshot,
          wishlistCount,
          journalCount,
          favoriteThingsCount,
        ] = await Promise.all([
          getWhiteboard(user.roomId).catch((error) => {
            console.error('Error loading whiteboard:', error);
            return null;
          }),
          getFlower(user.roomId, partnerId).catch((error) => {
            console.error('Error loading partner flower:', error);
            return null;
          }),
          getFlower(user.roomId, user.uid).catch((error) => {
            console.error('Error loading own flower:', error);
            return null;
          }),
          getFeeling(user.roomId, user.uid).catch((error) => {
            console.error('Error loading own feeling:', error);
            return null;
          }),
          getFeeling(user.roomId, partnerId).catch((error) => {
            console.error('Error loading partner feeling:', error);
            return null;
          }),
          getNumberOfItemsInWishlist(user.roomId).catch((error) => {
            console.error('Error loading wishlist count:', error);
            return 0;
          }),
          getNumberOfItemsInJournal(user.roomId).catch((error) => {
            console.error('Error loading journal count:', error);
            return 0;
          }),
          getNumberOfFavoriteThings(user.roomId, user.uid).catch((error) => {
            console.error('Error loading favorite things count:', error);
            return 0;
          }),
        ]);

        // Update state with loaded data using hook helper methods
        if (whiteboardSnapshot) loadWhiteboardData(whiteboardSnapshot);
        loadFlowerData(partnerFlowerSnapshot, ownFlowerSnapshot);
        loadFeelingData(ownFeelingSnapshot, partnerFeelingSnapshot);

        setNumberOfItems(wishlistCount || 0);
        setNumberOfItemsInJournal(journalCount || 0);
        setNumberOfFavoriteThings(favoriteThingsCount || 0);

        // Location loading temporarily disabled
        setLocationLoading(false);

        setRefreshing(false);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setRefreshing(false);
        setLoading(false);
        setLocationLoading(false);
      }
    }
  }, [
    user.roomId,
    user.uid,
    partnerId,
    getWhiteboard,
    getFlower,
    getFeeling,
    getNumberOfItemsInWishlist,
    getNumberOfItemsInJournal,
    getNumberOfFavoriteThings,
    loadWhiteboardData,
    loadFlowerData,
    loadFeelingData,
  ]);

  useEffect(() => {
    if (!userDataReady) return;

    if (user.roomId && user.uid && partnerId && partnerId.trim() !== '') {
      const unsubscribeWishlist = listentoNumberOfItemsInWishlist((data) => {
        setNumberOfItems(data.count);
      }, user.roomId);

      // Location listeners temporarily disabled

      // Cleanup all listeners
      return () => {
        if (unsubscribeWishlist) unsubscribeWishlist();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDataReady, user.roomId, user.uid, partnerId]);

  useEffect(() => {
    if (!userDataReady) return;

    if (user.roomId && user.uid && partnerId && partnerId.trim() !== '') {
      loadData();
    }
  }, [userDataReady, user.roomId, user.uid, partnerId, loadData]);

  // Calculate distance when either user's or partner's location changes
  useEffect(() => {
    if (userCurrentLocation && partnerLocation) {
      const distanceInMeters = calculateDistance(
        userCurrentLocation.latitude,
        userCurrentLocation.longitude,
        partnerLocation.latitude,
        partnerLocation.longitude,
      );
      setDistance(formatDistance(distanceInMeters));
      setAreTogether(distanceInMeters <= PROXIMITY_THRESHOLD);
    } else {
      setAreTogether(false);
    }
  }, [userCurrentLocation, partnerLocation]);

  // Periodic location updates temporarily disabled

  // Background location tracking temporarily disabled
  // useEffect(() => {
  //   const setupBackgroundTracking = async () => {
  //     if (user.roomId && user.uid) {
  //       await setLocationTaskUserInfo(user.uid, user.roomId);
  //       if (!isTracking) {
  //         setTimeout(async () => {
  //           const started = await startBackgroundUpdate();
  //           if (!started) {
  //             showToast({
  //               title: 'Background Location',
  //               description: 'Please enable "Always Allow" location permission for background tracking.',
  //               status: 'info',
  //             });
  //           }
  //         }, 3000);
  //       }
  //     }
  //   };
  //   setupBackgroundTracking();
  // }, [user.roomId, user.uid, isTracking, startBackgroundUpdate, showToast]);

  const handleCreateRoom = useCallback(async () => {
    if (!user?.uid) return;

    const id = await createRoom({
      uid: user.uid,
    });

    if (id) {
      await editExtraProfile({ roomId: id });
    }
  }, [user?.uid, createRoom, editExtraProfile]);

  const handleJoinRoom = useCallback(() => {
    if (!user.uid) return;

    joinRoom(roomId, user.uid);
    editExtraProfile({ roomId });
    handleJoinWhiteboard(); // Call the hook's handler
  }, [user.uid, roomId, joinRoom, editExtraProfile, handleJoinWhiteboard]);

  const handleWishlistPress = useCallback(() => {
    router.push('/(tabs)/Home/Wishlist');
  }, []);

  const handleJournalPress = useCallback(() => {
    router.push('/(tabs)/Home/Journal/');
  }, []);

  const handleFavoriteThingsPress = useCallback(() => {
    router.push('/(tabs)/Home/FavoriteThings');
  }, []);

  const handleMapPress = useCallback(() => {
    router.push('/(tabs)/Home/Map');
  }, []);

  const handleZonesPress = useCallback(() => {
    router.push('/(tabs)/Home/Zones');
  }, []);

  const handleViewAllCountdowns = useCallback(() => {
    router.push('/(tabs)/Home/Countdowns');
  }, []);

  const handleCalendarPress = useCallback(() => {
    router.push('/(tabs)/Calendar');
  }, []);

  const handleDailyQuestionHistoryPress = useCallback(() => {
    router.push('/(tabs)/Home/DailyQuestion');
  }, []);

  // Handle case where theme is not yet loaded
  if (!theme) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}>
        <Spinner size="large" />
      </View>
    );
  }

  // Show verification loader while waiting for user data
  if (!userDataReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme?.colors?.background,
        }}>
        <Box style={{ alignItems: 'center', gap: theme?.spacing[5] }}>
          <AnimatedHeartLoader />
          <Spinner size="large" color={theme.colors.primary} />
          <Box style={{ alignItems: 'center', gap: theme?.spacing[2] }}>
            <Text
              style={{
                fontSize: theme?.fontSize?.lg || 18,
                fontWeight: theme?.fontWeight?.semibold || '600',
                color: theme?.colors?.text || '#000000',
              }}>
              Verifying connection
            </Text>
            <Text
              style={{
                fontSize: theme?.fontSize?.sm || 14,
                color: theme?.colors?.textSecondary || '#6B7280',
                textAlign: 'center',
                paddingHorizontal: 40,
              }}>
              {!user.uid
                ? 'Authenticating...'
                : !user.roomId
                  ? 'Setting up your room...'
                  : !partnerId
                    ? 'Waiting for partner connection...'
                    : 'Almost ready...'}
            </Text>
          </Box>
        </Box>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme?.colors?.background }}>
      {/* Gradient Background Header */}
      <LinearGradient
        colors={theme?.gradients?.aurora.colors}
        start={theme?.gradients?.aurora.start}
        end={theme?.gradients?.aurora.end}
        locations={theme?.gradients?.aurora.locations}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 120,
          opacity: 0.15,
        }}
      />

      {/* Hero Section with Board Name */}
      <Box
        style={{
          width: '100%',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          paddingBottom: theme?.spacing[2],
          height: 120,
          paddingTop: theme?.spacing[10],
          paddingHorizontal: theme?.commonSpacing?.screenPadding,
        }}>
        <Text
          style={{
            fontSize: theme?.fontSize['3xl'],
            lineHeight: theme?.lineHeight?.tight * theme?.fontSize['3xl'],
            fontWeight: theme?.fontWeight?.bold,
            color: theme?.colors?.text,
            marginBottom: theme?.spacing[1],
          }}>
          {boardName}
        </Text>
        <Text
          style={{
            fontSize: theme?.fontSize?.md,
            color: theme?.colors?.textSecondary,
          }}>
          Welcome back
        </Text>
      </Box>

      <ScrollView
        contentContainerStyle={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingHorizontal: theme?.commonSpacing?.screenPadding,
          paddingTop: theme?.spacing[6],
          paddingBottom: theme?.spacing[5],
          gap: theme?.spacing[4],
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}>
        {loading ? (
          // Placeholders shaped like the cards below, so the board doesn't jump when it loads
          <Box
            accessibilityLabel="Loading your board"
            style={{ width: '100%', gap: theme?.spacing?.[4] || 16 }}>
            <Skeleton height={180} borderRadius={theme.radii.xl} />
            <Skeleton height={PRESSABLE_CARD_HEIGHT} />
            <Skeleton height={PRESSABLE_CARD_HEIGHT} />
            <Skeleton height={120} borderRadius={theme.radii.lg} />
            <HStack style={{ width: '100%', gap: theme?.spacing?.[3] || 12 }}>
              <Skeleton height={96} borderRadius={theme.radii.lg} style={{ flex: 1 }} />
              <Skeleton height={96} borderRadius={theme.radii.lg} style={{ flex: 1 }} />
              <Skeleton height={96} borderRadius={theme.radii.lg} style={{ flex: 1 }} />
            </HStack>
          </Box>
        ) : (
          // Fades the loaded board in over where the placeholders were
          <Animated.View
            entering={fadeEntering}
            style={{ width: '100%', alignItems: 'center', gap: theme?.spacing[4] }}>
            {user.roomId && (
              <>
                {/* Whiteboard Preview - Large Feature Card with Gradient */}
                <GradientCard
                  onPress={handleOpenWhiteboard}
                  useGradient
                  gradientKey="primarySubtle"
                  style={{ width: '100%', height: 180 }}>
                  <WhiteBoardPreview
                    boardName={boardName}
                    strokes={storedStrokes}
                    canvasColor={storedCanvasColor}
                    height={180}
                    loading={loading}
                  />
                </GradientCard>

                {/* Flower Card - Full Width */}
                <Box style={{ width: '100%' }}>
                  <FlowerPressable
                    flower={flower}
                    flowerMessage={flowerMessage}
                    onPress={handleFlowerOpenPress}
                    loading={loading}
                  />
                </Box>

                {/* Feeling Card - Full Width */}
                <Box style={{ width: '100%' }}>
                  <FeelingPressable
                    partnerName={partnerName}
                    feeling={feeling}
                    onPress={handleFeelingPress}
                    loading={loading}
                  />
                  <TouchableOpacity
                    onPress={handleCalendarPress}
                    style={{ alignSelf: 'flex-end', marginTop: theme?.spacing?.[2] || 8 }}>
                    <Text
                      style={{
                        fontSize: theme?.fontSize?.sm,
                        fontWeight: theme?.fontWeight?.semibold,
                        color: theme?.colors?.primary,
                      }}>
                      Calendar →
                    </Text>
                  </TouchableOpacity>
                </Box>

                {/* Daily Question */}
                <DailyQuestionCard
                  question={dailyQuestion.question}
                  status={dailyQuestion.status}
                  loaded={dailyQuestion.loaded}
                  myAnswer={dailyQuestion.myAnswer}
                  partnerAnswer={dailyQuestion.partnerAnswer}
                  partnerName={partnerName || 'Partner'}
                  hasPartner={!!partnerId}
                  onSubmit={dailyQuestion.submitAnswer}
                  onOpenHistory={handleDailyQuestionHistoryPress}
                />

                {/* <Divider my={4} />

                <LocationAndZonesSection
                  areTogether={areTogether}
                  partnerName={partnerName}
                  distance={distance}
                  locationLoading={locationLoading}
                  partnerCurrentZone={partnerCurrentZone}
                  partnerCurrentZoneEmoji={partnerCurrentZoneObject?.icon || null}
                  partnerApproachingZone={partnerApproachingZone}
                  partnerLocation={partnerLocation}
                  zones={zones}
                  onMapPress={handleMapPress}
                  onZonesPress={handleZonesPress}
                /> 
                */}

                <Divider my={4} />
                {/* Countdowns Section */}
                <CountdownsSection
                  countdowns={countdowns}
                  onAddCountdown={handleAddCountdown}
                  onEditCountdown={handleEditCountdown}
                  onViewAll={handleViewAllCountdowns}
                />

                <Divider my={4} />

                {/* Wishlist and Journal Buttons with Gradient one line 50% each*/}
                <HStack style={{ width: '100%', gap: theme?.spacing?.[3] || 12 }}>
                  <GradientButton
                    title="Wishlist"
                    icon="🎁"
                    onPress={handleWishlistPress}
                    gradientKey="primary"
                    count={numberOfItems}
                    countLabel={numberOfItems === 1 ? 'item' : 'items'}
                  />
                  <GradientButton
                    title="Journal"
                    icon="📔"
                    onPress={handleJournalPress}
                    gradientKey="aurora"
                    count={numberOfItemsInJournal}
                    countLabel={numberOfItemsInJournal === 1 ? 'entry' : 'entries'}
                  />
                  <GradientButton
                    title="Favorites"
                    icon="💛"
                    onPress={handleFavoriteThingsPress}
                    gradientKey="sunset"
                    count={numberOfFavoriteThings}
                    countLabel={numberOfFavoriteThings === 1 ? 'item' : 'items'}
                  />
                </HStack>
              </>
            )}

            {!user.roomId && (
              <Box
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: theme?.spacing[5],
                }}>
                <GradientCard useGradient gradientKey="primarySubtle" style={{ width: '100%' }}>
                  <Box
                    style={{
                      padding: theme?.spacing[6],
                      alignItems: 'center',
                      gap: theme?.spacing[4],
                    }}>
                    <Text
                      style={{
                        fontSize: theme?.fontSize?.xl,
                        fontWeight: theme?.fontWeight?.bold,
                        color:
                          theme?.colorMode === 'dark'
                            ? theme?.colors?.text
                            : theme?.colors?.textInverse,
                        textAlign: 'center',
                      }}>
                      Get Started
                    </Text>
                    <Button
                      onPress={handleCreateRoom}
                      style={{
                        width: '100%',
                        backgroundColor: theme?.colors?.primary,
                        ...theme?.shadows?.md,
                      }}>
                      <Text style={{ color: theme?.colors?.textInverse }}>Create Room</Text>
                    </Button>

                    <Button
                      onPress={() => setShowModal(true)}
                      style={{
                        width: '100%',
                        backgroundColor: theme?.colors?.secondary,
                        ...theme?.shadows?.md,
                      }}>
                      <Text style={{ color: theme?.colors?.textInverse }}>Join Room</Text>
                    </Button>
                  </Box>
                </GradientCard>
              </Box>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <KeyboardAwareModal isOpen={showModal}>
        <ModalBackdrop onPress={() => setShowModal(false)} />

        <ModalContent>
          <ModalCloseButton onPress={() => setShowModal(false)} />

          <ModalHeader>
            <Text>Room ID</Text>
          </ModalHeader>

          <Box
            style={{
              padding: 20,
              gap: 20,
            }}>
            <Input>
              <InputField
                value={roomId}
                onChangeText={(text) => setRoomId(text)}
                placeholder="Room ID"
              />
            </Input>

            <Button
              onPress={handleJoinRoom}
              style={{
                width: '100%',
              }}>
              <Text>Join</Text>
            </Button>
          </Box>
        </ModalContent>
      </KeyboardAwareModal>
      <FlowerModal
        showFlowerModal={showFlowerModal}
        onClose={handleFlowerClosePress}
        ownFlower={ownFlower}
        setOwnFlower={setOwnFlower}
        ownFlowerMessage={ownFlowerMessage}
        setOwnFlowerMessage={setOwnFlowerMessage}
        handleFlowerSend={handleFlowerSend}
      />
      <FeelingModal
        isOpen={showFeelingModal}
        onClose={handleFeelingClosePress}
        ownFeeling={ownFeeling}
        setOwnFeeling={setOwnFeeling}
        handleFeelingSend={handleFeelingSend}
      />

      <AddCountdownModal
        isOpen={showCountdownModal}
        onClose={handleCloseCountdownModal}
        onSave={handleSaveCountdown}
        initialData={
          editingCountdown
            ? {
                title: editingCountdown.title,
                date: editingCountdown.date,
                icon: editingCountdown.icon,
                recurrence: editingCountdown.recurrence,
                recurrenceInterval: editingCountdown.recurrenceInterval,
                recurrenceUnit: editingCountdown.recurrenceUnit,
                milestoneId: editingCountdown.milestoneId,
              }
            : undefined
        }
        onDelete={
          editingCountdown?.id ? () => handleDeleteCountdown(editingCountdown.id!) : undefined
        }
        onShare={editingCountdown?.id ? handleShareCountdown : undefined}
      />

      <StatusBar
        backgroundColor={theme?.colors?.background}
        style={theme?.colorMode === 'dark' ? 'light' : 'dark'}
      />
    </View>
  );
}
