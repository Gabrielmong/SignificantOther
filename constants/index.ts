import { version } from '../package.json';

export const APP_VERSION = version;

// Each entry also hides the tab bar on its nested routes (e.g. /Home/Journal/abc123)
export const TAB_HIDDEN_ROUTES = [
  '/Profile/EditProfile',
  '/Home/WhiteBoard',
  '/Home/Wishlist',
  '/Home/FavoriteThings',
  '/Home/Map',
  '/Home/Zones',
  '/Home/Countdowns',
  '/Home/DailyQuestion',
  '/Home/Journal',
  '/YouTwo/Photos',
  '/YouTwo/Places',
  '/YouTwo/Story',
  '/Chat/starred',
];

export const FLOWER_MAP: {
  [key: string]: any;
} = {
  amaranth: require('../assets/flowers/amaranth.webp'),
  carnation: require('../assets/flowers/carnation.webp'),
  dahlia: require('../assets/flowers/dahlia.webp'),
  daisy: require('../assets/flowers/daisy.webp'),
  hydrangea: require('../assets/flowers/hydrangea.webp'),
  lily: require('../assets/flowers/lily.webp'),
  orchid: require('../assets/flowers/orchid.webp'),
  peony: require('../assets/flowers/peony.webp'),
  rose: require('../assets/flowers/rose.webp'),
  sunflower: require('../assets/flowers/sunflower.webp'),
  tulip: require('../assets/flowers/tulip.webp'),
  violet: require('../assets/flowers/violet.webp'),
} as const;

export const FEELINGS_MAP: {
  [key: string]: any;
} = {
  angry: require('../assets/feelings/angry.webp'),
  anxious: require('../assets/feelings/anxious.webp'),
  bored: require('../assets/feelings/bored.webp'),
  calm: require('../assets/feelings/calm.webp'),
  euphoric: require('../assets/feelings/euphoric.webp'),
  flirty: require('../assets/feelings/flirty.webp'),
  happy: require('../assets/feelings/happy.webp'),
  headachy: require('../assets/feelings/headachy.webp'),
  horny: require('../assets/feelings/horny.webp'),
  hungry: require('../assets/feelings/hungry.webp'),
  hurt: require('../assets/feelings/hurt.webp'),
  inlove: require('../assets/feelings/inlove.webp'),
  nervous: require('../assets/feelings/nervous.webp'),
  neutral: require('../assets/feelings/neutral.webp'),
  overstimulated: require('../assets/feelings/overstimulated.webp'),
  sad: require('../assets/feelings/sad.webp'),
  safe: require('../assets/feelings/safe.webp'),
  sick: require('../assets/feelings/sick.webp'),
  sleepy: require('../assets/feelings/sleepy.webp'),
  tired: require('../assets/feelings/tired.webp'),
  uncomfortable: require('../assets/feelings/uncomfortable.webp'),
  unsure: require('../assets/feelings/unsure.webp'),
  upset: require('../assets/feelings/upset.webp'),
  worried: require('../assets/feelings/worried.webp'),
} as const;

export const FEELING_EMOJIS: {
  [key: string]: string;
} = {
  angry: '😠',
  anxious: '😨',
  bored: '😴',
  calm: '😌',
  euphoric: '🥳',
  flirty: '😏',
  happy: '😊',
  headachy: '🤕',
  horny: '😈',
  hurt: '😢',
  hungry: '🍔',
  inlove: '😍',
  nervous: '😬',
  neutral: '😐',
  overstimulated: '😵',
  sad: '😔',
  safe: '🛡️',
  sick: '🤢',
  sleepy: '😪',
  tired: '😪',
  uncomfortable: '😖',
  unsure: '🤔',
  upset: '😡',
  worried: '😟',
} as const;

export const FEELINGS_LABELS: {
  [key: string]: string;
} = {
  angry: 'angry',
  anxious: 'anxious',
  bored: 'bored',
  calm: 'calm',
  euphoric: 'euphoric',
  flirty: 'flirty',
  happy: 'happy',
  headachy: 'headachy',
  horny: 'horny',
  hungry: 'hungry',
  hurt: 'hurt',
  inlove: 'in love',
  neutral: 'neutral',
  nervous: 'nervous',
  overstimulated: 'overstimulated',
  sad: 'sad',
  safe: 'safe',
  sick: 'sick',
  sleepy: 'sleepy',
  tired: 'tired',
  uncomfortable: 'uncomfortable',
  unsure: 'unsure',
  upset: 'upset',
  worried: 'worried',
} as const;
