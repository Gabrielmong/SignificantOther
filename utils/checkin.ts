/**
 * The daily check-in reminder's identity, so it can be replaced on its own
 * without touching other notifications or push registration.
 */
export const CHECKIN_ID = 'checkin-reminder';
export const CHECKIN_TITLE = 'Time to check in!';

/**
 * Which scheduled notifications are the check-in reminder: ours by id, or one
 * scheduled before reminders had a fixed id (matched by its title)
 */
export const checkinIdsToCancel = (
  scheduled: { identifier: string; content: { title?: string | null } }[],
): string[] =>
  scheduled
    .filter((n) => n.identifier === CHECKIN_ID || n.content.title === CHECKIN_TITLE)
    .map((n) => n.identifier);
