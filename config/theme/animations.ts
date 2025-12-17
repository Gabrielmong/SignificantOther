/**
 * Animation Configurations
 * Moderate level: Smooth transitions, subtle micro-interactions
 * Using react-native-reanimated for 60fps animations
 */

/**
 * Animation Durations (in milliseconds)
 */
export const duration = {
  instant: 0,
  fast: 100,       // Quick feedback (hover states)
  normal: 150,     // Button/card press
  moderate: 200,   // List item entry
  slow: 250,       // Screen transitions
  slower: 300,     // Modal entry
  slowest: 400,    // Complex animations
} as const;

/**
 * Easing Functions
 * Pre-configured easing for common animation types
 */
export const easing = {
  // Linear
  linear: 'linear',

  // Ease (most common)
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Custom cubic-bezier (for more control)
  smoothOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  smoothIn: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  smoothInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
} as const;

/**
 * Spring Configurations
 * For react-native-reanimated spring animations
 */
export const springConfig = {
  // Bouncy spring (playful)
  bouncy: {
    damping: 15,
    stiffness: 200,
  },

  // Standard spring (modal entry)
  standard: {
    damping: 20,
    stiffness: 300,
  },

  // Gentle spring (smooth, no overshoot)
  gentle: {
    damping: 25,
    stiffness: 250,
  },

  // Snappy spring (quick response)
  snappy: {
    damping: 30,
    stiffness: 400,
  },
} as const;

/**
 * Animation Presets
 * Ready-to-use animation configurations
 */
export const animationPresets = {
  /**
   * Button/Card Press Animation
   * Scale down slightly with quick timing
   */
  press: {
    scaleFrom: 1.0,
    scaleTo: 0.98,
    duration: duration.normal,
    easing: 'ease-out',
  },

  /**
   * Hover State (Web/Pressable)
   * Subtle opacity change
   */
  hover: {
    opacityFrom: 1.0,
    opacityTo: 0.8,
    duration: duration.fast,
    easing: 'ease-out',
  },

  /**
   * Screen Fade In
   * Smooth fade transition
   */
  fadeIn: {
    opacityFrom: 0,
    opacityTo: 1,
    duration: duration.slow,
    easing: 'ease-in-out',
  },

  /**
   * Screen Fade Out
   */
  fadeOut: {
    opacityFrom: 1,
    opacityTo: 0,
    duration: duration.slow,
    easing: 'ease-in-out',
  },

  /**
   * Modal Entry Animation
   * Scale up with spring
   */
  modalEntry: {
    scaleFrom: 0.95,
    scaleTo: 1.0,
    opacityFrom: 0,
    opacityTo: 1,
    duration: duration.slower,
    springConfig: springConfig.standard,
  },

  /**
   * Modal Exit Animation
   * Scale down quickly
   */
  modalExit: {
    scaleFrom: 1.0,
    scaleTo: 0.95,
    opacityFrom: 1,
    opacityTo: 0,
    duration: duration.moderate,
    easing: 'ease-in',
  },

  /**
   * List Item Entry (Stagger)
   * Slide up with fade
   */
  listItemEntry: {
    translateYFrom: 20,
    translateYTo: 0,
    opacityFrom: 0,
    opacityTo: 1,
    duration: duration.moderate,
    easing: 'ease-out',
    staggerDelay: 50,  // Delay between items
  },

  /**
   * Slide In From Right
   * For screen transitions
   */
  slideInRight: {
    translateXFrom: 100,
    translateXTo: 0,
    opacityFrom: 0.5,
    opacityTo: 1,
    duration: duration.slow,
    easing: 'ease-out',
  },

  /**
   * Slide Out To Left
   */
  slideOutLeft: {
    translateXFrom: 0,
    translateXTo: -100,
    opacityFrom: 1,
    opacityTo: 0,
    duration: duration.slow,
    easing: 'ease-in',
  },

  /**
   * Pulse Animation
   * For send button feedback
   */
  pulse: {
    scaleFrom: 1.0,
    scaleTo: 1.1,
    duration: duration.normal,
    easing: 'ease-in-out',
    repeat: 2,  // Pulse twice
  },

  /**
   * Shake Animation
   * For error feedback
   */
  shake: {
    translateXValues: [0, -10, 10, -10, 10, 0],
    duration: duration.slowest,
    easing: 'ease-in-out',
  },

  /**
   * Loading Skeleton Shimmer
   * For loading states
   */
  shimmer: {
    translateXFrom: -100,
    translateXTo: 100,
    duration: 1500,
    easing: 'linear',
    repeat: -1,  // Infinite
  },
} as const;

/**
 * Interaction Feedback Timing
 * Optimal timing for different interaction types
 */
export const interactionTiming = {
  // Touch feedback (vibration, haptic)
  hapticDelay: 0,

  // Debounce delays for inputs
  searchDebounce: 300,
  inputDebounce: 500,

  // Toast/notification duration
  toastShort: 2000,
  toastLong: 4000,

  // Auto-hide delays
  tooltipDelay: 800,
  hoverDelay: 200,
} as const;

/**
 * Reduced Motion Support
 * Fallback values when user prefers reduced motion
 */
export const reducedMotion = {
  duration: duration.instant,  // No animations
  scale: 1.0,                  // No scaling
  opacity: 1.0,                // No fade
  translate: 0,                // No movement
} as const;

/**
 * Type exports
 */
export type AnimationPreset = keyof typeof animationPresets;
export type SpringConfigKey = keyof typeof springConfig;
export type DurationKey = keyof typeof duration;
