import React from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme, useAuth, useFirebase, useAppToast, useCountdowns } from '../../../hooks';
import { CountdownCard, AddCountdownModal } from '../../../components';
import { Box, Button, HStack, Text, Heading } from '@gluestack-ui/themed';
import { ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';

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

  // Sort countdowns by nearest date
  const sortedCountdowns = Object.values(countdowns).sort((a, b) => a.date - b.date);

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
          sortedCountdowns.map((countdown) => (
            <CountdownCard
              key={countdown.id}
              countdown={countdown}
              onPress={() => handleEditCountdown(countdown)}
            />
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
              }
            : undefined
        }
      />
    </Box>
  );
}
