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
import { CountdownOccurrence, feelingDisplay, formatTime } from '../../utils/feelingHistory';

export type MoodDaySection = {
  label: string;
  entries: FeelingHistoryEntry[];
};

// Lists one day's countdown events (if any), then every feeling change,
// one section per partner.
export const MoodDayModal = ({
  isOpen,
  title,
  sections,
  events,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  sections: MoodDaySection[];
  events?: CountdownOccurrence[];
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
          {!!events?.length && (
            <Box style={{ marginBottom: theme.spacing[4] }}>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[2],
                }}>
                Events
              </Text>
              {events.map((event) => (
                <Text
                  key={event.id}
                  style={{
                    fontSize: theme.fontSize.md,
                    color: theme.colors.text,
                    marginBottom: theme.spacing[1],
                  }}>
                  {`${event.icon} ${event.title}`}
                </Text>
              ))}
            </Box>
          )}
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
