import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Zone } from '../../types';
import { MapPin } from 'lucide-react-native';

interface ZoneCardProps {
  zone: Zone;
  status?: 'inside' | 'outside' | 'approaching';
  onPress?: () => void;
}

export const ZoneCard: React.FC<ZoneCardProps> = ({ zone, status, onPress }) => {
  const { theme } = useAppTheme();

  const getStatusText = () => {
    switch (status) {
      case 'inside':
        return 'Currently here';
      case 'approaching':
        return 'Approaching';
      case 'outside':
      default:
        return `${zone.radius}m radius`;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'inside':
        return '#10B981'; // green
      case 'approaching':
        return '#F59E0B'; // amber
      case 'outside':
      default:
        return theme?.colors?.textSecondary || '#6B7280';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: theme?.colors?.surface || '#FFFFFF',
          borderRadius: theme?.radii?.lg || 12,
          ...theme?.shadows?.sm,
          borderLeftWidth: 4,
          borderLeftColor:
            status === 'inside'
              ? '#10B981'
              : status === 'approaching'
              ? '#F59E0B'
              : 'transparent',
        },
      ]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{zone.icon}</Text>
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: theme?.colors?.text || '#000000',
                fontSize: theme?.fontSize?.md || 16,
                fontWeight: theme?.fontWeight?.semibold || '600',
              },
            ]}>
            {zone.name}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  zone.type === 'home'
                    ? 'rgba(139, 92, 246, 0.1)'
                    : zone.type === 'work'
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'rgba(107, 114, 128, 0.1)',
              },
            ]}>
            <Text
              style={[
                styles.badgeText,
                {
                  color:
                    zone.type === 'home'
                      ? '#8B5CF6'
                      : zone.type === 'work'
                      ? '#3B82F6'
                      : '#6B7280',
                  fontSize: theme?.fontSize?.xs || 12,
                },
              ]}>
              {zone.type}
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: getStatusColor(),
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: getStatusColor(),
                  fontSize: theme?.fontSize?.sm || 14,
                },
              ]}>
              {getStatusText()}
            </Text>
          </View>
          <MapPin size={14} color={theme?.colors?.textSecondary || '#6B7280'} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  icon: {
    fontSize: 24,
  },
  contentContainer: {
    flex: 1,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {},
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {},
});
