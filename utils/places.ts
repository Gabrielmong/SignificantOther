/**
 * Places helpers
 * Pure functions (no React Native, no Firebase) so they can be checked
 * outside the app.
 */

import type { Milestone } from '../types/Milestone';
import type { Photo } from '../types/Photo';
import type { Place } from '../types/Place';

export type CameraView =
  | { kind: 'world' }
  | { kind: 'center'; center: [number, number]; zoom: number }
  | { kind: 'bounds'; ne: [number, number]; sw: [number, number] };

/**
 * Where the map should look: the world when empty, one place up close, or
 * all places fitted. Bounds use plain min/max, so places on both sides of
 * the antimeridian give a wide but valid view.
 */
export const cameraFor = (places: Place[]): CameraView => {
  if (places.length === 0) return { kind: 'world' };
  if (places.length === 1) {
    return { kind: 'center', center: [places[0].longitude, places[0].latitude], zoom: 13 };
  }

  const lngs = places.map((p) => p.longitude);
  const lats = places.map((p) => p.latitude);
  return {
    kind: 'bounds',
    ne: [Math.max(...lngs), Math.max(...lats)],
    sw: [Math.min(...lngs), Math.min(...lats)],
  };
};

/**
 * The milestones and photos pointing at a place. A milestone's gallery
 * photo is left out, since the milestone already represents it.
 */
export const linkedTo = (
  placeId: string,
  milestones: Milestone[],
  photos: Photo[],
): { milestones: Milestone[]; photos: Photo[] } => ({
  milestones: milestones.filter((m) => m.placeId === placeId),
  photos: photos.filter((p) => p.placeId === placeId && !p.milestoneId),
});

/**
 * A multi-path update that clears every link to a place (milestones and
 * all photos, mirrors included), so deleting it keeps the memories
 */
export const unlinkUpdates = (
  placeId: string,
  milestones: Milestone[],
  photos: Photo[],
  roomId: string,
): Record<string, null> => {
  const updates: Record<string, null> = {};
  for (const m of milestones) {
    if (m.placeId === placeId) updates[`rooms/${roomId}/milestones/${m.id}/placeId`] = null;
  }
  for (const p of photos) {
    if (p.placeId === placeId) updates[`rooms/${roomId}/photos/${p.id}/placeId`] = null;
  }
  return updates;
};

export type PlaceSuggestion = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

/**
 * Mapbox forward geocoding. `proximity` prefers results near a point (or
 * the connection's rough area with 'ip'); results are never limited to one
 * country.
 */
export const geocodeUrl = (
  query: string,
  proximity: [number, number] | 'ip',
  token: string,
): string => {
  const near = proximity === 'ip' ? 'ip' : `${proximity[0]},${proximity[1]}`;
  return (
    'https://api.mapbox.com/search/geocode/v6/forward' +
    `?q=${encodeURIComponent(query)}` +
    '&limit=5' +
    `&proximity=${encodeURIComponent(near)}` +
    `&access_token=${encodeURIComponent(token)}`
  );
};

/**
 * Suggestions from a geocoding response. Skips anything malformed and never
 * throws, so a bad response just means "no results".
 */
export const parseGeocode = (json: unknown): PlaceSuggestion[] => {
  const features = (json as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];

  const suggestions: PlaceSuggestion[] = [];
  for (const feature of features) {
    const properties = (feature as any)?.properties;
    const coordinates = (feature as any)?.geometry?.coordinates;
    const name = properties?.name;
    if (
      typeof name !== 'string' ||
      !Array.isArray(coordinates) ||
      !Number.isFinite(coordinates[0]) ||
      !Number.isFinite(coordinates[1])
    ) {
      continue;
    }
    suggestions.push({
      name,
      address: properties.full_address ?? properties.place_formatted ?? '',
      latitude: coordinates[1],
      longitude: coordinates[0],
    });
  }
  return suggestions;
};

/**
 * Where "+ Add" should drop its first pin: the map center, but only once the
 * map shows somewhere real (the user moved it, or there are places).
 * Otherwise null, so the user searches or long-presses instead of saving a
 * pin in the middle of the default world view.
 */
export const addDraftAt = (
  center: [number, number] | null,
  moved: boolean,
  placeCount: number,
): { longitude: number; latitude: number } | null =>
  center && (moved || placeCount > 0) ? { longitude: center[0], latitude: center[1] } : null;
