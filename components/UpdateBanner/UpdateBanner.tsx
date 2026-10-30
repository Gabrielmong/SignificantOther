import { Text } from '@gluestack-ui/themed';
import * as Updates from 'expo-updates';
import { Sparkles, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, TouchableOpacity, View } from 'react-native';

import { applyOpacity } from '../../config/theme';
import { useAppTheme } from '../../hooks';

// expo-updates checks on launch; phones can keep the app open for days, so
// also check when it returns to the foreground, at most this often
const FOREGROUND_CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Offers to restart into an update once it has finished downloading
export const UpdateBanner = () => {
  const { theme } = useAppTheme();
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  const lastCheckRef = useRef(Date.now());

  useEffect(() => {
    if (!Updates.isEnabled) return;

    const subscription = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      if (Date.now() - lastCheckRef.current < FOREGROUND_CHECK_INTERVAL_MS) return;
      lastCheckRef.current = Date.now();

      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        // Downloading sets isUpdatePending, which shows the banner
        if (isAvailable) await Updates.fetchUpdateAsync();
      } catch (error) {
        console.warn('Update check failed:', error);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!isUpdatePending || dismissed) return null;

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        padding: theme.spacing[3],
        borderRadius: theme.radii.lg,
        backgroundColor: applyOpacity(theme.colors.primary, 0.12),
        borderWidth: 1,
        borderColor: applyOpacity(theme.colors.primary, 0.3),
      }}>
      <Sparkles size={20} color={theme.colors.primary} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text,
          }}>
          A new version is ready
        </Text>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textSecondary }}>
          Restart to get the latest changes
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => Updates.reloadAsync()}
        accessibilityRole="button"
        style={{
          paddingHorizontal: theme.spacing[3],
          paddingVertical: theme.spacing[2],
          borderRadius: theme.radii.full,
          backgroundColor: theme.colors.primary,
        }}>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.onPrimary,
          }}>
          Restart
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setDismissed(true)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={8}>
        <X size={18} color={theme.colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
};
