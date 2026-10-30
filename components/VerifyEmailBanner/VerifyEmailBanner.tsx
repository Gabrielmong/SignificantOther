import { Text } from '@gluestack-ui/themed';
import { MailCheck, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, TouchableOpacity, View } from 'react-native';

import { applyOpacity } from '../../config/theme';
import { useAppTheme, useFirebase } from '../../hooks';
import { useAuth } from '../../hooks/useAuth';

// Nudges password accounts to verify their email. Unverified passwords are
// dropped by Firebase if the same address later signs in with Google.
export const VerifyEmailBanner = () => {
  const { theme } = useAppTheme();
  const { auth } = useFirebase();
  const { sendVerificationEmail, refreshEmailVerified } = useAuth();
  const currentUser = auth?.currentUser;

  const hasPassword = !!currentUser?.providerData.some((p) => p.providerId === 'password');
  const [verified, setVerified] = useState(!!currentUser?.emailVerified);
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  const needsVerification = hasPassword && !verified;

  // The link is opened outside the app, so re-check when the user comes back
  useEffect(() => {
    if (!needsVerification) return;

    const check = async () => setVerified(await refreshEmailVerified());
    check();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsVerification]);

  const handleSend = async () => {
    setSending(true);
    await sendVerificationEmail();
    setSending(false);
  };

  if (!needsVerification || dismissed) return null;

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
      <MailCheck size={20} color={theme.colors.primary} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text,
          }}>
          Verify your email
        </Text>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textSecondary }}>
          Keeps your password working alongside Google sign-in
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleSend}
        disabled={sending}
        accessibilityRole="button"
        style={{
          minWidth: 64,
          alignItems: 'center',
          paddingHorizontal: theme.spacing[3],
          paddingVertical: theme.spacing[2],
          borderRadius: theme.radii.full,
          backgroundColor: theme.colors.primary,
        }}>
        {sending ? (
          <ActivityIndicator size="small" color={theme.colors.onPrimary} />
        ) : (
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.onPrimary,
            }}>
            Send
          </Text>
        )}
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
