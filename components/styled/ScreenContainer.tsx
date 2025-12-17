/**
 * ScreenContainer Component
 * Standard screen wrapper with theme-aware styling
 * Provides consistent padding, background, and scroll behavior
 */

import React from 'react';
import { View, ScrollView, ViewStyle, RefreshControl } from 'react-native';
import { useAppTheme } from '../../hooks';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  withPadding?: boolean;
  backgroundColor?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  withPadding = true,
  backgroundColor,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  style,
}) => {
  const { theme } = useAppTheme();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: backgroundColor || theme.colors.background,
    ...style,
  };

  const contentStyle: ViewStyle = {
    padding: withPadding ? theme.commonSpacing.screenPadding : 0,
    ...contentContainerStyle,
  };

  if (scrollable) {
    return (
      <ScrollView
        style={containerStyle}
        contentContainerStyle={contentStyle}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          ) : undefined
        }>
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[containerStyle, contentStyle]}>
      {children}
    </View>
  );
};
