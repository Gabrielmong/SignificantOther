import { useState, useEffect, useMemo } from 'react';
import { ZoneObject, ZoneStatus } from '../types';

interface UseZonesProps {
  roomId: string | null;
  userId: string | null;
  partnerId: string | null;
  getZones: (roomId: string) => Promise<any>;
  getZoneStatus: (roomId: string, userId: string) => Promise<any>;
  listenToZoneChanges: (callback: (data: any) => void, roomId: string) => void;
  listenToZoneStatusChanges: (
    callback: (data: any) => void,
    roomId: string,
    userId: string,
  ) => void;
}

export const useZones = ({
  roomId,
  userId,
  partnerId,
  getZones,
  getZoneStatus,
  listenToZoneChanges,
  listenToZoneStatusChanges,
}: UseZonesProps) => {
  const [zones, setZones] = useState<ZoneObject>({});
  const [partnerZoneStatus, setPartnerZoneStatus] = useState<{
    [zoneId: string]: ZoneStatus;
  } | null>(null);

  // Load zones
  useEffect(() => {
    if (!roomId) return;

    const loadZones = async () => {
      try {
        const zonesData = await getZones(roomId);
        if (zonesData) {
          setZones(zonesData);
        }
      } catch (error) {
        console.error('Error loading zones:', error);
      }
    };

    loadZones();

    // Listen to zone changes
    if (roomId) {
      const unsubscribe = listenToZoneChanges((data) => {
        if (data?.zones) {
          setZones(data.zones);
        }
      }, roomId);

      return unsubscribe;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Load partner's zone status
  useEffect(() => {
    if (!roomId || !partnerId) return;

    const loadPartnerStatus = async () => {
      try {
        const status = await getZoneStatus(roomId, partnerId);
        if (status) {
          setPartnerZoneStatus(status);
        }
      } catch (error) {
        console.error('Error loading partner zone status:', error);
      }
    };

    loadPartnerStatus();

    // Listen to partner's zone status changes
    if (roomId && partnerId) {
      const unsubscribe = listenToZoneStatusChanges(
        (data) => {
          if (data) {
            setPartnerZoneStatus(data);
          }
        },
        roomId,
        partnerId,
      );

      return unsubscribe;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, partnerId]);

  /**
   * Get partner's current zone (the zone they're inside)
   * Memoized to prevent unnecessary re-renders
   */
  const partnerCurrentZone = useMemo(() => {
    if (!partnerZoneStatus) return null;

    // Find the first zone where partner is inside
    const insideZone = Object.values(partnerZoneStatus).find(
      (status) => status.status === 'inside',
    );

    return insideZone || null;
  }, [partnerZoneStatus]);

  const partnerCurrentZoneObject = useMemo(() => {
    if (!partnerCurrentZone || !zones) return null;

    const zoneEntry = Object.entries(zones).find(
      ([zoneId, _]) => zoneId === partnerCurrentZone.zoneId,
    );
    return zoneEntry ? zoneEntry[1] : null;
  }, [partnerCurrentZone, zones]);

  /**
   * Get partner's approaching zone (the zone they're approaching)
   * Memoized to prevent unnecessary re-renders
   */
  const partnerApproachingZone = useMemo(() => {
    if (!partnerZoneStatus) return null;

    // Find the first zone where partner is approaching
    const approachingZone = Object.values(partnerZoneStatus).find(
      (status) => status.status === 'approaching',
    );

    return approachingZone || null;
  }, [partnerZoneStatus]);

  return {
    zones,
    partnerZoneStatus,
    partnerCurrentZone,
    partnerApproachingZone,
    partnerCurrentZoneObject,
  };
};
