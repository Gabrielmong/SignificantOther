import { Box, Text } from '@gluestack-ui/themed';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { applyOpacity } from '../../config/theme';
import { useAppTheme } from '../../hooks';
import { AuthFooter } from '../AuthFooter';
import { IconButton } from '../IconButton';

const APP_ICON = require('../../assets/icon.png');
const ICON_SIZE = 96;

interface AuthScreenProps {
  title: string;
  subtitle: string;
  /** Shows a back arrow for screens pushed on top of sign in */
  showBack?: boolean;
  children: React.ReactNode;
}

// Shared frame for the auth pages: the app icon over the same accent wash the
// You Two header uses, then the page's form and the version footer
export const AuthScreen: React.FC<AuthScreenProps> = ({ title, subtitle, showBack, children }) => {
  const { theme } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar backgroundColor={theme.colors.background} />

      <LinearGradient
        colors={[
          applyOpacity(theme.colors.primary, 0.35),
          applyOpacity(theme.colors.background, 0),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'space-between',
            padding: theme.commonSpacing.screenPadding,
            gap: theme.spacing[6],
          }}>
          <Box style={{ width: '100%', minHeight: 40 }}>
            {showBack && <IconButton icon={ArrowLeft} onPress={router.back} variant="ghost" />}
          </Box>

          <Box style={{ width: '100%', gap: theme.spacing[6] }}>
            <Box style={{ alignItems: 'center', gap: theme.spacing[2] }}>
              <View
                style={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  marginBottom: theme.spacing[2],
                  borderRadius: theme.radii['3xl'],
                  borderWidth: 3,
                  borderColor: theme.colors.background,
                  overflow: 'hidden',
                  ...theme.shadows.md,
                }}>
                <Image source={APP_ICON} style={{ width: '100%', height: '100%' }} />
              </View>

              <Text
                style={{
                  fontSize: theme.fontSize['3xl'],
                  lineHeight: theme.lineHeight.tight * theme.fontSize['3xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text,
                  textAlign: 'center',
                }}>
                {title}
              </Text>

              <Text
                style={{
                  fontSize: theme.fontSize.md,
                  color: theme.colors.textSecondary,
                  textAlign: 'center',
                }}>
                {subtitle}
              </Text>
            </Box>

            <Box style={{ gap: theme.spacing[4] }}>{children}</Box>
          </Box>

          <AuthFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
