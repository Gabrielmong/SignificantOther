import { useState, useEffect, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';

interface MotionState {
  isMoving: boolean;
  movementIntensity: 'stationary' | 'slow' | 'moderate' | 'fast';
}

/**
 * Hook to detect device motion using accelerometer
 * Returns motion state and intensity to adjust location update frequency
 */
export const useMotionDetection = () => {
  const [motionState, setMotionState] = useState<MotionState>({
    isMoving: false,
    movementIntensity: 'stationary',
  });
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let subscription: any;
    let lastX = 0,
      lastY = 0,
      lastZ = 0;
    let movementBuffer: number[] = [];
    const BUFFER_SIZE = 10;
    const UPDATE_INTERVAL = 1000; // Check every second

    const checkAvailability = async () => {
      const available = await Accelerometer.isAvailableAsync();
      setIsAvailable(available);

      if (available) {
        // Set update interval
        Accelerometer.setUpdateInterval(UPDATE_INTERVAL);

        subscription = Accelerometer.addListener((accelerometerData) => {
          const { x, y, z } = accelerometerData;

          // Calculate the magnitude of movement (delta from last reading)
          const deltaX = Math.abs(x - lastX);
          const deltaY = Math.abs(y - lastY);
          const deltaZ = Math.abs(z - lastZ);
          const totalDelta = deltaX + deltaY + deltaZ;

          // Update last values
          lastX = x;
          lastY = y;
          lastZ = z;

          // Add to buffer
          movementBuffer.push(totalDelta);
          if (movementBuffer.length > BUFFER_SIZE) {
            movementBuffer.shift();
          }

          // Calculate average movement from buffer
          const avgMovement =
            movementBuffer.reduce((sum, val) => sum + val, 0) / movementBuffer.length;

          // Thresholds for different movement levels
          const STATIONARY_THRESHOLD = 0.05;
          const SLOW_THRESHOLD = 0.15;
          const MODERATE_THRESHOLD = 0.3;

          let intensity: 'stationary' | 'slow' | 'moderate' | 'fast';
          let moving: boolean;

          if (avgMovement < STATIONARY_THRESHOLD) {
            intensity = 'stationary';
            moving = false;
          } else if (avgMovement < SLOW_THRESHOLD) {
            intensity = 'slow';
            moving = true;
          } else if (avgMovement < MODERATE_THRESHOLD) {
            intensity = 'moderate';
            moving = true;
          } else {
            intensity = 'fast';
            moving = true;
          }

          setMotionState({
            isMoving: moving,
            movementIntensity: intensity,
          });
        });
      }
    };

    checkAvailability();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  /**
   * Get recommended location update interval based on motion
   * Returns interval in milliseconds
   */
  const getUpdateInterval = useCallback((): number => {
    switch (motionState.movementIntensity) {
      case 'stationary':
        return 300000; // 5 minutes when stationary
      case 'slow':
        return 120000; // 2 minutes when moving slowly
      case 'moderate':
        return 60000; // 1 minute when moving moderately
      case 'fast':
        return 30000; // 30 seconds when moving fast
      default:
        return 300000;
    }
  }, [motionState.movementIntensity]);

  /**
   * Get recommended distance interval based on motion
   * Returns distance in meters
   */
  const getDistanceInterval = useCallback((): number => {
    switch (motionState.movementIntensity) {
      case 'stationary':
        return 100; // 100 meters when stationary
      case 'slow':
        return 50; // 50 meters when moving slowly
      case 'moderate':
        return 25; // 25 meters when moving moderately
      case 'fast':
        return 10; // 10 meters when moving fast
      default:
        return 100;
    }
  }, [motionState.movementIntensity]);

  return {
    ...motionState,
    isAvailable,
    getUpdateInterval,
    getDistanceInterval,
  };
};
