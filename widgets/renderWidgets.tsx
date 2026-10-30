// react-native-android-widget calls widget components as plain functions, so
// React Compiler's memoization (which uses hooks) must stay out of this file
'use no memo';

import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { PartnerStatusWidget, PartnerStatusCompactWidget } from './PartnerStatusWidget';
import {
  getWidgetLastData,
  mergeWidgetLastData,
  WidgetAccent,
  WidgetDisplayData,
} from '../services/widgetTask';
import { CountdownObject } from '../types';
import { getNextCountdown, isSameWidgetCountdown } from '../utils/countdown';

// Redraws every widget size placed on the home screen with the same data.
export async function renderAllWidgets(data: WidgetDisplayData) {
  if (Platform.OS !== 'android') return;

  await requestWidgetUpdate({
    widgetName: 'PartnerStatus',
    renderWidget: () => <PartnerStatusWidget data={data} />,
    widgetNotFound: () => {
      console.log('PartnerStatus widget not found on home screen, skipping render');
    },
  });

  await requestWidgetUpdate({
    widgetName: 'PartnerStatusCompact',
    renderWidget: () => <PartnerStatusCompactWidget data={data} />,
    widgetNotFound: () => {
      console.log('PartnerStatusCompact widget not found on home screen, skipping render');
    },
  });
}

// Pushes the room's nearest countdown to the widgets when it has changed.
// Several screens listen to countdowns, so compare with the cache to avoid
// redrawing for every listener.
export async function syncNextCountdownToWidget(countdowns: CountdownObject) {
  if (Platform.OS !== 'android') return;

  try {
    const next = getNextCountdown(countdowns);
    const cached = await getWidgetLastData();
    if (cached && isSameWidgetCountdown(cached.nextCountdown, next)) return;

    const data = await mergeWidgetLastData({ nextCountdown: next });
    await renderAllWidgets(data);
  } catch (error) {
    console.error('Error syncing countdown to widget:', error);
  }
}

// Pushes the user's accent colors to the widgets when they have changed
// (theme pick or light/dark switch).
export async function syncAccentToWidget(accent: WidgetAccent) {
  if (Platform.OS !== 'android') return;

  try {
    const cached = await getWidgetLastData();
    const current = cached?.accent;
    if (
      current &&
      current.from === accent.from &&
      current.to === accent.to &&
      current.text === accent.text
    ) {
      return;
    }

    const data = await mergeWidgetLastData({ accent });
    await renderAllWidgets(data);
  } catch (error) {
    console.error('Error syncing accent to widget:', error);
  }
}
