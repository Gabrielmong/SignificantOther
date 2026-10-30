import {
  Box,
  Button,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Text,
} from '@gluestack-ui/themed';
import React, { useEffect, useState } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';

import { useAppTheme } from '../../hooks';
import { DailyQuestionStatus } from '../../hooks/useDailyQuestion';
import { DailyAnswer } from '../../types';
import { MAX_ANSWER_LENGTH } from '../../utils/dailyQuestion';
import { KeyboardAwareModal } from '../KeyboardAwareModal';
import { PressableScale } from '../styled/PressableScale';

interface DailyQuestionCardProps {
  question: string;
  status: DailyQuestionStatus;
  loaded: boolean;
  myAnswer: DailyAnswer | null;
  partnerAnswer: DailyAnswer | null;
  partnerName: string;
  hasPartner: boolean;
  onSubmit: (text: string) => void;
  onOpenHistory: () => void;
}

export function AnswerModal({
  isOpen,
  question,
  initialText,
  note,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  question: string;
  initialText: string;
  /** Shown above the input, e.g. that the answer will be marked late */
  note?: string;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const { theme } = useAppTheme();
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (isOpen) setText(initialText);
  }, [isOpen, initialText]);

  const canSave = text.trim().length > 0;

  return (
    <KeyboardAwareModal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop onPress={onClose} />
      <ModalContent>
        <ModalCloseButton onPress={onClose} />
        <ModalHeader>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text,
              paddingRight: theme.spacing[6],
            }}>
            {question}
          </Text>
        </ModalHeader>
        <ModalBody>
          {!!note && (
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.colors.warning,
                marginBottom: theme.spacing[2],
              }}>
              {note}
            </Text>
          )}
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            maxLength={MAX_ANSWER_LENGTH}
            placeholder="Your answer"
            placeholderTextColor={theme.colors.textTertiary}
            autoFocus
            style={{
              minHeight: 120,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              padding: theme.spacing[3],
              color: theme.colors.text,
              backgroundColor: theme.colors.inputBackground,
              fontSize: theme.fontSize.md,
            }}
          />
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.textTertiary,
              textAlign: 'right',
              marginTop: theme.spacing[1],
            }}>
            {`${text.length}/${MAX_ANSWER_LENGTH}`}
          </Text>
        </ModalBody>
        <Button
          onPress={() => onSave(text)}
          isDisabled={!canSave}
          style={{
            width: '100%',
            backgroundColor: theme.colors.primary,
            opacity: canSave ? 1 : 0.5,
          }}>
          <Text
            style={{
              color: theme.colors.white,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            Save
          </Text>
        </Button>
      </ModalContent>
    </KeyboardAwareModal>
  );
}

// Home card for today's shared question. The partner's answer stays hidden
// until the user has answered too.
export const DailyQuestionCard = ({
  question,
  status,
  loaded,
  myAnswer,
  partnerAnswer,
  partnerName,
  hasPartner,
  onSubmit,
  onOpenHistory,
}: DailyQuestionCardProps) => {
  const { theme } = useAppTheme();
  const [modalOpen, setModalOpen] = useState(false);

  const handleSave = (text: string) => {
    if (!text.trim()) return;
    // Close straight away: offline saves only resolve once synced, and the
    // local listener already shows the answer.
    setModalOpen(false);
    onSubmit(text);
  };

  const answerBlock = (label: string, text: string) => (
    <Box style={{ marginTop: theme.spacing[3] }}>
      <Text
        style={{
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textSecondary,
        }}>
        {label}
      </Text>
      <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.text, marginTop: 2 }}>
        {text}
      </Text>
    </Box>
  );

  const actionButton = (title: string) => (
    <TouchableOpacity
      onPress={() => setModalOpen(true)}
      style={{
        alignSelf: 'flex-start',
        marginTop: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[4],
        borderRadius: theme.radii.full,
        backgroundColor: theme.colors.primary,
      }}>
      <Text
        style={{
          color: theme.colors.white,
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.semibold,
        }}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <PressableScale
        onPress={onOpenHistory}
        accessibilityRole="button"
        style={{
          width: '100%',
          padding: theme.commonSpacing.cardPaddingCompact,
          borderRadius: theme.radii.lg,
          backgroundColor: theme.colors.surface,
          ...theme.shadows.sm,
        }}>
        <Text
          style={{
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.primary,
          }}>
          Today's question
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.lg,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text,
            marginTop: theme.spacing[1],
          }}>
          {question}
        </Text>

        {status === 'unanswered' && loaded && actionButton('Answer')}

        {status === 'waiting' && myAnswer && (
          <>
            {answerBlock('You', myAnswer.text)}
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.colors.textSecondary,
                marginTop: theme.spacing[3],
              }}>
              {hasPartner
                ? `Waiting for ${partnerName}…`
                : 'Invite your partner to see their answer'}
            </Text>
            {loaded && actionButton('Edit')}
          </>
        )}

        {status === 'revealed' && myAnswer && partnerAnswer && (
          <>
            {answerBlock('You', myAnswer.text)}
            {answerBlock(partnerName, partnerAnswer.text)}
          </>
        )}

        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.primary,
            alignSelf: 'flex-end',
            marginTop: theme.spacing[3],
          }}>
          Past questions →
        </Text>
      </PressableScale>

      <AnswerModal
        isOpen={modalOpen}
        question={question}
        initialText={myAnswer?.text ?? ''}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
};
