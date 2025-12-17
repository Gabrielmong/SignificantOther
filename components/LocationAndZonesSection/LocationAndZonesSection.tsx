/**
 * LocationAndZonesSection Component
 * Displays distance/proximity status, zone notifications, and zones management
 */

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, HStack, Text } from '@gluestack-ui/themed';
import { Heart } from 'lucide-react-native';
import { useAppTheme } from '../../hooks';
import { DistanceCard } from '../DistanceCard';
import { calculateZoneETA, formatETA } from '../../utils';

interface Zone {
  zoneName: string;
  distance?: number;
}

interface PartnerLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
}

interface LocationAndZonesSectionProps {
  areTogether: boolean;
  partnerName: string;
  distance: string | null;
  locationLoading: boolean;
  partnerCurrentZone: Zone | null;
  partnerCurrentZoneEmoji: string | null;
  partnerApproachingZone: Zone | null;
  partnerLocation: PartnerLocation | null;
  zones: Record<string, any>;
  onMapPress: () => void;
  onZonesPress: () => void;
}

export const LocationAndZonesSection: React.FC<LocationAndZonesSectionProps> = ({
  areTogether,
  partnerName,
  distance,
  locationLoading,
  partnerCurrentZone,
  partnerCurrentZoneEmoji,
  partnerApproachingZone,
  partnerLocation,
  zones,
  onMapPress,
  onZonesPress,
}) => {
  const { theme } = useAppTheme();

  return (
    <>
      {/* Distance Card or Together Message - Full Width */}
      <Box style={{ width: '100%' }}>
        {areTogether ? (
          <TouchableOpacity
            onPress={onMapPress}
            style={{
              backgroundColor: theme?.colors?.surface || '#FFFFFF',
              borderRadius: theme?.radii?.lg || 12,
              padding: theme?.spacing?.[5] || 20,
              ...(theme?.shadows?.sm || {}),
            }}>
            <Box style={{ alignItems: 'center', gap: theme?.spacing?.[2] || 8 }}>
              <Heart
                size={32}
                color={theme?.gradients?.primary?.colors?.[0] || '#8B5CF6'}
                fill={theme?.gradients?.primary?.colors?.[0] || '#8B5CF6'}
              />
              <Text
                style={{
                  fontSize: theme?.fontSize?.xl || 20,
                  fontWeight: theme?.fontWeight?.bold || '700',
                  color: theme?.colors?.text || '#000000',
                  textAlign: 'center',
                }}>
                You're with {partnerName}
              </Text>
              <Text
                style={{
                  fontSize: theme?.fontSize?.sm || 14,
                  color: theme?.colors?.textSecondary || '#6B7280',
                  textAlign: 'center',
                }}>
                You're both within 50 meters of each other
              </Text>
            </Box>
          </TouchableOpacity>
        ) : (
          <DistanceCard
            partnerName={partnerName}
            distance={distance}
            loading={locationLoading}
            onPress={onMapPress}
          />
        )}
      </Box>

      {/* Zone Status - Show if partner is inside or approaching a zone */}
      {(partnerCurrentZone || partnerApproachingZone) && (
        <TouchableOpacity
          onPress={onZonesPress}
          style={{
            width: '100%',
          }}>
          <Box
            style={{
              backgroundColor: theme?.colors?.surface || '#FFFFFF',
              borderRadius: theme?.radii?.lg || 12,
              padding: theme?.spacing?.[4] || 16,
              ...theme?.shadows?.sm,
              borderLeftWidth: 4,
              borderLeftColor: partnerCurrentZone ? '#10B981' : '#F59E0B',
              gap: theme?.spacing?.[2] || 8,
            }}>
            <HStack
              style={{
                alignItems: 'center',
                gap: theme?.spacing?.[2] || 8,
              }}>
              <Text style={{ fontSize: 24 }}>
                {(partnerCurrentZone && partnerCurrentZoneEmoji) || partnerCurrentZoneEmoji || '🚩'}
              </Text>
              <Box style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme?.fontSize?.md || 16,
                    fontWeight: theme?.fontWeight?.semibold || '600',
                    color: theme?.colors?.text || '#000000',
                  }}>
                  {partnerCurrentZone
                    ? `${partnerName} is at ${partnerCurrentZone.zoneName}`
                    : partnerApproachingZone
                      ? `${partnerName} is approaching ${partnerApproachingZone.zoneName}`
                      : ''}
                </Text>
                <Text
                  style={{
                    fontSize: theme?.fontSize?.xs || 12,
                    color: theme?.colors?.textSecondary || '#6B7280',
                    marginTop: 2,
                  }}>
                  {partnerApproachingZone &&
                  partnerLocation?.speed &&
                  partnerApproachingZone.distance
                    ? `ETA: ${formatETA(
                        calculateZoneETA(partnerApproachingZone.distance, partnerLocation.speed),
                      )} • Tap to manage zones`
                    : 'Tap to manage zones'}
                </Text>
              </Box>
            </HStack>
          </Box>
        </TouchableOpacity>
      )}

      {/* Zones Button */}
      <TouchableOpacity
        onPress={onZonesPress}
        style={{
          width: '100%',
          backgroundColor: theme?.colors?.surface || '#FFFFFF',
          borderRadius: theme?.radii?.lg || 12,
          padding: theme?.spacing?.[4] || 16,
          ...theme?.shadows?.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Box style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 24 }}>📍</Text>
          <Box>
            <Text
              style={{
                fontSize: theme?.fontSize?.md || 16,
                fontWeight: theme?.fontWeight?.semibold || '600',
                color: theme?.colors?.text || '#000000',
              }}>
              Zones
            </Text>
            <Text
              style={{
                fontSize: theme?.fontSize?.xs || 12,
                color: theme?.colors?.textSecondary || '#6B7280',
              }}>
              {Object.keys(zones).length === 0
                ? 'Set up Home, Work, or custom zones'
                : `${Object.keys(zones).length} ${
                    Object.keys(zones).length === 1 ? 'zone' : 'zones'
                  }`}
            </Text>
          </Box>
        </Box>
        <Text style={{ fontSize: 20, color: theme?.colors?.textSecondary }}>›</Text>
      </TouchableOpacity>
    </>
  );
};
