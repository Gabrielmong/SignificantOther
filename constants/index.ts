import { version } from '../package.json';

export const APP_VERSION = version;

export const TAB_HIDDEN_ROUTES = ['/Profile/EditProfile', '/Home/WhiteBoard'];

export const FLOWER_MAP: {
  [key: string]: any;
} = {
  daisy: require('../assets/daisy.png'),
  dahlia: require('../assets/dahlia.png'),
  hydrangea: require('../assets/hydrangea.jpeg'),
  lily: require('../assets/lily.png'),
  orchid: require('../assets/orchid.jpeg'),
  rose: require('../assets/rose.png'),
  sunflower: require('../assets/sunflower.jpeg'),
  tulip: require('../assets/tulip.jpeg'),
  violet: require('../assets/violet.png'),
};
