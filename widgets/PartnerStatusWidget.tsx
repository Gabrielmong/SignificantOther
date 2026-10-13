import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { FLOWER_MAP, FEELING_EMOJIS, FEELINGS_LABELS } from '../constants';
import { WidgetDisplayData } from '../services/widgetTask';

interface PartnerStatusWidgetProps {
  data: WidgetDisplayData | null;
}

const CARD_GRADIENT = {
  from: '#9d75ff' as const,
  to: '#5a1fff' as const,
  orientation: 'TL_BR' as const,
};

function resolvePartnerDisplay(data: WidgetDisplayData) {
  return {
    flowerImage: FLOWER_MAP[data.flower],
    feelingEmoji: FEELING_EMOJIS[data.feeling] || '',
    feelingLabel: FEELINGS_LABELS[data.feeling] || data.feeling,
  };
}

function PlaceholderCard({ padding }: { padding: number }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: CARD_GRADIENT,
        borderRadius: 20,
        padding,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      clickAction="OPEN_APP">
      <TextWidget text="💌" style={{ fontSize: 24, marginBottom: 4 }} />
      <TextWidget
        text="Waiting for an update…"
        style={{ fontSize: 12, color: '#f3edff', textAlign: 'center', fontWeight: '500' }}
      />
    </FlexWidget>
  );
}

export function PartnerStatusWidget({ data }: PartnerStatusWidgetProps) {
  if (!data || !data.flower) {
    return <PlaceholderCard padding={16} />;
  }

  const { flowerImage, feelingEmoji, feelingLabel } = resolvePartnerDisplay(data);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: CARD_GRADIENT,
        borderRadius: 20,
        padding: 12,
        flexDirection: 'column',
      }}
      clickAction="OPEN_APP">
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {flowerImage && (
          <FlexWidget
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
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
            style={{ fontSize: 16, color: '#ffffff', fontWeight: '700' }}
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
                style={{ fontSize: 12, color: '#ffffff', fontWeight: '600' }}
              />
            </FlexWidget>
          )}
        </FlexWidget>
      </FlexWidget>
      {!!data.message && (
        <TextWidget
          text={data.message}
          style={{ fontSize: 16, color: '#f0eaff', marginTop: 8, lineHeight: 18 }}
        />
      )}
    </FlexWidget>
  );
}

// A short, wide variant (~5 cells x 1 cell): flower on the left, partner name
// + feeling on a single line on the right, with the message right below it.
// Registered as its own widget ("PartnerStatusCompact") so it appears as a
// separate size option in Android's widget picker, rather than relying on
// resize-driven responsiveness within PartnerStatusWidget.
export function PartnerStatusCompactWidget({ data }: PartnerStatusWidgetProps) {
  if (!data || !data.flower) {
    return <PlaceholderCard padding={10} />;
  }

  const { flowerImage, feelingEmoji, feelingLabel } = resolvePartnerDisplay(data);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: CARD_GRADIENT,
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
            style={{ fontSize: 15, color: '#ffffff', fontWeight: '700' }}
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
                style={{ fontSize: 11, color: '#ffffff', fontWeight: '600' }}
              />
            </FlexWidget>
          )}
        </FlexWidget>
        {!!data.message && (
          <TextWidget
            text={data.message}
            style={{ fontSize: 12, color: '#f0eaff', marginTop: 2, lineHeight: 14 }}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
