import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

import { FLOWER_MAP, FEELING_EMOJIS, FEELINGS_LABELS } from '../constants';
import { WidgetAccent, WidgetDisplayData } from '../services/widgetTask';
import { formatCountdownLabel } from '../utils/countdown';

interface PartnerStatusWidgetProps {
  data: WidgetDisplayData | null;
}

// Twilight light, used until the app has synced the user's accent.
const DEFAULT_ACCENT: WidgetAccent = { from: '#8859ff', to: '#5a1fff', text: '#ffffff' };

function cardGradient(accent: WidgetAccent) {
  return { from: accent.from, to: accent.to, orientation: 'TL_BR' as const };
}

// Accent text color at 90% opacity, for the message and placeholder lines.
function mutedText(accent: WidgetAccent) {
  const hex = accent.text.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.substring(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, 0.9)` as const;
}

function resolvePartnerDisplay(data: WidgetDisplayData) {
  return {
    flowerImage: FLOWER_MAP[data.flower],
    feelingEmoji: FEELING_EMOJIS[data.feeling] || '',
    feelingLabel: FEELINGS_LABELS[data.feeling] || data.feeling,
  };
}

// Shortens a countdown title in JS so the day count after it is never the
// part that gets cut off by the widget's own truncation.
function shortenTitle(title: string, maxLength: number) {
  return title.length > maxLength ? `${title.slice(0, maxLength - 1).trimEnd()}…` : title;
}

// Pill for the room's nearest countdown. The label is worked out at
// render time so the day count stays right without new data.
function CountdownPill({ data, compact }: { data: WidgetDisplayData; compact: boolean }) {
  const countdown = data.nextCountdown;
  if (!countdown) return null;

  const label = formatCountdownLabel(countdown.date);
  if (!label) return null;

  const title = shortenTitle(countdown.title, compact ? 24 : 28);
  const text = `${countdown.icon} ${title} · ${compact ? label.short : label.long}`;
  const accent = data.accent ?? DEFAULT_ACCENT;

  return (
    <FlexWidget
      style={{
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 2 : 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        width: 'wrap_content',
        marginTop: 6,
      }}>
      <TextWidget
        text={text}
        style={{ fontSize: compact ? 11 : 12, color: accent.text, fontWeight: '600' }}
        maxLines={1}
        truncate="END"
      />
    </FlexWidget>
  );
}

function PlaceholderCard({ padding, accent }: { padding: number; accent: WidgetAccent }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: cardGradient(accent),
        borderRadius: 20,
        padding,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      clickAction="OPEN_APP">
      <TextWidget text="💌" style={{ fontSize: 24, marginBottom: 4 }} />
      <TextWidget
        text="Waiting for an update…"
        style={{ fontSize: 12, color: mutedText(accent), textAlign: 'center', fontWeight: '500' }}
      />
    </FlexWidget>
  );
}

export function PartnerStatusWidget({ data }: PartnerStatusWidgetProps) {
  const accent = data?.accent ?? DEFAULT_ACCENT;

  if (!data || !data.flower) {
    return <PlaceholderCard padding={16} accent={accent} />;
  }

  const { flowerImage, feelingEmoji, feelingLabel } = resolvePartnerDisplay(data);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: cardGradient(accent),
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
      }}
      clickAction="OPEN_APP">
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {flowerImage && (
          <FlexWidget
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
            <ImageWidget image={flowerImage} imageWidth={60} imageHeight={60} radius={30} />
          </FlexWidget>
        )}
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <TextWidget
            text={data.partnerName || 'Partner'}
            style={{ fontSize: 16, color: accent.text, fontWeight: '700' }}
          />
          {!!data.feeling && (
            <FlexWidget
              style={{
                marginTop: 6,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                width: 'wrap_content',
              }}>
              <TextWidget
                text={`${feelingEmoji} ${feelingLabel}`.trim()}
                style={{ fontSize: 12, color: accent.text, fontWeight: '600' }}
              />
            </FlexWidget>
          )}
          <CountdownPill data={data} compact={false} />
        </FlexWidget>
      </FlexWidget>
      {!!data.message && (
        <TextWidget
          text={data.message}
          style={{ fontSize: 16, color: mutedText(accent), marginTop: 10, lineHeight: 18 }}
        />
      )}
    </FlexWidget>
  );
}

// A short, wide variant (~5 cells x 1 cell): flower on the left, partner name
// + feeling on a single line on the right, with the message (up to two lines)
// and the countdown pill below it.
// Registered as its own widget ("PartnerStatusCompact") so it appears as a
// separate size option in Android's widget picker, rather than relying on
// resize-driven responsiveness within PartnerStatusWidget.
export function PartnerStatusCompactWidget({ data }: PartnerStatusWidgetProps) {
  const accent = data?.accent ?? DEFAULT_ACCENT;

  if (!data || !data.flower) {
    return <PlaceholderCard padding={10} accent={accent} />;
  }

  const { flowerImage, feelingEmoji, feelingLabel } = resolvePartnerDisplay(data);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: cardGradient(accent),
        borderRadius: 16,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      clickAction="OPEN_APP">
      {flowerImage && (
        <FlexWidget
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
          }}>
          <ImageWidget image={flowerImage} imageWidth={50} imageHeight={50} radius={25} />
        </FlexWidget>
      )}
      <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={data.partnerName || 'Partner'}
            style={{ fontSize: 15, color: accent.text, fontWeight: '700' }}
            maxLines={1}
            truncate="END"
          />
          {!!data.feeling && (
            <FlexWidget
              style={{
                marginLeft: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                width: 'wrap_content',
              }}>
              <TextWidget
                text={`${feelingEmoji} ${feelingLabel}`.trim()}
                style={{ fontSize: 11, color: accent.text, fontWeight: '600' }}
              />
            </FlexWidget>
          )}
        </FlexWidget>
        {!!data.message && (
          <TextWidget
            text={data.message}
            style={{ fontSize: 12, color: mutedText(accent), marginTop: 2, lineHeight: 14 }}
            maxLines={2}
            truncate="END"
          />
        )}
        <CountdownPill data={data} compact />
      </FlexWidget>
    </FlexWidget>
  );
}
