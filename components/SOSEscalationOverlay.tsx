/**
 * SOSEscalationOverlay
 *
 * Full-screen Modal overlay shown during the 'warning' and 'escalated' phases.
 *
 * Warning phase:
 *   - Pulsing red circle animation (scale 0.8→1.0, 1-second period)
 *   - Cycle counter + countdown
 *   - Progress bar for time remaining in cycle
 *   - "I AM SAFE" button (green) + "I AM UNSAFE" button (solid red)
 *   - Background tap → markSafe
 *   - Android back button → markSafe
 *   - Vibration pattern repeating every 3 seconds
 *   - Haptic feedback on each cycle start
 *
 * Escalated phase:
 *   - Confirmation that help is on the way
 *   - Pulsing location icon
 *   - "I AM SAFE NOW" button
 *
 * Cancelled / Safe / Idle: Modal is not visible.
 *
 * Wrapped in SOSErrorBoundary — on render error shows a minimal fallback
 * with a single "I AM SAFE" button.
 */

import * as Haptics from 'expo-haptics';
import React, { Component, useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useSOSEscalation } from '../hooks/useSOSEscalation';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_DURATION_SEC  = 10;
const VIBRATION_PATTERN   = [0, 500, 200, 500, 200, 500] as const;
const VIBRATION_REPEAT_MS = 3_000;

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface SOSErrorBoundaryProps {
  onSafe: () => void;
  children: React.ReactNode;
}

interface SOSErrorBoundaryState {
  hasError: boolean;
}

class SOSErrorBoundary extends Component<SOSErrorBoundaryProps, SOSErrorBoundaryState> {
  constructor(props: SOSErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SOSErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[SOSErrorBoundary] Render error caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.container}>
          <TouchableOpacity
            style={eb.safeBtn}
            onPress={this.props.onSafe}
            activeOpacity={0.85}
            accessibilityLabel="I am safe"
            accessibilityRole="button"
          >
            <Text style={eb.safeBtnText}>✅  I AM SAFE</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#1B1620',
    alignItems:      'center',
    justifyContent:  'center',
  },
  safeBtn: {
    backgroundColor: '#10b981',
    borderRadius:    16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems:      'center',
    minHeight:       44,
    minWidth:        44,
  },
  safeBtnText: {
    color:      '#fff',
    fontSize:   18,
    fontWeight: '700',
  },
});

// ─── Inner overlay (wrapped by error boundary) ────────────────────────────────

function SOSOverlayContent({
  markSafe,
  markUnsafe,
}: {
  markSafe: () => void;
  markUnsafe: () => void;
}) {
  const { state } = useSOSEscalation();
  const { phase, cycle, secondsLeft } = state;

  // ── Animations ──────────────────────────────────────────────────────────────

  // Pulsing ring for warning phase: 0.8 → 1.0 → 0.8, 1-second period (500ms each half)
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Pulsing location icon for escalated phase
  const locAnim   = useRef(new Animated.Value(1)).current;
  const locLoop   = useRef<Animated.CompositeAnimation | null>(null);

  // Fade-in for the whole overlay
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const isVisible = phase === 'warning' || phase === 'escalated';

  // ── Vibration interval ref ───────────────────────────────────────────────────
  const vibIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Audio Player for Siren ───────────────────────────────────────────────────
  const sirenPlayer = useAudioPlayer(require('../assets/siren.ogg'));

  // ── Overlay visibility / fade ────────────────────────────────────────────────
  useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue:         1,
        duration:        300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isVisible, fadeAnim]);

  // ── Warning phase: pulse + vibration ────────────────────────────────────────
  useEffect(() => {
    if (phase === 'warning') {
      // Pulse: 0.8 → 1.0 in 500ms, then 1.0 → 0.8 in 500ms (1-second total period)
      pulseAnim.setValue(0.8);
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue:         1.0,
            duration:        500,
            easing:          Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue:         0.8,
            duration:        500,
            easing:          Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.current.start();

      // Vibrate immediately, then repeat every 3 seconds
      Vibration.vibrate(VIBRATION_PATTERN as unknown as number[]);
      vibIntervalRef.current = setInterval(() => {
        Vibration.vibrate(VIBRATION_PATTERN as unknown as number[]);
      }, VIBRATION_REPEAT_MS);

      return () => {
        pulseLoop.current?.stop();
        pulseAnim.setValue(0.8);
        Vibration.cancel();
        if (vibIntervalRef.current) {
          clearInterval(vibIntervalRef.current);
          vibIntervalRef.current = null;
        }
      };
    }
  }, [phase, pulseAnim]);

  // ── Escalated phase: location pulse ─────────────────────────────────────────
  useEffect(() => {
    if (phase === 'escalated') {
      locLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(locAnim, {
            toValue:         1.3,
            duration:        800,
            easing:          Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(locAnim, {
            toValue:         1,
            duration:        800,
            easing:          Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      locLoop.current.start();

      sirenPlayer.loop = true;
      sirenPlayer.play();

      return () => {
        locLoop.current?.stop();
        locAnim.setValue(1);
        try { sirenPlayer.pause(); } catch (e) {}
      };
    } else {
      try { sirenPlayer.pause(); } catch (e) {}
    }
  }, [phase, locAnim, sirenPlayer]);

  // ── Haptic on each new cycle ─────────────────────────────────────────────────
  const prevCycleRef = useRef(-1);
  useEffect(() => {
    if (phase === 'warning' && cycle !== prevCycleRef.current) {
      prevCycleRef.current = cycle;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    if (phase !== 'warning') {
      prevCycleRef.current = -1;
    }
  }, [phase, cycle]);

  // ── Stop vibration when leaving warning phase ────────────────────────────────
  useEffect(() => {
    if (phase !== 'warning') {
      Vibration.cancel();
      if (vibIntervalRef.current) {
        clearInterval(vibIntervalRef.current);
        vibIntervalRef.current = null;
      }
    }
  }, [phase]);

  // ── Progress bar width (0–1) ─────────────────────────────────────────────────
  const progress = secondsLeft / CYCLE_DURATION_SEC;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>

      {/* ── WARNING PHASE ─────────────────────────────────────────────── */}
      {phase === 'warning' && (
        // Background tap → markSafe (Req 3.6)
        <TouchableOpacity
          style={s.fullTouchable}
          activeOpacity={1}
          onPress={markSafe}
          accessible={false}
        >
          {/* Pulsing ring */}
          <Animated.View
            style={[s.pulseRing, { transform: [{ scale: pulseAnim }] }]}
          />

          {/* Separate container so button presses don't bubble to background tap */}
          <View style={s.contentWrapper} pointerEvents="box-none">
            {/* Title */}
            <Text style={s.titleWarning}>🚨 EMERGENCY ALERT</Text>

            {/* Cycle subtitle */}
            <Text style={s.subtitle}>
              Cycle {cycle + 1} of 3 — Alerting contacts in {secondsLeft}s
            </Text>

            {/* Large countdown */}
            <Text style={s.countdown}>{secondsLeft}</Text>

            {/* Progress bar */}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            {/* Instruction — no longer references CANCEL SOS */}
            <Text style={s.instruction}>
              Tap I AM SAFE if you are okay
            </Text>

            {/* I AM SAFE button — stopPropagation prevents background tap double-fire */}
            <TouchableOpacity
              style={s.safeBtn}
              onPress={(e) => { e.stopPropagation(); markSafe(); }}
              activeOpacity={0.85}
              accessibilityLabel="I am safe"
              accessibilityRole="button"
            >
              <Text style={s.safeBtnText}>✅  I AM SAFE</Text>
            </TouchableOpacity>

            {/* I AM UNSAFE button — immediately escalates (Req 3.4, 4.2) */}
            <TouchableOpacity
              style={s.unsafeBtn}
              onPress={(e) => { e.stopPropagation(); markUnsafe(); }}
              activeOpacity={0.85}
              accessibilityLabel="I am unsafe"
              accessibilityRole="button"
            >
              <Text style={s.unsafeBtnText}>🆘  I AM UNSAFE</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* ── ESCALATED PHASE ───────────────────────────────────────────── */}
      {phase === 'escalated' && (
        <View style={s.escalatedContainer}>
          <Text style={s.titleEscalated}>🚨 EMERGENCY ESCALATED</Text>

          <Text style={s.escalatedBody}>
            Help is on the way.{'\n'}
            Contacts notified.{'\n'}
            Location being shared.
          </Text>

          {/* Pulsing location icon */}
          <Animated.Text
            style={[s.locationIcon, { transform: [{ scale: locAnim }] }]}
          >
            📍
          </Animated.Text>

          <TouchableOpacity
            style={s.safeBtn}
            onPress={markSafe}
            activeOpacity={0.85}
            accessibilityLabel="I am safe now"
            accessibilityRole="button"
          >
            <Text style={s.safeBtnText}>✅  I AM SAFE NOW</Text>
          </TouchableOpacity>
        </View>
      )}

    </Animated.View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SOSEscalationOverlay() {
  const { state, markSafe, markUnsafe } = useSOSEscalation();
  const { phase } = state;

  const isVisible = phase === 'warning' || phase === 'escalated';

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        // Android back button → treat as "I am safe" (Req 3.5)
        if (phase === 'warning' || phase === 'escalated') markSafe();
      }}
    >
      {/* Wrap modal content in error boundary (Req 11.5) */}
      <SOSErrorBoundary onSafe={markSafe}>
        <SOSOverlayContent markSafe={markSafe} markUnsafe={markUnsafe} />
      </SOSErrorBoundary>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems:      'center',
    justifyContent:  'center',
  },

  // ── Warning ──────────────────────────────────────────────────────────────────

  fullTouchable: {
    flex:            1,
    width:           '100%',
    alignItems:      'center',
    justifyContent:  'center',
  },

  pulseRing: {
    position:        'absolute',
    width:           320,
    height:          320,
    borderRadius:    160,
    backgroundColor: 'rgba(255, 30, 30, 0.18)',
    borderWidth:     2,
    borderColor:     'rgba(255, 30, 30, 0.4)',
  },

  contentWrapper: {
    alignItems:        'center',
    paddingHorizontal: 32,
    width:             '100%',
  },

  titleWarning: {
    color:         '#ff3b3b',
    fontSize:      26,
    fontWeight:    '800',
    letterSpacing: 1,
    textAlign:     'center',
    marginBottom:  8,
  },

  subtitle: {
    color:        'rgba(255,255,255,0.75)',
    fontSize:     15,
    textAlign:    'center',
    marginBottom: 20,
  },

  countdown: {
    color:        '#ff3b3b',
    fontSize:     80,
    fontWeight:   '900',
    lineHeight:   88,
    marginBottom: 16,
  },

  progressTrack: {
    width:           '80%',
    height:          6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius:    3,
    overflow:        'hidden',
    marginBottom:    20,
  },

  progressFill: {
    height:          '100%',
    backgroundColor: '#ff3b3b',
    borderRadius:    3,
  },

  instruction: {
    color:         'rgba(255,255,255,0.45)',
    fontSize:      12,
    textAlign:     'center',
    marginBottom:  28,
    letterSpacing: 0.3,
  },

  safeBtn: {
    width:           '85%',
    backgroundColor: '#10b981',
    borderRadius:    16,
    paddingVertical: 18,
    alignItems:      'center',
    marginBottom:    14,
    minHeight:       44,
    shadowColor:     '#10b981',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.45,
    shadowRadius:    12,
    elevation:       8,
  },

  safeBtnText: {
    color:         '#fff',
    fontSize:      18,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },

  // "I AM UNSAFE" — solid red, white bold text, min 44×44 dp (Req 3.4, 4.2)
  unsafeBtn: {
    width:           '85%',
    backgroundColor: '#E53935',
    borderRadius:    16,
    paddingVertical: 18,
    alignItems:      'center',
    marginBottom:    14,
    minHeight:       44,
    shadowColor:     '#E53935',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.45,
    shadowRadius:    12,
    elevation:       8,
  },

  unsafeBtnText: {
    color:         '#fff',
    fontSize:      18,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },

  // ── Escalated ────────────────────────────────────────────────────────────────

  escalatedContainer: {
    alignItems:        'center',
    paddingHorizontal: 32,
    width:             '100%',
  },

  titleEscalated: {
    color:         '#ff4d79',
    fontSize:      24,
    fontWeight:    '800',
    letterSpacing: 1,
    textAlign:     'center',
    marginBottom:  20,
  },

  escalatedBody: {
    color:        'rgba(255,255,255,0.8)',
    fontSize:     16,
    textAlign:    'center',
    lineHeight:   26,
    marginBottom: 32,
  },

  locationIcon: {
    fontSize:     64,
    marginBottom: 36,
  },
});
