declare module 'react-native-battery-optimization-check' {
  /** Resolves true when the app is still subject to battery optimization (not yet exempt). Android only. */
  export function BatteryOptEnabled(): Promise<boolean>;
  /** Opens the system dialog to request exemption from battery optimization for this app. Android only. */
  export function RequestDisableOptimization(): void;
  /** Opens the general battery optimization settings screen. Android only. */
  export function OpenOptimizationSettings(): void;
}
