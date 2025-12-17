/**
 * Full-Screen Journal Editor
 * Supports both creating new entries and editing existing ones
 */

import {
  View,
  Text,
  Box,
  Input,
  InputField,
  HStack,
} from '@gluestack-ui/themed';
import { useAppTheme, useAuth, useFirebase, useAppToast } from '../../../../hooks';
import { StatusBar, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { Journal } from '../../../../types';
import { ArrowLeft, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function JournalEditor() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const params = useLocalSearchParams();
  const { getEntryInJournal, updateEntryInJournal, createEntryInJournal } = useFirebase();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState({ title: '', description: '' });

  const descriptionInputRef = useRef<TextInput>(null);

  // Load existing entry if editing
  useEffect(() => {
    if (params.id && user.roomId) {
      loadEntry();
    }
  }, [params.id]);

  const loadEntry = async () => {
    if (params.id && user.roomId) {
      try {
        const data = await getEntryInJournal(user.roomId, String(params.id));
        setTitle(data.title);
        setDescription(data.description);
        setInitialData({ title: data.title, description: data.description });
      } catch (error) {
        showToast({ title: 'Error', description: 'Failed to load entry', status: 'error' });
      }
    }
  };

  // Track if there are unsaved changes
  useEffect(() => {
    const changed = title !== initialData.title || description !== initialData.description;
    setHasChanges(changed);
  }, [title, description, initialData]);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      showToast({
        title: 'Incomplete',
        description: 'Please fill in both title and description',
        status: 'warning',
      });
      return;
    }

    setLoading(true);

    try {
      if (params.id && user.roomId) {
        // Update existing entry
        const updatedEntry: Journal = {
          author: user.displayName || '',
          authorId: user.uid || '',
          title: title.trim(),
          description: description.trim(),
          createdAt: '', // Will be preserved
          updatedAt: new Date().toISOString(),
        };

        await updateEntryInJournal(user.roomId, String(params.id), updatedEntry);
        showToast({ title: 'Success', description: 'Entry updated', status: 'success' });
        router.back();
      } else if (user.roomId) {
        // Create new entry
        const newEntry: Journal = {
          author: user.displayName || '',
          authorId: user.uid || '',
          title: title.trim(),
          description: description.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await createEntryInJournal(user.roomId, newEntry);
        showToast({ title: 'Success', description: 'Entry created', status: 'success' });
        router.back();
      }
    } catch (error) {
      showToast({ title: 'Error', description: 'Failed to save entry', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      // TODO: Could add a confirmation dialog here
      // For now, just go back
    }
    router.back();
  };

  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;
  const charCount = description.length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar backgroundColor="transparent" translucent />

      {/* Header */}
      <Box
        style={{
          paddingTop: 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: theme?.colors?.surface,
          ...theme?.shadows?.sm,
        }}>
        <HStack
          style={{
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: theme?.fontSize?.xl,
              fontWeight: theme?.fontWeight?.bold,
              color: theme?.colors?.text,
            }}>
            {params.id ? 'Edit Entry' : 'New Entry'}
          </Text>

          <TouchableOpacity onPress={handleSave} disabled={loading || !hasChanges}>
            <Box
              style={{
                opacity: loading || !hasChanges ? 0.5 : 1,
              }}>
              <Save size={24} color={theme?.gradients?.primary?.colors?.[0]} />
            </Box>
          </TouchableOpacity>
        </HStack>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.commonSpacing.screenPadding,
          gap: theme.spacing[4],
        }}
        keyboardShouldPersistTaps="handled">
        {/* Title Input */}
        <Box>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
            Title
          </Text>
          <Input
            variant="outline"
            style={{
              backgroundColor: theme.colors.surface,
            }}>
            <InputField
              value={title}
              onChangeText={setTitle}
              placeholder="Give your entry a title..."
              style={{
                fontSize: theme.fontSize.xl,
                fontWeight: theme.fontWeight.bold,
              }}
              autoFocus={!params.id}
              returnKeyType="next"
              onSubmitEditing={() => descriptionInputRef.current?.focus()}
            />
          </Input>
        </Box>

        {/* Description Input */}
        <Box style={{ flex: 1, minHeight: 400 }}>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
            Your Thoughts
          </Text>
          <Input
            variant="outline"
            style={{
              minHeight: 400,
              alignItems: 'flex-start',
              backgroundColor: theme.colors.surface,
            }}>
            <InputField
              ref={descriptionInputRef}
              value={description}
              onChangeText={setDescription}
              placeholder="Start writing..."
              multiline
              style={{
                textAlignVertical: 'top',
                fontSize: theme.fontSize.md,
                lineHeight: theme.lineHeight.relaxed * theme.fontSize.md,
                minHeight: 400,
              }}
            />
          </Input>
        </Box>

        {/* Stats */}
        <Box
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing[2],
          }}>
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.textSecondary,
            }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.textSecondary,
            }}>
            {charCount} {charCount === 1 ? 'character' : 'characters'}
          </Text>
        </Box>

        {/* Save Button (for easy thumb access) */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !hasChanges}
          style={{ marginBottom: theme.spacing[4] }}>
          <LinearGradient
            colors={theme?.gradients?.primary?.colors || ['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              padding: theme.spacing[4],
              borderRadius: theme.radii.lg,
              alignItems: 'center',
              opacity: loading || !hasChanges ? 0.5 : 1,
            }}>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.semibold,
              }}>
              {loading ? 'Saving...' : 'Save Entry'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
