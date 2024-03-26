import { version } from '../package.json';

export const APP_VERSION = version;

export const TAB_HIDDEN_ROUTES = ['/Profile/EditProfile', '/Home/WhiteBoard'];

export const FLOWER_MAP: {
  [key: string]: any;
} = {
  daisy: require('../assets/flowers/daisy.png'),
  dahlia: require('../assets/flowers/dahlia.png'),
  hydrangea: require('../assets/flowers/hydrangea.jpeg'),
  lily: require('../assets/flowers/lily.png'),
  orchid: require('../assets/flowers/orchid.jpeg'),
  rose: require('../assets/flowers/rose.png'),
  sunflower: require('../assets/flowers/sunflower.jpeg'),
  tulip: require('../assets/flowers/tulip.jpeg'),
  violet: require('../assets/flowers/violet.png'),
} as const;

export const FEELINGS_MAP: {
  [key: string]: any;
} = {
  anxious: require('../assets/feelings/anxious.jpeg'),
  bored: require('../assets/feelings/bored.jpeg'),
  euphoric: require('../assets/feelings/euphoric.jpeg'),
  flirty: require('../assets/feelings/flirty.jpeg'),
  happy: require('../assets/feelings/happy.jpeg'),
  horny: require('../assets/feelings/horny.jpeg'),
  hurt: require('../assets/feelings/hurt.jpeg'),
  inlove: require('../assets/feelings/inlove.jpeg'),
  neutral: require('../assets/feelings/neutral.jpeg'),
  overstimulated: require('../assets/feelings/overstimulated.jpeg'),
  sad: require('../assets/feelings/sad.jpeg'),
  tired: require('../assets/feelings/tired.jpeg'),
  uncomfortable: require('../assets/feelings/uncomfortable.jpeg'),
  upset: require('../assets/feelings/upset.jpeg'),
  worried: require('../assets/feelings/worried.jpeg'),
} as const;

export const FEELING_EMOJIS: {
  [key: string]: string;
} = {
  anxious: '😨',
  bored: '😴',
  euphoric: '🥳',
  flirty: '😏',
  happy: '😊',
  horny: '😈',
  hurt: '😢',
  inlove: '😍',
  neutral: '😐',
  overstimulated: '😵',
  sad: '😔',
  tired: '😪',
  uncomfortable: '😖',
  upset: '😡',
  worried: '😟',
} as const;

export const FEELINGS_LABELS: {
  [key: string]: string;
} = {
  anxious: 'anxious',
  bored: 'bored',
  euphoric: 'euphoric',
  flirty: 'flirty',
  happy: 'happy',
  horny: 'horny',
  hurt: 'hurt',
  inlove: 'in love',
  neutral: 'neutral',
  overstimulated: 'overstimulated',
  sad: 'sad',
  tired: 'tired',
  uncomfortable: 'uncomfortable',
  upset: 'upset',
  worried: 'worried',
} as const;
