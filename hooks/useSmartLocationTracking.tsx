import { useEffect, useRef } from 'react';
import { useMotionDetection } from './useMotionDetection';
import { useLocation } from './useLocation';

/**
 * Hook that combines motion detection with location tracking
 * Automatically adjusts location update frequency based on device movement
 */
export const useSmartLocationTracking = () => {
  const {
    isMoving,
    movementIntensity,
    isAvailable: isMotionAvailable,
    getUpdateInterval,
    getDistanceInterval,
  } = useMotionDetection();

  const { isTracking, updateBackgroundIntervals } = useLocation();

  const lastIntensityRef = useRef(movementIntensity);

  useEffect(() => {
    // Only update intervals if motion detection is available and tracking is active
    if (!isMotionAvailable || !isTracking) {
      return;
    }

    // Only update if intensity has changed
    if (lastIntensityRef.current !== movementIntensity) {
      const newTimeInterval = getUpdateInterval();
      const newDistanceInterval = getDistanceInterval();

      console.log(
        `Motion intensity changed to ${movementIntensity}, updating intervals to ${newTimeInterval}ms, ${newDistanceInterval}m`,
      );

      updateBackgroundIntervals(newTimeInterval, newDistanceInterval);
      lastIntensityRef.current = movementIntensity;
    }
  }, [
    movementIntensity,
    isMotionAvailable,
    isTracking,
    getUpdateInterval,
    getDistanceInterval,
    updateBackgroundIntervals,
  ]);

  return {
    isMoving,
    movementIntensity,
    isMotionDetectionActive: isMotionAvailable && isTracking,
  };
};
