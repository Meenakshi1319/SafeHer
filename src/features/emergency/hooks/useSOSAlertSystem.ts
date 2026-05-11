import { useState, useRef, useCallback } from 'react';
import { Alert, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { apiPost, apiGet } from '@core/api/client';
import { auth } from '@core/firebase';
import { BASE_URL } from '@core/api/client';

type AlertPhase = 'idle' | 'alert1' | 'gap1' | 'alert2' | 'gap2' | 'alert3' | 'escalating';

export function useSOSAlertSystem(onEvidenceUploaded?: () => void) {
  const [alertPhase, setAlertPhase] = useState<AlertPhase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const phaseStartTimeRef = useRef<number>(0);
  const audioRecorderRef = useRef<Audio.Recording | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Start evidence recording (audio + location)
  const startEvidenceRecording = useCallback(async () => {
    try {
      setRecordingStatus('🔴 Recording evidence...');
      
      console.log('🎤 [RECORD] Requesting microphone permission...');
      
      // Request microphone permission
      const { status } = await Audio.requestPermissionsAsync();
      console.log('🎤 [RECORD] Permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ [RECORD] Microphone permission denied');
        setRecordingStatus('⚠️ Microphone permission denied');
        Alert.alert(
          'Microphone Permission Required',
          'SafeHer needs microphone access to record evidence during emergencies. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('⚙️ [RECORD] Setting audio mode...');
      
      // Set audio mode for BOTH recording and playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true, // Allow other audio to play
        playThroughEarpieceAndroid: false,
      });

      console.log('🎙️ [RECORD] Creating recording instance...');
      
      // Start recording with high quality settings
      const recording = new Audio.Recording();
      
      const recordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };
      
      console.log('🎙️ [RECORD] Recording options:', JSON.stringify(recordingOptions));
      
      await recording.prepareToRecordAsync(recordingOptions);
      console.log('🎙️ [RECORD] Recording prepared');
      
      await recording.startAsync();
      console.log('🎙️ [RECORD] Recording started');
      
      audioRecorderRef.current = recording;
      recordingStartTimeRef.current = Date.now();
      
      // Check recording status after 1 second
      setTimeout(async () => {
        if (audioRecorderRef.current) {
          const status = await audioRecorderRef.current.getStatusAsync();
          console.log('📊 [RECORD] Recording status after 1s:', JSON.stringify(status));
          
          if (status.isRecording) {
            console.log('✅ [RECORD] Recording is active');
            if (status.metering !== undefined) {
              console.log('📊 [RECORD] Audio level:', status.metering);
            }
          } else {
            console.log('⚠️ [RECORD] Recording is NOT active!');
          }
        }
      }, 1000);
      
      console.log('✅ [RECORD] Evidence recording started successfully');
      setRecordingStatus('🔴 Recording audio evidence...');
    } catch (error: any) {
      console.log('❌ [RECORD] Recording error:', error);
      console.log('❌ [RECORD] Error name:', error.name);
      console.log('❌ [RECORD] Error message:', error.message);
      console.log('❌ [RECORD] Error stack:', error.stack);
      setRecordingStatus(`❌ Recording failed: ${error.message}`);
      
      Alert.alert(
        'Recording Error',
        `Failed to start recording: ${error.message}\n\nPlease check microphone permissions in Settings.`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Stop and upload evidence recording
  const stopAndUploadEvidence = useCallback(async () => {
    try {
      console.log('🔍 [UPLOAD] Starting stopAndUploadEvidence...');
      
      if (!audioRecorderRef.current) {
        console.log('❌ [UPLOAD] No active recording to stop');
        setRecordingStatus('⚠️ No recording to upload');
        return;
      }

      setRecordingStatus('⏹️ Stopping recording...');
      
      // Get status before stopping
      const statusBefore = await audioRecorderRef.current.getStatusAsync();
      console.log('📊 [UPLOAD] Recording status before stop:', JSON.stringify(statusBefore));
      console.log('📊 [UPLOAD] Was recording:', statusBefore.isRecording);
      console.log('📊 [UPLOAD] Duration recorded (ms):', statusBefore.durationMillis);
      
      if (statusBefore.metering !== undefined) {
        console.log('📊 [UPLOAD] Final audio level:', statusBefore.metering);
      }
      
      // Stop recording
      await audioRecorderRef.current.stopAndUnloadAsync();
      const uri = audioRecorderRef.current.getURI();
      audioRecorderRef.current = null;

      if (!uri) {
        console.log('❌ [UPLOAD] No recording URI available');
        setRecordingStatus('⚠️ No recording available');
        return;
      }

      const recordingDuration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      console.log(`✅ [UPLOAD] Recording stopped. Duration: ${recordingDuration}s, URI: ${uri}`);

      setRecordingStatus('🔐 Hashing evidence...');

      const uid = auth.currentUser?.uid;
      const token = await auth.currentUser?.getIdToken();
      
      console.log(`👤 [UPLOAD] User ID: ${uid}`);
      console.log(`🔑 [UPLOAD] Token available: ${!!token}`);

      if (!uid) {
        console.log('❌ [UPLOAD] No user ID available');
        setRecordingStatus('❌ Not logged in');
        return;
      }

      // Check if file exists and get size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📁 [UPLOAD] File info:', JSON.stringify(fileInfo));
      console.log('📁 [UPLOAD] File exists:', fileInfo.exists);
      console.log('📁 [UPLOAD] File size:', fileInfo.size, 'bytes');
      console.log('📁 [UPLOAD] File size (MB):', (fileInfo.size / (1024 * 1024)).toFixed(2));
      
      if (!fileInfo.exists) {
        console.log('❌ [UPLOAD] Recording file does not exist');
        setRecordingStatus('❌ Recording file not found');
        return;
      }

      if (fileInfo.size === 0) {
        console.log('⚠️ [UPLOAD] WARNING: File size is 0 bytes - recording may be empty!');
        setRecordingStatus('⚠️ Recording appears to be empty');
      }

      // Generate evidence hash
      console.log('🔐 [UPLOAD] Reading file for hashing...');
      const fileBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      console.log('🔐 [UPLOAD] File read, base64 length:', fileBase64.length);
      
      const evidenceHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fileBase64
      );

      console.log('🔐 [UPLOAD] Evidence hash generated:', evidenceHash.substring(0, 16) + '...');
      setRecordingStatus('☁️ Uploading to Evidence Vault...');

      // Upload to backend
      const formData = new FormData();
      formData.append('uid', uid);
      formData.append('type', 'audio');
      formData.append('reason', 'SOS Emergency Recording');
      formData.append('evidenceHash', evidenceHash);
      formData.append('file', {
        uri,
        name: `sos_audio_${Date.now()}.m4a`,
        type: 'audio/m4a',
      } as any);

      console.log('📤 [UPLOAD] Sending to:', `${BASE_URL}/upload-evidence`);
      console.log('📤 [UPLOAD] FormData fields:', {
        uid,
        type: 'audio',
        reason: 'SOS Emergency Recording',
        evidenceHash: evidenceHash.substring(0, 16) + '...',
        fileName: `sos_audio_${Date.now()}.m4a`,
        fileSize: fileInfo.size,
      });

      const response = await fetch(`${BASE_URL}/upload-evidence`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      console.log('📥 [UPLOAD] Response status:', response.status);
      console.log('📥 [UPLOAD] Response ok:', response.ok);

      const result = await response.json();
      console.log('📥 [UPLOAD] Response body:', JSON.stringify(result));

      if (response.ok && result.success) {
        console.log('✅ [UPLOAD] Evidence uploaded successfully!');
        console.log('✅ [UPLOAD] File URL:', result.fileUrl);
        console.log('✅ [UPLOAD] File hash:', result.fileHash);
        setRecordingStatus('✅ Evidence saved to vault');
        
        if (onEvidenceUploaded) {
          console.log('🔄 [UPLOAD] Calling onEvidenceUploaded callback...');
          onEvidenceUploaded();
        } else {
          console.log('⚠️ [UPLOAD] No onEvidenceUploaded callback provided');
        }
      } else {
        console.log('❌ [UPLOAD] Upload failed:', result);
        setRecordingStatus(`❌ Upload failed: ${result.message || 'Unknown error'}`);
      }

      // Clear status after 5 seconds (increased from 3)
      setTimeout(() => {
        setRecordingStatus('');
      }, 5000);

    } catch (error: any) {
      console.log('❌ [UPLOAD] Upload error:', error);
      console.log('❌ [UPLOAD] Error name:', error.name);
      console.log('❌ [UPLOAD] Error message:', error.message);
      console.log('❌ [UPLOAD] Error stack:', error.stack);
      setRecordingStatus(`❌ Upload failed: ${error.message}`);
      
      // Keep error visible longer
      setTimeout(() => {
        setRecordingStatus('');
      }, 10000);
    }
  }, [onEvidenceUploaded]);
  // Load and play loud siren sound
  const playAlertSound = useCallback(async () => {
    try {
      // Don't change audio mode here - it's already set for recording
      // Just load and play the sound
      const { sound } = await Audio.Sound.createAsync(
        require('../../../../assets/siren.ogg'),
        { 
          isLooping: true,
          volume: 1.0,
          shouldPlay: true
        },
        null,
        false // Don't update audio mode
      );
      
      soundRef.current = sound;
      await sound.playAsync();
      
      // Start vibration pattern (1 second on, 0.5 second off)
      Vibration.vibrate([0, 1000, 500], true);
      console.log('🔊 Alert sound and vibration started');
    } catch (error: any) {
      console.log('Error playing alert sound:', error);
      console.log('Error details:', error.message);
    }
  }, []);

  // Stop sound and vibration
  const stopAlertSound = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      Vibration.cancel();
    } catch (error) {
      console.log('Error stopping alert sound:', error);
    }
  }, []);

  // Escalate to emergency contacts
  const escalateToContacts = useCallback(async () => {
    try {
      console.log('🚨 [ESCALATE] Starting escalation...');
      
      const uid = auth.currentUser?.uid;
      if (!uid) {
        console.log('❌ [ESCALATE] No user ID available');
        return;
      }

      console.log('👤 [ESCALATE] User ID:', uid);

      // Get current location
      let location = null;
      try {
        console.log('📍 [ESCALATE] Requesting location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('📍 [ESCALATE] Location permission status:', status);
        
        if (status === 'granted') {
          console.log('📍 [ESCALATE] Getting current position...');
          const loc = await Location.getCurrentPositionAsync({});
          location = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          };
          console.log('📍 [ESCALATE] Location obtained:', location);
        } else {
          console.log('⚠️ [ESCALATE] Location permission not granted');
        }
      } catch (err) {
        console.log('❌ [ESCALATE] Location error:', err);
      }

      // Fetch emergency contacts
      console.log('📋 [ESCALATE] Fetching contacts...');
      const contactsResponse = await apiGet(`/contacts/${uid}`);
      console.log('📋 [ESCALATE] Contacts response:', JSON.stringify(contactsResponse));
      
      const contacts = contactsResponse?.contacts || [];
      console.log(`📋 [ESCALATE] Total contacts: ${contacts.length}`);
      
      // Filter for trusted contacts (family, trusted, volunteer, police)
      const emergencyContacts = contacts.filter((c: any) => 
        ['family', 'trusted', 'volunteer', 'police', 'ngo'].includes(c.type)
      );

      console.log(`👥 [ESCALATE] Emergency contacts: ${emergencyContacts.length}`);
      console.log('👥 [ESCALATE] Contact details:', emergencyContacts.map(c => ({ name: c.name, type: c.type, phone: c.phone })));

      // Trigger SOS with maximum risk score
      console.log('📤 [ESCALATE] Sending trigger-sos request...');
      const sosPayload = {
        uid,
        reason: 'User did not respond to safety check - EMERGENCY',
        riskScore: 100,
        location,
        escalated: true,
        contactCount: emergencyContacts.length
      };
      console.log('📤 [ESCALATE] SOS payload:', JSON.stringify(sosPayload));
      
      const sosResponse = await apiPost('/trigger-sos', sosPayload);
      console.log('📥 [ESCALATE] SOS response:', JSON.stringify(sosResponse));

      console.log('✅ [ESCALATE] Escalation complete');

      Alert.alert(
        '🚨 EMERGENCY ALERT SENT',
        `Alert sent to ${emergencyContacts.length} emergency contacts:\n\n` +
        `✓ Family & Trusted Contacts\n` +
        `✓ Nearby Volunteers\n` +
        `✓ Police & Emergency Services\n\n` +
        `Your location has been shared.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.log('❌ [ESCALATE] Escalation error:', error);
      console.log('❌ [ESCALATE] Error details:', error.message);
      Alert.alert('Error', 'Failed to send emergency alerts. Please call emergency services directly.');
    }
  }, []);

  // Handle "I am safe" button
  const handleSafe = useCallback(async () => {
    console.log('✅ USER CONFIRMED SAFE');
    
    // Stop everything
    await stopAlertSound();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    // Stop and upload evidence recording
    await stopAndUploadEvidence();
    
    setIsActive(false);
    setAlertPhase('idle');
    setCountdown(0);

    Alert.alert(
      '✅ Safety Confirmed',
      'SOS alert cancelled. Evidence has been saved to your vault.',
      [{ text: 'OK' }]
    );
  }, [stopAlertSound, stopAndUploadEvidence]);

  // Handle "I am NOT safe" button
  const handleNotSafe = useCallback(async () => {
    console.log('🚨 USER CONFIRMED NOT SAFE - IMMEDIATE ESCALATION');
    
    // Stop alert sounds
    await stopAlertSound();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    setAlertPhase('escalating');
    
    // Stop and upload evidence recording
    await stopAndUploadEvidence();
    
    // Immediately escalate
    await escalateToContacts();
    
    setIsActive(false);
    setAlertPhase('idle');
    setCountdown(0);
  }, [stopAlertSound, stopAndUploadEvidence, escalateToContacts]);

  // Start countdown for current phase
  const startCountdown = useCallback((seconds: number) => {
    setCountdown(seconds);
    phaseStartTimeRef.current = Date.now();
    
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    countdownRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - phaseStartTimeRef.current) / 1000);
      const remaining = seconds - elapsed;
      
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setCountdown(0);
      } else {
        setCountdown(remaining);
      }
    }, 100);
  }, []);

  // Main SOS alert sequence
  const triggerSOS = useCallback(async () => {
    if (isActive) return;
    
    console.log('🚨 SOS ALERT SEQUENCE STARTED');
    setIsActive(true);
    
    // Start evidence recording immediately
    await startEvidenceRecording();
    
    // Phase 1: First Alert (10 seconds)
    setAlertPhase('alert1');
    startCountdown(10);
    await playAlertSound();
    
    timerRef.current = setTimeout(async () => {
      // Gap 1 (5 seconds)
      await stopAlertSound();
      setAlertPhase('gap1');
      startCountdown(5);
      
      timerRef.current = setTimeout(async () => {
        // Phase 2: Second Alert (10 seconds)
        setAlertPhase('alert2');
        startCountdown(10);
        await playAlertSound();
        
        timerRef.current = setTimeout(async () => {
          // Gap 2 (5 seconds)
          await stopAlertSound();
          setAlertPhase('gap2');
          startCountdown(5);
          
          timerRef.current = setTimeout(async () => {
            // Phase 3: Third Alert (10 seconds)
            setAlertPhase('alert3');
            startCountdown(10);
            await playAlertSound();
            
            timerRef.current = setTimeout(async () => {
              // No response - ESCALATE
              await stopAlertSound();
              setAlertPhase('escalating');
              
              console.log('⚠️ NO RESPONSE - ESCALATING TO EMERGENCY CONTACTS');
              
              // Stop and upload evidence
              await stopAndUploadEvidence();
              
              // Escalate to contacts
              await escalateToContacts();
              
              setIsActive(false);
              setAlertPhase('idle');
              setCountdown(0);
            }, 10000); // After 10 seconds of alert 3
          }, 5000); // After 5 seconds gap
        }, 10000); // After 10 seconds of alert 2
      }, 5000); // After 5 seconds gap
    }, 10000); // After 10 seconds of alert 1
  }, [isActive, startEvidenceRecording, playAlertSound, stopAlertSound, startCountdown, stopAndUploadEvidence, escalateToContacts]);

  // Cleanup
  const cleanup = useCallback(async () => {
    await stopAlertSound();
    if (audioRecorderRef.current) {
      try {
        await audioRecorderRef.current.stopAndUnloadAsync();
        audioRecorderRef.current = null;
      } catch (e) {
        console.log('Cleanup recording error:', e);
      }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsActive(false);
    setAlertPhase('idle');
    setCountdown(0);
    setRecordingStatus('');
  }, [stopAlertSound]);

  return {
    triggerSOS,
    handleSafe,
    handleNotSafe,
    cleanup,
    isActive,
    alertPhase,
    countdown,
    recordingStatus
  };
}
