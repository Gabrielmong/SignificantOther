import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Countdown } from '../../types';

interface CountdownCardProps {
  countdown: Countdown;
  onPress?: () => void;
}

export const CountdownCard: React.FC<CountdownCardProps> = ({ countdown, onPress }) => {
  const { theme } = useAppTheme();
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Date.now();
      const difference = countdown.date - now;

      if (difference <= 0) {
        setTimeRemaining('🎉 Today!');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        if (days === 1) {
          setTimeRemaining(`${days} day, ${hours} hrs`);
        } else if (days < 7) {
          setTimeRemaining(`${days} days, ${hours} hrs`);
        } else {
          setTimeRemaining(`${days} days`);
        }
      } else if (hours > 0) {
        setTimeRemaining(`${hours} hrs, ${minutes} mins`);
      } else {
        setTimeRemaining(`${minutes} minutes`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [countdown.date]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getRecurrenceText = () => {
    switch (countdown.recurrence) {
      case 'yearly':
        return 'Repeats yearly';
      case 'monthly':
        return 'Repeats monthly';
      case 'weekly':
        return 'Repeats weekly';
      case 'custom':
        if (countdown.recurrenceInterval && countdown.recurrenceUnit) {
          const interval = countdown.recurrenceInterval;
          const unit = countdown.recurrenceUnit;
          return `Repeats every ${interval} ${unit}`;
        }
        return '';
      case 'none':
      default:
        return '';
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
        },
      ]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{countdown.icon}</Text>
      </View>
      <View style={styles.contentContainer}>
        <Text
          style={[
            styles.title,
            {
              color: theme?.colors?.text || '#000000',
              fontSize: theme?.fontSize?.md || 16,
              fontWeight: theme?.fontWeight?.semibold || '600',
            },
          ]}>
          {countdown.title}
        </Text>
        <Text
          style={[
            styles.timeRemaining,
            {
              color: theme?.gradients?.primary?.colors?.[0] || '#8B5CF6',
              fontSize: theme?.fontSize?.xl || 20,
              fontWeight: theme?.fontWeight?.bold || '700',
            },
          ]}>
          {timeRemaining}
        </Text>
        <Text
          style={[
            styles.date,
            {
              color: theme?.colors?.textSecondary || '#6B7280',
              fontSize: theme?.fontSize?.sm || 14,
            },
          ]}>
          {formatDate(countdown.date)}
        </Text>
        {getRecurrenceText() && (
          <Text
            style={[
              styles.recurrence,
              {
                color: theme?.gradients?.primary?.colors?.[0] || '#8B5CF6',
                fontSize: theme?.fontSize?.xs || 12,
                fontWeight: theme?.fontWeight?.medium || '500',
              },
            ]}>
            🔁 {getRecurrenceText()}
          </Text>
        )}
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
    gap: 4,
  },
  title: {},
  timeRemaining: {
    marginTop: 2,
  },
  date: {},
  recurrence: {
    marginTop: 2,
  },
});
