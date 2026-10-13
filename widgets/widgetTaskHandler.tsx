import type React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getDatabase, ref as databaseRef, get } from 'firebase/database';
import { PartnerStatusWidget, PartnerStatusCompactWidget } from './PartnerStatusWidget';
import {
  getWidgetTaskUserInfo,
  getWidgetLastData,
  setWidgetLastData,
  WidgetDisplayData,
} from '../services/widgetTask';

const NAME_TO_WIDGET: Record<
  string,
  (props: { data: WidgetDisplayData | null }) => React.JSX.Element
> = {
  PartnerStatus: PartnerStatusWidget,
  PartnerStatusCompact: PartnerStatusCompactWidget,
};

async function refreshFromFirebase(): Promise<WidgetDisplayData | null> {
  const { roomId, partnerId, partnerName } = await getWidgetTaskUserInfo();

  if (!roomId || !partnerId) {
    return null;
  }

  try {
    const db = getDatabase();
    const partnerRef = databaseRef(db, `rooms/${roomId}/users/${partnerId}`);
    const snapshot = await get(partnerRef);

    if (!snapshot.exists()) {
      return null;
    }

    const partnerData = snapshot.val();
    const data: WidgetDisplayData = {
      flower: partnerData.selectedFlower || '',
      message: partnerData.message || '',
      feeling: partnerData.selectedFeeling || '',
      partnerName: partnerName || '',
      updatedAt: Date.now(),
    };

    await setWidgetLastData(data);
    return data;
  } catch (error) {
    console.error('Widget task: error refreshing from Firebase:', error);
    return null;
  }
}

export default async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const Widget = NAME_TO_WIDGET[props.widgetInfo.widgetName];

  if (!Widget) {
    return;
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      // Render immediately from whatever we have cached, for a fast first paint...
      const cached = await getWidgetLastData();
      props.renderWidget(<Widget data={cached} />);

      // ...then refresh from Firebase (this is the periodic fallback: Android
      // invokes WIDGET_UPDATE on its own updatePeriodMillis timer) and
      // re-render if anything changed.
      const fresh = await refreshFromFirebase();
      if (fresh) {
        props.renderWidget(<Widget data={fresh} />);
      }
      break;
    }

    case 'WIDGET_DELETED':
      break;

    case 'WIDGET_CLICK':
      break;

    default:
      break;
  }
}
