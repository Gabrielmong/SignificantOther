import { useRef } from 'react';
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import { animationPresets, duration } from '../config/theme/animations';

// Shared Reanimated layout animations, so every screen moves the same way.
// ReduceMotion.System turns them off when the phone's "reduce motion" is on.

const { staggerDelay, translateYFrom } = animationPresets.listItemEntry;

// Caps the stagger so long lists don't take seconds to finish appearing
const MAX_STAGGERED = 8;

/** Fade up into place; pass the item's index to stagger a list */
export const listItemEntering = (index = 0) =>
  FadeInDown.duration(duration.slow)
    .delay(Math.min(index, MAX_STAGGERED) * staggerDelay)
    .withInitialValues({ transform: [{ translateY: translateYFrom }] })
    .reduceMotion(ReduceMotion.System);

// How long after a list first shows items its entrances stay staggered
const STAGGER_WINDOW = 1000;

/**
 * listItemEntering for a list screen: staggers only the first batch of items,
 * so one added later (a new countdown at the bottom) fades in without waiting
 * for its position in the stagger. Pass whether the list has items yet.
 */
export const useListEntering = (hasItems: boolean) => {
  const staggerUntil = useRef<number | null>(null);
  if (hasItems && staggerUntil.current === null) {
    staggerUntil.current = Date.now() + STAGGER_WINDOW;
  }

  return (index: number) =>
    listItemEntering(
      staggerUntil.current !== null && Date.now() < staggerUntil.current ? index : 0,
    );
};

/** Quick fade out for removed items */
export const listItemExiting = FadeOut.duration(duration.moderate).reduceMotion(
  ReduceMotion.System,
);

/**
 * Siblings slide into the gap left by an added or removed item. Timed with an
 * ease-out rather than a spring: over long moves (switching a filter) a spring
 * launched too fast and overshot.
 */
export const listLayout = LinearTransition.duration(duration.slower)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

/** Plain fade, for content swapping in place (skeleton → content) */
export const fadeEntering = FadeIn.duration(duration.slow).reduceMotion(ReduceMotion.System);
