export type ZoneType = 'home' | 'work' | 'custom';

export interface Zone {
  id?: string;
  name: string;
  type: ZoneType;
  latitude: number;
  longitude: number;
  radius: number; // in meters (default: 100m)
  icon?: string; // emoji icon
  createdAt: number;
  createdBy: string; // User ID who created it
}

export interface ZoneObject {
  [key: string]: Zone;
}

export interface ZoneStatus {
  userId?: string;
  zoneId: string;
  zoneName: string;
  status: 'inside' | 'outside' | 'approaching'; // approaching = within 2x radius
  distance: number; // distance in meters
  enteredAt?: number; // timestamp when entered
  lastUpdated: number;
}

export interface UserZoneStatus {
  [userId: string]: {
    currentZone?: string; // current zone ID if inside one
    zones: {
      [zoneId: string]: ZoneStatus;
    };
  };
}
