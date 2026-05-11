/**
 * useSOSEscalation
 *
 * React hook that bridges the SOSEscalationService singleton into React state.
 * Subscribes to state changes on mount and cleans up on unmount.
 */

import { useEffect, useState } from 'react';
import { requestInitialPermissions } from '../services/permissionManager';
import { sosService, SOSState } from '../services/sosEscalationService';

export function useSOSEscalation() {
  const [state, setState] = useState<SOSState>(sosService.getState());

  useEffect(() => {
    // Request location and microphone permissions on mount (fire-and-forget)
    requestInitialPermissions().catch((err) => {
      console.warn('[useSOSEscalation] requestInitialPermissions failed:', err);
    });

    // Subscribe to service state changes
    const unsub = sosService.onStateChange(setState);

    return () => {
      unsub();
      // Destroy clears all intervals and resets to idle when the
      // owning screen unmounts. This prevents orphaned intervals.
      sosService.destroy();
    };
  }, []);

  return {
    state,
    startSOS:   (reason: string) => sosService.start(reason),
    markSafe:   ()               => sosService.cancel('safe'),
    cancelSOS:  ()               => sosService.cancel('cancelled'),
    markUnsafe: ()               => sosService.escalateNow('user_confirmed_unsafe'),
  };
}
