'use strict';
exports.__esModule = true;
require('expo-router/entry');

const { registerWidgetTaskHandler } = require('react-native-android-widget');

const widgetTaskHandler = require('./widgets/widgetTaskHandler').default;

registerWidgetTaskHandler(widgetTaskHandler);

// Headless entry points must register here: a push or notification action for
// a killed app runs this file but never renders the app, so app/_layout.tsx
// (a route) never loads. These register the FCM background handler and the
// chat notification reply task on import.
require('./services/chatNotifications');
require('./services/pushMessages');
