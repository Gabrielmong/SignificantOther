// react-native-android-widget calls widget components as plain functions, so
// React Compiler's memoization (which uses hooks) must stay out of this file
'use no memo';

import { getDatabase, ref as databaseRef, get } from '@react-native-firebase/database';
import type React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { PartnerStatusWidget, PartnerStatusCompactWidget } from './PartnerStatusWidget';
import { ensureSignedIn } from '../services/firebaseApp';
import {
  getWidgetTaskUserInfo,
  getWidgetLastData,
  mergeWidgetLastData,
  WidgetDisplayData,
} from '../services/widgetTask';
import { getNextCountdown } from '../utils/countdown';

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
    // Widget updates can run headless, before the app has initialized Firebase
    if (!(await ensureSignedIn())) {
      return null;
    }

    const db = getDatabase();
    const [partnerResult, countdownsResult] = await Promise.allSettled([
      get(databaseRef(db, `rooms/${roomId}/users/${partnerId}`)),
      get(databaseRef(db, `rooms/${roomId}/countdowns`)),
    ]);

    if (partnerResult.status === 'rejected') {
      throw partnerResult.reason;
    }

    const snapshot = partnerResult.value;
    if (!snapshot.exists()) {
      return null;
    }

    const partnerData = snapshot.val();
    const update: Partial<WidgetDisplayData> = {
      flower: partnerData.selectedFlower || '',
      message: partnerData.message || '',
      feeling: partnerData.selectedFeeling || '',
      partnerName: partnerName || '',
    };

    // If the countdowns read failed, leave the cached countdown as it is.
    if (countdownsResult.status === 'fulfilled') {
      update.nextCountdown = getNextCountdown(countdownsResult.value.val());
    } else {
      console.error('Widget task: error reading countdowns:', countdownsResult.reason);
    }

    return await mergeWidgetLastData(update);
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
