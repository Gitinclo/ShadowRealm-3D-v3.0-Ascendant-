export interface JoystickVector {
  /** Normalized horizontal movement (-1 = left, +1 = right), 0 inside deadzone. */
  x: number;
  /** Normalized forward/backward movement (+1 = up/forward, -1 = down/backward), 0 inside deadzone. */
  y: number;
  /** Clamped screen-space knob offset in pixels (X). */
  knobX: number;
  /** Clamped screen-space knob offset in pixels (Y). */
  knobY: number;
  /** Normalized analog magnitude in [0, 1] after deadzone rescaling. */
  magnitude: number;
  /** Raw deflection ratio in [0, 1] before deadzone rescaling. */
  rawMagnitude: number;
  /** True once deflection exceeds the deadzone threshold. */
  active: boolean;
  /** True once deflection reaches the outer full-tilt ring. */
  atEdge: boolean;
  /** Heading angle in degrees (0 = right, -90 = up, 90 = down) for directional indicator rendering. */
  angleDeg: number;
}

export const DEFAULT_JOYSTICK_DEADZONE = 0.18;
export const DEFAULT_JOYSTICK_EDGE_THRESHOLD = 0.92;

/**
 * Maps a screen-space pointer offset (dx, dy) relative to the joystick center
 * into a clamped, deadzone-compensated analog movement vector.
 */
export function computeJoystickVector(
  dx: number,
  dy: number,
  maxRadius: number,
  deadzone: number = DEFAULT_JOYSTICK_DEADZONE,
  edgeThreshold: number = DEFAULT_JOYSTICK_EDGE_THRESHOLD,
): JoystickVector {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(maxRadius) || maxRadius <= 0) {
    return {
      x: 0,
      y: 0,
      knobX: 0,
      knobY: 0,
      magnitude: 0,
      rawMagnitude: 0,
      active: false,
      atEdge: false,
      angleDeg: 0,
    };
  }

  const safeDeadzone = Math.max(0, Math.min(0.9, deadzone));
  const dist = Math.hypot(dx, dy);

  if (dist < 1e-6) {
    return {
      x: 0,
      y: 0,
      knobX: 0,
      knobY: 0,
      magnitude: 0,
      rawMagnitude: 0,
      active: false,
      atEdge: false,
      angleDeg: 0,
    };
  }

  const clampedDist = Math.min(dist, maxRadius);
  const ux = dx / dist;
  const uy = dy / dist;
  const knobX = ux * clampedDist;
  const knobY = uy * clampedDist;
  const rawMagnitude = clampedDist / maxRadius;
  const angleDeg = (Math.atan2(uy, ux) * 180) / Math.PI;

  if (rawMagnitude <= safeDeadzone) {
    return {
      x: 0,
      y: 0,
      knobX,
      knobY,
      magnitude: 0,
      rawMagnitude,
      active: false,
      atEdge: false,
      angleDeg,
    };
  }

  const magnitude = Math.min(1, (rawMagnitude - safeDeadzone) / (1 - safeDeadzone));

  return {
    x: ux * magnitude,
    // Invert screen Y so dragging upward yields positive forward movement (+1).
    y: -uy * magnitude,
    knobX,
    knobY,
    magnitude,
    rawMagnitude,
    active: true,
    atEdge: rawMagnitude >= edgeThreshold,
    angleDeg,
  };
}
