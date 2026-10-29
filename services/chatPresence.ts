// Whether the chat screen is on screen right now (focused, app in the
// foreground), so an incoming chat push can skip notifying about a message
// you're already looking at. Module state: it only means anything in the
// running app, and a headless background task always sees false.

let chatOnScreen = false;

export const setChatOnScreen = (onScreen: boolean) => {
  chatOnScreen = onScreen;
};

export const isChatOnScreen = () => chatOnScreen;
