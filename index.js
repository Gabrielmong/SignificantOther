'use strict';
exports.__esModule = true;
require('expo-router/entry');

const { registerWidgetTaskHandler } = require('react-native-android-widget');
const widgetTaskHandler = require('./widgets/widgetTaskHandler').default;

registerWidgetTaskHandler(widgetTaskHandler);
