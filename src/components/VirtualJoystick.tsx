import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeJoystickVector,
  DEFAULT_JOYSTICK_DEADZONE,
  DEFAULT_JOYSTICK_EDGE_THRESHOLD,
  JoystickVector,
} from '../game/joystick';

export interface VirtualJoystickProps {
  /** Called whenever normalized movement vector (x: right/left, y: forward/backward) changes. */
  onMove: (x: number, y: number) => void;
  /** Disables interaction and resets active movement to (0, 0). */
  disabled?: boolean;
  /** Diameter of the joystick base pad in pixels. */
  size?: number;
  /** Normalized deadzone radius (0..0.9) before movement registers. */
  deadzone?: number;
  /** Accent hex color for active glow and confirmation ring. */
  accentColor?: string;
}

const REST_VECTOR: JoystickVector = {
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

/**
 * Triggers lightweight haptic feedback via the browser Vibration API when available.
 */
function triggerHaptic(pattern: number | number[]): void {
  if (typeof window === 'undefined' || typeof window.navigator?.vibrate !== 'function') {
    return;
  }
  try {
    window.navigator.vibrate(pattern);
  } catch {
    // Gracefully ignore when browser blocks vibration without user gesture or support
  }
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  disabled = false,
  size = 116,
  deadzone = DEFAULT_JOYSTICK_DEADZONE,
  accentColor = '#f5a623',
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const wasAboveThresholdRef = useRef(false);
  const wasAtEdgeRef = useRef(false);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const [engaged, setEngaged] = useState(false);
  const [vector, setVector] = useState<JoystickVector>(REST_VECTOR);
  const [pulseCount, setPulseCount] = useState(0);

  const knobSize = Math.round(size * 0.42);
  const maxRadius = Math.max(16, (size - knobSize) / 2);

  const resetStick = useCallback(() => {
    activePointerIdRef.current = null;
    wasAboveThresholdRef.current = false;
    wasAtEdgeRef.current = false;
    setEngaged(false);
    setVector(REST_VECTOR);
    onMoveRef.current(0, 0);
  }, []);

  // Reset immediately if disabled (e.g., modal opened) or on unmount
  useEffect(() => {
    if (disabled) {
      resetStick();
    }
  }, [disabled, resetStick]);

  useEffect(() => {
    return () => {
      onMoveRef.current(0, 0);
    };
  }, []);

  const updateFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const next = computeJoystickVector(
        clientX - centerX,
        clientY - centerY,
        maxRadius,
        deadzone,
        DEFAULT_JOYSTICK_EDGE_THRESHOLD,
      );

      // Fire crisp haptic pulse + visual ripple when crossing into active input threshold
      if (next.active && !wasAboveThresholdRef.current) {
        triggerHaptic(14);
        setPulseCount((prev) => prev + 1);
      }
      wasAboveThresholdRef.current = next.active;

      // Subtle micro-haptic tick when reaching full outer deflection ring
      if (next.atEdge && !wasAtEdgeRef.current) {
        triggerHaptic(8);
      }
      wasAtEdgeRef.current = next.atEdge;

      setVector(next);
      onMoveRef.current(next.x, next.y);
    },
    [deadzone, maxRadius],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (activePointerIdRef.current !== null) return;

      e.preventDefault();
      e.stopPropagation();

      activePointerIdRef.current = e.pointerId;
      setEngaged(true);

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unavailable in synthetic environments
      }

      updateFromClientPoint(e.clientX, e.clientY);
    },
    [disabled, updateFromClientPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      e.preventDefault();
      e.stopPropagation();
      updateFromClientPoint(e.clientX, e.clientY);
    },
    [updateFromClientPoint],
  );

  const handlePointerRelease = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      e.stopPropagation();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }
      resetStick();
    },
    [resetStick],
  );

  const isRegistered = engaged && vector.active;
  const activeGlowColor = vector.atEdge ? '#c084fc' : accentColor;

  return (
    <div
      className={`relative flex flex-col items-center select-none touch-none ${
        disabled ? 'opacity-30 pointer-events-none' : 'pointer-events-auto'
      }`}
    >
      <div
        ref={baseRef}
        role="application"
        aria-label="Virtual movement joystick"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerRelease}
        onPointerCancel={handlePointerRelease}
        onLostPointerCapture={handlePointerRelease}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: size,
          height: size,
          borderColor: isRegistered
            ? activeGlowColor
            : engaged
              ? 'rgba(245, 166, 35, 0.65)'
              : 'rgba(196, 155, 88, 0.36)',
          boxShadow: isRegistered
            ? `0 0 22px ${activeGlowColor}55, inset 0 0 18px ${activeGlowColor}28`
            : engaged
              ? '0 0 14px rgba(245, 166, 35, 0.28), inset 0 0 10px rgba(245, 166, 35, 0.12)'
              : '0 8px 24px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 232, 185, 0.12)',
        }}
        className={`relative rounded-full bg-[#0e0b16]/85 border backdrop-blur-xs cursor-grab active:cursor-grabbing transition-[transform,opacity,border-color,box-shadow] duration-150 ease-out ${
          isRegistered
            ? 'opacity-100 scale-105'
            : engaged
              ? 'opacity-90 scale-[1.02]'
              : 'opacity-65 hover:opacity-85 scale-100'
        }`}
      >
        {/* Expanding pulse ring confirming threshold crossing */}
        {pulseCount > 0 && (
          <span
            key={pulseCount}
            aria-hidden="true"
            style={{ borderColor: accentColor }}
            className="pointer-events-none absolute -inset-1 rounded-full border-2 animate-joystick-ripple"
          />
        )}

        {/* Inner deadzone reference ring */}
        <div
          aria-hidden="true"
          style={{
            width: Math.round(maxRadius * deadzone * 2 + knobSize * 0.55),
            height: Math.round(maxRadius * deadzone * 2 + knobSize * 0.55),
          }}
          className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-opacity duration-150 ${
            isRegistered
              ? 'border-[#f5a623]/45 opacity-90'
              : engaged
                ? 'border-[#c49b58]/35 opacity-75'
                : 'border-[#c49b58]/20 opacity-45'
          }`}
        />

        {/* Cardinal directional ticks */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-2 rounded-full transition-colors duration-150 ${
            isRegistered && vector.y > 0.35 ? 'bg-[#f5a623]' : 'bg-[#c49b58]/35'
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-2 rounded-full transition-colors duration-150 ${
            isRegistered && vector.y < -0.35 ? 'bg-[#f5a623]' : 'bg-[#c49b58]/35'
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-1 rounded-full transition-colors duration-150 ${
            isRegistered && vector.x < -0.35 ? 'bg-[#f5a623]' : 'bg-[#c49b58]/35'
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-1 rounded-full transition-colors duration-150 ${
            isRegistered && vector.x > 0.35 ? 'bg-[#f5a623]' : 'bg-[#c49b58]/35'
          }`}
        />

        {/* Active heading indicator chevron rotating around the outer rim */}
        <div
          aria-hidden="true"
          style={{
            transform: `rotate(${vector.angleDeg}deg)`,
            opacity: isRegistered ? 0.35 + vector.magnitude * 0.65 : 0,
          }}
          className="pointer-events-none absolute inset-0 transition-opacity duration-150"
        >
          <div
            style={{
              backgroundColor: activeGlowColor,
              boxShadow: `0 0 10px ${activeGlowColor}`,
            }}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 w-2 h-5 rounded-full"
          />
        </div>

        {/* Thumb puck — immediate tracking during drag, spring-back on release */}
        <div
          aria-hidden="true"
          style={{
            width: knobSize,
            height: knobSize,
            transform: `translate3d(calc(-50% + ${vector.knobX}px), calc(-50% + ${vector.knobY}px), 0) scale(${
              isRegistered ? 1.12 : engaged ? 1.06 : 1
            })`,
            borderColor: isRegistered ? activeGlowColor : 'rgba(212, 163, 81, 0.58)',
            boxShadow: isRegistered
              ? `0 0 16px ${activeGlowColor}88, inset 0 1px 2px rgba(255, 255, 255, 0.35)`
              : '0 4px 12px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 232, 185, 0.25)',
          }}
          className={`pointer-events-none absolute top-1/2 left-1/2 rounded-full border-2 bg-gradient-to-b from-[#2a1f3d] to-[#120c20] flex items-center justify-center ${
            engaged
              ? 'transition-[border-color,box-shadow] duration-100'
              : 'transition-[transform,border-color,box-shadow] duration-150 ease-out'
          }`}
        >
          <span
            style={{
              backgroundColor: isRegistered ? activeGlowColor : '#d4a351',
              opacity: isRegistered ? 1 : engaged ? 0.8 : 0.45,
            }}
            className="w-2.5 h-2.5 rounded-full transition-[opacity,background-color] duration-150"
          />
        </div>
      </div>
    </div>
  );
};
