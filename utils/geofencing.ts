import { Zone } from '../types';
import { calculateDistance } from './distance';

export type ZoneStatusType = 'inside' | 'outside' | 'approaching';

export interface ZoneCheckResult {
  zoneId: string;
  zoneName: string;
  status: ZoneStatusType;
  distance: number;
}

/**
 * Check if a location is within a zone's radius
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param zone Zone to check against
 * @returns Zone status (inside, outside, or approaching)
 */
export const checkZoneStatus = (
  userLat: number,
  userLon: number,
  zone: Zone,
): ZoneCheckResult => {
  const distance = calculateDistance(
    userLat,
    userLon,
    zone.latitude,
    zone.longitude,
  );

  let status: ZoneStatusType;
  const radius = zone.radius;
  const approachingThreshold = radius * 2; // Approaching when within 2x the radius

  if (distance <= radius) {
    status = 'inside';
  } else if (distance <= approachingThreshold) {
    status = 'approaching';
  } else {
    status = 'outside';
  }

  return {
    zoneId: zone.id!,
    zoneName: zone.name,
    status,
    distance,
  };
};

/**
 * Check all zones for a given location
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param zones Object containing all zones
 * @returns Map of zone IDs to their check results
 */
export const checkAllZones = (
  userLat: number,
  userLon: number,
  zones: { [key: string]: Zone },
): { [zoneId: string]: ZoneCheckResult } => {
  const results: { [zoneId: string]: ZoneCheckResult } = {};

  Object.values(zones).forEach((zone) => {
    if (zone.id) {
      const result = checkZoneStatus(userLat, userLon, zone);
      results[zone.id] = result;
    }
  });

  return results;
};

/**
 * Get the nearest zone the user is inside or approaching
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param zones Object containing all zones
 * @returns The nearest relevant zone, or null if none
 */
export const getNearestRelevantZone = (
  userLat: number,
  userLon: number,
  zones: { [key: string]: Zone },
): (ZoneCheckResult & { zone: Zone }) | null => {
  const zoneArray = Object.values(zones);

  if (zoneArray.length === 0) return null;

  const resultsWithZones = zoneArray
    .map((zone) => ({
      ...checkZoneStatus(userLat, userLon, zone),
      zone,
    }))
    .filter((result) => result.status === 'inside' || result.status === 'approaching')
    .sort((a, b) => a.distance - b.distance);

  return resultsWithZones.length > 0 ? resultsWithZones[0] : null;
};

/**
 * Calculate ETA to a zone based on current speed
 * @param distance Distance to zone in meters
 * @param speed Current speed in meters per second (optional)
 * @returns ETA in minutes, or null if cannot calculate
 */
export const calculateZoneETA = (
  distance: number,
  speed?: number,
): number | null => {
  if (!speed || speed < 0.5) {
    // If not moving or moving very slowly, can't calculate ETA
    return null;
  }

  const timeInSeconds = distance / speed;
  const timeInMinutes = Math.round(timeInSeconds / 60);

  return timeInMinutes;
};

/**
 * Format ETA for display
 * @param minutes ETA in minutes
 * @returns Formatted string like "5 min" or "1 hr 30 min"
 */
export const formatETA = (minutes: number | null): string => {
  if (minutes === null || minutes < 1) {
    return 'Arriving soon';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
};
