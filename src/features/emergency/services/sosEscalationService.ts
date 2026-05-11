/**
 * SOS Escalation Service
 *
 * Manages the SOS escalation state machine:
 *   idle → warning (3 cycles × 10 seconds) → escalated
 *
 * During warning, the user can cancel ('safe' | 'cancelled').
 * If all 3 warning cycles complete without cancellation, the service
 * transitions to 'escalated' and triggers the full emergency flow.
 */

import { apiPost } from '@core/api/client';
import { auth } from '@core/firebase';
import * as Location from 'expo-location';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SOSPhase = 'idle' | 'warning' | 'escalated' | 'cancelled' | 'safe';

export interface SOSState {
  phase: SOSPhase;
  cycle: number;
  secondsLeft: number;
  reason: string;
}

type StateListener = (state: SOSState) => void;

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CYCLES = 3;
const CYCLE_DURATION_SEC = 10;

// ─── Service ──────────────────────────────────────────────────────────────────

class SOSEscalationService {
  private state: SOSState = {
    phase: 'idle',
    cycle: 0,
    secondsLeft: CYCLE_DURATION_SEC,
    reason: '',
  };

  private listeners: Set<StateListener> = new Set();
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  getState(): SOSState {
    return { ...this.state };
  }

  onStateChange(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  /**
   * Start the SOS warning flow.
   */
  start(reason: string) {
    if (this.state.phase === 'warning' || this.state.phase === 'escalated') return;

    this.state = {
      phase: 'warning',
      cycle: 0,
      secondsLeft: CYCLE_DURATION_SEC,
      reason,
    };
    this.notify();
    this.startTick();
  }

  /**
   * Cancel the SOS (user confirmed safe or manually cancelled).
   */
  cancel(outcome: 'safe' | 'cancelled') {
    this.stopTick();
    this.state = {
      ...this.state,
      phase: outcome,
    };
    this.notify();

    // Reset to idle after a short delay
    setTimeout(() => {
      this.state = { phase: 'idle', cycle: 0, secondsLeft: CYCLE_DURATION_SEC, reason: '' };
      this.notify();
    }, 1500);
  }

  /**
   * Immediately escalate (user confirmed unsafe or timer expired).
   */
  escalateNow(reason: string) {
    this.stopTick();
    this.state = {
      ...this.state,
      phase: 'escalated',
      reason,
    };
    this.notify();
    this.triggerEmergency();
  }

  /**
   * Clean up intervals — call when unmounting.
   */
  destroy() {
    this.stopTick();
    this.state = { phase: 'idle', cycle: 0, secondsLeft: CYCLE_DURATION_SEC, reason: '' };
    this.notify();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private startTick() {
    this.stopTick();
    this.tickInterval = setInterval(() => {
      if (this.state.phase !== 'warning') {
        this.stopTick();
        return;
      }

      this.state.secondsLeft -= 1;

      if (this.state.secondsLeft <= 0) {
        // Move to next cycle or escalate
        const nextCycle = this.state.cycle + 1;
        if (nextCycle >= MAX_CYCLES) {
          this.escalateNow('timer_expired');
        } else {
          this.state.cycle = nextCycle;
          this.state.secondsLeft = CYCLE_DURATION_SEC;
          this.notify();
        }
      } else {
        this.notify();
      }
    }, 1000);
  }

  private stopTick() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private async triggerEmergency() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      let location = null;
      try {
        const loc = await Location.getCurrentPositionAsync({});
        location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      } catch (e) {
        console.warn('[SOSEscalationService] Could not get location:', e);
      }

      await apiPost('/trigger-sos', {
        uid,
        reason: this.state.reason || 'SOS Escalation',
        riskScore: 100,
        location,
      });
    } catch (err) {
      console.error('[SOSEscalationService] triggerEmergency failed:', err);
    }
  }
}

/** Singleton instance */
export const sosService = new SOSEscalationService();
