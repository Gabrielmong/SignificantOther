import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme, useAuth, useFirebase, useAppToast, useLocation } from '../../../hooks';
import { ZoneCard, AddZoneModal } from '../../../components';
import { Zone, ZoneObject, ZoneType } from '../../../types';
import { Box, Button, HStack, Text, Heading } from '@gluestack-ui/themed';
import { ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';

export default function Zones() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { getCurrentLocation } = useLocation();
  const { getZones, createZone, updateZone, deleteZone, listenToZoneChanges, getZoneStatus } =
    useFirebase();

  const [zones, setZones] = useState<ZoneObject>({});
  const [zoneStatus, setZoneStatus] = useState<any>({});
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Get current location
  useEffect(() => {
    const loadLocation = async () => {
      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
    };
    loadLocation();
  }, []);

  // Listen to zone changes
  useEffect(() => {
    if (!user.roomId) return;

    listenToZoneChanges((data) => {
      setZones(data.zones);
    }, user.roomId);
  }, [user.roomId]);

  // Load zone status
  useEffect(() => {
    if (!user.roomId || !user.uid) return;

    const loadStatus = async () => {
      if (!user.roomId || !user.uid) return;
      const status = await getZoneStatus(user.roomId, user.uid);
      if (status) {
        setZoneStatus(status);
      }
    };
    loadStatus();
  }, [user.roomId, user.uid]);

  const handleAddZone = () => {
    setEditingZone(null);
    setShowZoneModal(true);
  };

  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone);
    setShowZoneModal(true);
  };

  const handleSaveZone = async (zoneData: {
    name: string;
    type: ZoneType;
    latitude: number;
    longitude: number;
    radius: number;
    icon: string;
  }) => {
    if (!user.roomId || !user.uid) return;

    try {
      if (editingZone) {
        // Update existing zone
        await updateZone(user.roomId, editingZone.id!, {
          ...editingZone,
          ...zoneData,
        });
        showToast({
          title: 'Zone Updated',
          description: 'Your zone has been updated',
          status: 'success',
        });
      } else {
        // Create new zone
        await createZone(user.roomId, {
          ...zoneData,
          createdAt: Date.now(),
          createdBy: user.uid,
        });
        showToast({
          title: 'Zone Created',
          description: 'Your zone has been created',
          status: 'success',
        });
      }
      setShowZoneModal(false);
      setEditingZone(null);
    } catch (error) {
      console.error('Error saving zone:', error);
      showToast({
        title: 'Error',
        description: 'Failed to save zone',
        status: 'error',
      });
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!user.roomId) return;

    try {
      await deleteZone(user.roomId, zoneId);
      showToast({
        title: 'Zone Deleted',
        description: 'Your zone has been deleted',
        status: 'success',
      });
    } catch (error) {
      console.error('Error deleting zone:', error);
      showToast({
        title: 'Error',
        description: 'Failed to delete zone',
        status: 'error',
      });
    }
  };

  const zoneArray = Object.values(zones);

  return (
    <Box
      style={{
        flex: 1,
        backgroundColor: theme?.colors?.background,
      }}>
      <StatusBar
        backgroundColor={theme?.colors?.background}
        style={theme?.colorMode === 'dark' ? 'light' : 'dark'}
      />

      {/* Header */}
      <Box
        style={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: theme?.colors?.surface,
          ...theme?.shadows?.sm,
        }}>
        <HStack
          style={{
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
          <Heading
            style={{
              fontSize: theme?.fontSize?.xl,
              fontWeight: theme?.fontWeight?.bold,
              color: theme?.colors?.text,
            }}>
            Zones
          </Heading>
          <TouchableOpacity onPress={handleAddZone}>
            <Plus size={24} color={theme?.gradients?.primary?.colors?.[0]} />
          </TouchableOpacity>
        </HStack>
      </Box>

      {/* Zones List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          gap: 12,
        }}>
        {zoneArray.length > 0 ? (
          zoneArray.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              status={zoneStatus[zone.id!]?.status}
              onPress={() => handleEditZone(zone)}
            />
          ))
        ) : (
          <Box
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 60,
            }}>
            <Text
              style={{
                fontSize: theme?.fontSize?.lg,
                color: theme?.colors?.textSecondary,
                marginBottom: 20,
                textAlign: 'center',
              }}>
              No zones yet
            </Text>
            <Text
              style={{
                fontSize: theme?.fontSize?.sm,
                color: theme?.colors?.textSecondary,
                marginBottom: 20,
                textAlign: 'center',
                paddingHorizontal: 40,
              }}>
              Add zones like Home or Work to get notified when your partner arrives or leaves
            </Text>
            <Button
              onPress={handleAddZone}
              style={{
                backgroundColor: theme?.gradients?.primary?.colors?.[0],
              }}>
              <Text style={{ color: '#FFFFFF' }}>Add your first zone</Text>
            </Button>
          </Box>
        )}
      </ScrollView>

      {/* Add Zone Modal */}
      <AddZoneModal
        isOpen={showZoneModal}
        onClose={() => {
          setShowZoneModal(false);
          setEditingZone(null);
        }}
        onSave={handleSaveZone}
        onDelete={editingZone ? () => handleDeleteZone(editingZone.id!) : undefined}
        currentLocation={currentLocation}
        initialData={
          editingZone
            ? {
                name: editingZone.name,
                type: editingZone.type,
                latitude: editingZone.latitude,
                longitude: editingZone.longitude,
                radius: editingZone.radius,
                icon: editingZone.icon || '📍',
              }
            : undefined
        }
      />
    </Box>
  );
}
