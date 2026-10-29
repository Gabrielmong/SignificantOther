import { Box, Button, HStack, Text, Heading } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Plus } from 'lucide-react-native';
import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { CountdownCard, AddCountdownModal } from '../../../components';
import {
  useAppTheme,
  useAuth,
  useFirebase,
  useAppToast,
  useCountdowns,
  useShareToChat,
} from '../../../hooks';
import { listItemExiting, listLayout, useListEntering } from '../../../utils/motion';

export default function Countdowns() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { createCountdown, updateCountdown, deleteCountdown, listenToCountdownChanges } =
    useFirebase();

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

  // Sort countdowns by nearest date
  const sortedCountdowns = Object.values(countdowns).sort((a, b) => a.date - b.date);
  const enterListItem = useListEntering(sortedCountdowns.length > 0);

  return (
    <Box
      style={{
        flex: 1,
        backgroundColor: theme?.colors?.background,
      }}>
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
        <HStack
          style={{
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
          <Heading
            style={{
              fontSize: theme?.fontSize?.xl,
              fontWeight: theme?.fontWeight?.bold,
              color: theme?.colors?.text,
            }}>
            Countdowns
          </Heading>
          <TouchableOpacity onPress={handleAddCountdown}>
            <Plus size={24} color={theme?.gradients?.primary?.colors?.[0]} />
          </TouchableOpacity>
        </HStack>
      </Box>

      {/* Countdowns List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          gap: 12,
        }}>
        {sortedCountdowns.length > 0 ? (
          // Keyed by id so entering only runs when a card first mounts (not on
          // every listener emit); layout slides the rest into a deleted card's gap
          sortedCountdowns.map((countdown, index) => (
            <Animated.View
              key={countdown.id}
              entering={enterListItem(index)}
              exiting={listItemExiting}
              layout={listLayout}>
              <CountdownCard countdown={countdown} onPress={() => handleEditCountdown(countdown)} />
            </Animated.View>
          ))
        ) : (
          <Box
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 60,
            }}>
            <Text
              style={{
                fontSize: theme?.fontSize?.lg,
                color: theme?.colors?.textSecondary,
                marginBottom: 20,
              }}>
              No countdowns yet
            </Text>
            <Button
              onPress={handleAddCountdown}
              style={{
                backgroundColor: theme?.gradients?.primary?.colors?.[0],
              }}>
              <Text style={{ color: '#FFFFFF' }}>Add your first countdown</Text>
            </Button>
          </Box>
        )}
      </ScrollView>

      {/* Add Countdown Modal */}
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
    </Box>
  );
}
