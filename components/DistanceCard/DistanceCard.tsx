/**
 * DistanceCard Component
 * Displays the distance between the user and their partner
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Box, Spinner } from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';
import { Card } from '../styled';

interface DistanceCardProps {
  partnerName: string;
  distance: string | null;
  loading?: boolean;
  onPress?: () => void;
}

export const DistanceCard: React.FC<DistanceCardProps> = ({
  partnerName,
  distance,
  loading = false,
  onPress,
}) => {
  const { theme } = useAppTheme();

  const getContent = () => {
    if (!distance) {
      return 'Location not available';
    }
    return `${partnerName} is ${distance} away`;
  };

  const content = (
    <Card
      padding={theme.commonSpacing.cardPaddingCompact}
      style={{
        width: '100%',
        position: 'relative',
      }}>
      {/* Loading Spinner - Top Right */}
      {loading && (
        <Box
          style={{
            position: 'absolute',
            top: theme.spacing[3],
            right: theme.spacing[3],
            zIndex: 10,
          }}>
          <Spinner size="small" color={theme.colors.primary} />
        </Box>
      )}

      <Box
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}>
        {/* Location Icon */}
        <Box
          style={{
            width: 60,
            height: 60,
            borderRadius: theme.radii.full,
            backgroundColor: theme.colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 32 }}>🗺️</Text>
        </Box>

        {/* Content */}
        <Box style={{ flex: 1, paddingRight: loading ? theme.spacing[8] : 0 }}>
          <Text
            style={{
              color: theme.colors.textTertiary,
              fontSize: theme.fontSize.sm,
              marginBottom: theme.spacing[1],
            }}>
            Distance
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.medium,
            }}>
            {getContent()}
          </Text>
        </Box>
      </Box>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
