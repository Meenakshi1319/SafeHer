import { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { EncodingType } from 'expo-file-system';
import * as SMS from 'expo-sms';
import { apiPost, apiGet } from '@core/api/client';
import { auth } from '@core/firebase';
import { BASE_URL } from '@core/api/client';

export function useSOSAction(onEvidenceUploaded: () => void) {
  const [sosActive, setSosActive] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  const sosTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const triggerSOS = useCallback(async () => {
    if (sosActive) return;
    setSosActive(true);
    setRecordingStatus('🔴 Recording audio & getting location...');

    Alert.alert(
      '🚨 SOS Activated!',
      '✅ Secret audio recording started\n✅ Location tracked\n✅ Will upload to Firebase Evidence Vault in 10s',
      [{ text: 'OK' }]
    );

    try {
      let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      let locationObj = null;
      if (locStatus === 'granted') {
        locationObj = await Location.getCurrentPositionAsync({});
      }

      const micStatus = await requestRecordingPermissionsAsync();
      if (!micStatus.granted) {
        setSosActive(false);
        setRecordingStatus('Microphone permission denied');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      sosTimeoutRef.current = setTimeout(async () => {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        if (!mountedRef.current) return;
        setRecordingStatus('🔄 Uploading evidence to Cloud Vault...');

        const uid = auth.currentUser?.uid || 'unknown';

        if (uri) {
          const token = await auth.currentUser?.getIdToken();

          setRecordingStatus('🔐 Hashing evidence securely...');
          const fileBase64 = await FileSystem.readAsStringAsync(uri, { encoding: EncodingType.Base64 });
          const evidenceHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            fileBase64
          );

          setRecordingStatus('🔄 Uploading evidence to Cloud Vault...');
          const formData = new FormData();
          formData.append('uid', uid);
          formData.append('type', 'audio');
          formData.append('reason', 'SOS Audio Recording');
          formData.append('evidenceHash', evidenceHash);
          formData.append('file', {
            uri,
            name: `audio_${Date.now()}.m4a`,
            type: 'audio/m4a',
          } as any);

          await fetch(`${BASE_URL}/upload-evidence`, {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
        }

        try {
          await apiPost('/trigger-sos', {
            uid,
            reason: 'Emergency Auto-Trigger',
            riskScore: 100,
            location: locationObj ? { lat: locationObj.coords.latitude, lng: locationObj.coords.longitude } : null
          });
          setRecordingStatus('✅ Evidence securely saved to Firebase.');
        } catch (apiError) {
          console.log('[Offline Fallback] API failed, sending SMS...', apiError);
          setRecordingStatus('⚠️ Offline: Sending SMS fallback...');
          const isSmsAvailable = await SMS.isAvailableAsync();
          if (isSmsAvailable) {
            try {
              // Fetch emergency contacts from local storage or Firestore
              const contactsResponse = await apiGet(`/contacts/${uid}`);
              const emergencyContacts = contactsResponse?.contacts || [];
              
              // Filter for family and trusted contacts (highest priority)
              const priorityContacts = emergencyContacts
                .filter((c: any) => ['family', 'trusted'].includes(c.type))
                .map((c: any) => c.phone);
              
              if (priorityContacts.length > 0) {
                let msg = '🚨 EMERGENCY SOS 🚨 I need help immediately.';
                if (locationObj) {
                  msg += ` My location: https://maps.google.com/?q=${locationObj.coords.latitude},${locationObj.coords.longitude}`;
                }
                await SMS.sendSMSAsync(priorityContacts, msg);
                setRecordingStatus(`✅ Offline SMS sent to ${priorityContacts.length} contact(s).`);
              } else {
                setRecordingStatus('❌ No emergency contacts found. Please add contacts in the Contacts tab.');
              }
            } catch (contactError) {
              console.log('[Offline Fallback] Failed to fetch contacts:', contactError);
              setRecordingStatus('❌ Offline: Could not retrieve emergency contacts.');
            }
          } else {
            setRecordingStatus('❌ Offline: SMS not available.');
          }
        }

        onEvidenceUploaded();

        if (!mountedRef.current) return;
        statusTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) setRecordingStatus('');
        }, 4000);
      }, 10000);

    } catch (err) {
      console.log('Firebase/Audio Error:', err);
      setRecordingStatus('❌ Error saving evidence');
    }
  }, [sosActive, audioRecorder, onEvidenceUploaded]);

  const cleanup = useCallback(() => {
    mountedRef.current = false;
    if (sosTimeoutRef.current) clearTimeout(sosTimeoutRef.current);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
  }, []);

  return {
    sosActive,
    recordingStatus,
    triggerSOS,
    cleanup
  };
}
