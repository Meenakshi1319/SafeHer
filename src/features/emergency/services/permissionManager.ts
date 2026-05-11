/**
 * Permission Manager for SafeHer Emergency Module
 * 
 * Requests location and microphone permissions needed for SOS features.
 */

import * as Location from 'expo-location';
import { requestRecordingPermissionsAsync } from 'expo-audio';

/**
 * Requests initial permissions for location and microphone.
 * Called once when the SOS escalation hook mounts.
 */
export async function requestInitialPermissions(): Promise<void> {
  const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
  if (locStatus !== 'granted') {
    console.warn('[PermissionManager] Location permission denied');
  }

  const micStatus = await requestRecordingPermissionsAsync();
  if (!micStatus.granted) {
    console.warn('[PermissionManager] Microphone permission denied');
  }
}
