import React from 'react';
import {
  Box,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Text,
} from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';
import { FeelingHistoryEntry } from '../../types';
import { feelingDisplay, formatTime } from '../../utils/feelingHistory';

export type MoodDaySection = {
  label: string;
  entries: FeelingHistoryEntry[];
};

// Lists every feeling change of one day, one section per partner.
export const MoodDayModal = ({
  isOpen,
  title,
  sections,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  sections: MoodDaySection[];
  onClose: () => void;
}) => {
  const { theme } = useAppTheme();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop onPress={onClose} />
      <ModalContent>
        <ModalCloseButton onPress={onClose} />
        <ModalHeader>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            {title}
          </Text>
        </ModalHeader>
        <ModalBody>
          {sections.map((section) => (
            <Box key={section.label} style={{ marginBottom: theme.spacing[4] }}>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[2],
                }}>
                {section.label}
              </Text>
              {section.entries.length === 0 ? (
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                  Nothing logged
                </Text>
              ) : (
                section.entries.map((entry, index) => {
                  const { emoji, label } = feelingDisplay(entry.feeling);
                  return (
                    <Text
                      key={`${entry.at}-${index}`}
                      style={{
                        fontSize: theme.fontSize.md,
                        color: theme.colors.text,
                        marginBottom: theme.spacing[1],
                      }}>
                      {`${formatTime(entry.at)}  ${emoji} ${label}`}
                    </Text>
                  );
                })
              )}
            </Box>
          ))}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
