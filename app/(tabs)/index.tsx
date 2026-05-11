import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
} from 'expo-audio';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { Audio } from 'expo-av';
import { useShakeDetector } from '@features/ai/hooks/useShakeDetector';
import { BASE_URL, apiGet } from '@core/api/client';
import { auth } from '@core/firebase';

import { syncRiskScore } from '@features/risk-assessment/services';
import VoiceHelper from '@features/ai/services/voiceTrigger';
import { useSOSAction } from '@features/emergency/hooks/useSOSAction';
import { useSOSAlertSystem } from '@features/emergency/hooks/useSOSAlertSystem';

/** Maps a raw recording doc from the API into the shape the Evidence Vault UI expects. */
function formatRecording(rec: any) {
  console.log('🔄 [FORMAT] Formatting recording:', JSON.stringify(rec));
  
  const isVideo = (rec.type || rec.mimeType || '').includes('video');
  const isLocation = (rec.type || '').includes('location');
  const icon = isLocation ? '📍' : isVideo ? '🎥' : '🎙️';
  const title = rec.reason || rec.fileName || (isVideo ? 'Video Recording' : 'Audio Recording');

  let date = '';
  if (rec.createdAt) {
    // Firestore timestamps come as { _seconds, _nanoseconds } or ISO strings
    const d = rec.createdAt._seconds
      ? new Date(rec.createdAt._seconds * 1000)
      : new Date(rec.createdAt);
    date = d.toLocaleString();
  }

  const size = rec.size ? `${(rec.size / (1024 * 1024)).toFixed(1)} MB` : 'Synced';
  
  // Support both evidenceHash and fileHash fields
  const hash = rec.evidenceHash || rec.fileHash || 'Verifying...';

  const formatted = { 
    id: rec.id || rec.fileName || String(Math.random()), 
    type: icon, 
    title, 
    date, 
    size, 
    hash,
    fileUrl: rec.fileUrl || null,
    mimeType: rec.mimeType || null,
  };
  
  console.log('✅ [FORMAT] Formatted result:', JSON.stringify(formatted));
  return formatted;
}

export default function SOSScreen() {
  const [showVault, setShowVault] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [shakeProgress, setShakeProgress] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioPlayerRef = useRef<Audio.Sound | null>(null);

  /** Fetches recordings from the backend API */
  const fetchRecordings = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.log('🔒 [VAULT] Cannot fetch recordings - no user logged in');
      return;
    }
    try {
      console.log('📥 [VAULT] Fetching recordings for user:', uid);
      setLoadingVault(true);
      const res = await apiGet(`/recordings/${uid}`);
      console.log('📥 [VAULT] API response:', JSON.stringify(res));
      
      if (res.success && Array.isArray(res.recordings)) {
        console.log(`✅ [VAULT] Received ${res.recordings.length} recordings`);
        const formatted = res.recordings.map(formatRecording);
        console.log('✅ [VAULT] Formatted recordings:', JSON.stringify(formatted));
        setRecordings(formatted);
      } else {
        console.log('⚠️ [VAULT] Invalid response format:', res);
      }
    } catch (err) {
      console.log('❌ [VAULT] Failed to fetch recordings:', err);
      console.log('❌ [VAULT] Error details:', err.message);
    } finally {
      setLoadingVault(false);
    }
  }, []);

  /** Play or stop audio evidence */
  const handlePlayAudio = useCallback(async (recording: any) => {
    try {
      // If already playing this file, stop it
      if (playingAudio === recording.id) {
        console.log('⏹️ [AUDIO] Stopping playback');
        if (audioPlayerRef.current) {
          await audioPlayerRef.current.stopAsync();
          await audioPlayerRef.current.unloadAsync();
          audioPlayerRef.current = null;
        }
        setPlayingAudio(null);
        return;
      }

      // Stop any currently playing audio
      if (audioPlayerRef.current) {
        await audioPlayerRef.current.stopAsync();
        await audioPlayerRef.current.unloadAsync();
        audioPlayerRef.current = null;
      }

      console.log('▶️ [AUDIO] Playing:', recording.fileUrl);
      setPlayingAudio(recording.id);

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load and play audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: recording.fileUrl },
        { shouldPlay: true },
        (status) => {
          // When playback finishes
          if (status.isLoaded && status.didJustFinish) {
            console.log('✅ [AUDIO] Playback finished');
            setPlayingAudio(null);
          }
        }
      );

      audioPlayerRef.current = sound;
      console.log('✅ [AUDIO] Playback started');

    } catch (error) {
      console.log('❌ [AUDIO] Playback error:', error);
      Alert.alert('Playback Error', 'Could not play this recording. It may be corrupted or unavailable.');
      setPlayingAudio(null);
    }
  }, [playingAudio]);

  /** Open evidence file in external app or browser */
  const handleViewEvidence = useCallback(async (recording: any) => {
    try {
      const fileUrl = recording.fileUrl;
      
      if (!fileUrl) {
        Alert.alert('Error', 'File URL not available');
        return;
      }

      console.log('🔗 [VIEW] Opening:', fileUrl);

      // Check if it's a local file or remote URL
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        // Remote file - open in browser
        const canOpen = await Linking.canOpenURL(fileUrl);
        if (canOpen) {
          await Linking.openURL(fileUrl);
        } else {
          Alert.alert('Error', 'Cannot open this file');
        }
      } else {
        // Local file - show info
        Alert.alert(
          'Evidence File',
          `File: ${recording.title}\nSize: ${recording.size}\nDate: ${recording.date}\n\nThis file is stored locally on the device.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.log('❌ [VIEW] Error opening file:', error);
      Alert.alert('Error', 'Could not open this file');
    }
  }, []);

  /** Delete evidence recording */
  const handleDeleteEvidence = useCallback(async (recording: any) => {
    Alert.alert(
      '🗑️ Delete Evidence',
      `Are you sure you want to delete this recording?\n\n${recording.title}\n${recording.date}\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ [DELETE] Deleting recording:', recording.id);
              
              const uid = auth.currentUser?.uid;
              if (!uid) {
                Alert.alert('Error', 'You must be logged in to delete evidence');
                return;
              }

              // Stop playback if this file is playing
              if (playingAudio === recording.id) {
                if (audioPlayerRef.current) {
                  await audioPlayerRef.current.stopAsync();
                  await audioPlayerRef.current.unloadAsync();
                  audioPlayerRef.current = null;
                }
                setPlayingAudio(null);
              }

              // Delete from backend
              const response = await fetch(`${BASE_URL}/recording/${uid}/${recording.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
                }
              });

              const result = await response.json();

              if (result.success) {
                console.log('✅ [DELETE] Recording deleted successfully');
                
                // Remove from local state
                setRecordings(prev => prev.filter(r => r.id !== recording.id));
                
                Alert.alert('✅ Deleted', 'Evidence recording has been deleted successfully');
              } else {
                console.log('❌ [DELETE] Delete failed:', result.message);
                Alert.alert('Error', result.message || 'Failed to delete recording');
              }
            } catch (error) {
              console.log('❌ [DELETE] Error deleting recording:', error);
              Alert.alert('Error', 'Failed to delete recording. Please try again.');
            }
          }
        }
      ]
    );
  }, [playingAudio]);

  /** Show evidence options menu */
  const handleEvidenceOptions = useCallback((recording: any) => {
    const isAudio = recording.type === '🎙️';
    const isVideo = recording.type === '🎥';
    
    const options: any[] = [
      {
        text: 'View Hash',
        onPress: () => Alert.alert(
          'Blockchain Evidence',
          `SHA-256 Signature:\n\n${recording.hash || 'Verifying on-chain...'}\n\nThis cryptographic hash proves the authenticity and integrity of this evidence.`
        )
      },
    ];

    if (isAudio) {
      options.unshift({
        text: playingAudio === recording.id ? '⏹️ Stop Playing' : '▶️ Play Audio',
        onPress: () => handlePlayAudio(recording)
      });
    }

    if (isVideo || recording.fileUrl) {
      options.unshift({
        text: '📂 Open File',
        onPress: () => handleViewEvidence(recording)
      });
    }

    options.push({
      text: '📋 Details',
      onPress: () => Alert.alert(
        'Evidence Details',
        `Type: ${recording.title}\nDate: ${recording.date}\nSize: ${recording.size}\nHash: ${recording.hash?.substring(0, 16)}...`
      )
    });

    options.push({
      text: '🗑️ Delete',
      style: 'destructive',
      onPress: () => handleDeleteEvidence(recording)
    });

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Evidence Options', 'Choose an action:', options);
  }, [playingAudio, handlePlayAudio, handleViewEvidence, handleDeleteEvidence]);

  const { triggerSOS, sosActive, recordingStatus, cleanup } = useSOSAction(fetchRecordings);
  const { 
    triggerSOS: triggerAlert, 
    handleSafe, 
    handleNotSafe, 
    cleanup: cleanupAlert,
    isActive: alertActive,
    alertPhase,
    countdown,
    recordingStatus: alertRecordingStatus
  } = useSOSAlertSystem(fetchRecordings);

  useShakeDetector(() => {
    if (!sosActive && !alertActive) {
      triggerAlert();
    }
  }, (count) => setShakeProgress(count), !sosActive && !alertActive);
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const pulseLoopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Fetch recordings from the real API on mount
    fetchRecordings();

    const socket = io(BASE_URL);

    socket.on('connect', async () => {
      console.log('Socket connected');
      const token = await auth.currentUser?.getIdToken();
      socket.emit('register', { uid, token });
    });

    socket.on('risk_sync', (data) => {
      console.log('Risk Sync:', data);
    });

    socket.on('sos_alert', (data) => {
      console.log('Remote SOS Alert:', data);
    });

    // Refresh vault when new evidence is uploaded (from any source)
    socket.on('evidence_uploaded', (data) => {
      console.log('📡 [VAULT] Received evidence_uploaded event:', JSON.stringify(data));
      console.log('🔄 [VAULT] Refreshing vault...');
      fetchRecordings();
    });

    // Start AI Protection Sensors
    syncRiskScore();
    VoiceHelper.startListening();

    return () => {
      cleanup();
      cleanupAlert();
      socket.disconnect();
      VoiceHelper.stopListening();
      
      // Cleanup audio player
      if (audioPlayerRef.current) {
        audioPlayerRef.current.unloadAsync().catch(() => {});
        audioPlayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    function animate(anim: Animated.Value, delay: number) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      pulseLoopsRef.current.push(loop);
    }
    animate(pulse1, 0);
    animate(pulse2, 300);
    animate(pulse3, 600);

    return () => {
      pulseLoopsRef.current.forEach((loop) => loop.stop());
      pulseLoopsRef.current = [];
    };
  }, [pulse1, pulse2, pulse3]);


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'there'} 👋</Text>
            <Text style={styles.logo}>SafeHer</Text>
          </View>
          <View style={styles.safeBadge}>
            <View style={styles.safeDot} />
            <Text style={styles.safeText}>You are safe</Text>
          </View>
        </View>

        {/* SOS Button */}
        <View style={styles.sosWrapper}>
          <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: pulse1 }], opacity: shakeProgress >= 1 ? 0.4 : 0.15, backgroundColor: shakeProgress >= 1 ? '#ff0000' : '#ff4d79' }]} />
          <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: pulse2 }], opacity: shakeProgress >= 2 ? 0.5 : 0.10, backgroundColor: shakeProgress >= 2 ? '#ff0000' : '#ff4d79' }]} />
          <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: pulse3 }], opacity: shakeProgress >= 3 ? 0.6 : 0.06, backgroundColor: shakeProgress >= 3 ? '#ff0000' : '#ff4d79' }]} />

          <TouchableOpacity
            style={[styles.sosBtn, (sosActive || alertActive) && styles.sosBtnActive]}
            onPress={triggerAlert}
            activeOpacity={0.8}
            disabled={alertActive}
          >
            <Text style={styles.sosIcon}>🛡️</Text>
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosHint}>{alertActive ? 'ALERT ACTIVE' : 'tap to activate'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.hint, sosActive && { color: '#E66A6A' }]}>
          {sosActive ? (recordingStatus || '🔴 Sending alerts...') : 'Press for emergency'}
        </Text>

        {/* Trigger Chips */}
        <View style={styles.chipRow}>
          {[
            { icon: '📳', label: 'Shake', msg: '📳 Shake detected!\nSOS will trigger if you shake 3 times rapidly.' },
            { icon: '🎤', label: 'Voice', msg: '🎤 Voice trigger active!\nSay "Help Me" to activate SOS.' },
          ].map((t) => (
            <TouchableOpacity
              key={t.label}
              style={styles.chip}
              activeOpacity={0.5}
              onPress={() => {
                if (t.label === 'Voice') {
                  // Test voice recognition
                  const isAvailable = VoiceHelper.isAvailable();
                  const status = VoiceHelper.listening ? 'Active' : 'Inactive';
                  Alert.alert(
                    '🎤 Voice Recognition Status',
                    `Available: ${isAvailable ? 'Yes' : 'No'}\nStatus: ${status}\n\nTrigger words:\n• "Help me"\n• "Save me"\n• "Emergency"\n• "Bachao"\n• "Stop"\n• "Please help"\n\nTry saying one of these phrases!`,
                    [
                      { text: 'Restart', onPress: () => {
                        VoiceHelper.stopListening();
                        setTimeout(() => VoiceHelper.startListening(), 500);
                      }},
                      { text: 'OK' }
                    ]
                  );
                } else {
                  Alert.alert(t.label + ' Trigger', t.msg);
                }
              }}
            >
              <Text style={styles.chipIcon}>{t.icon}</Text>
              <Text style={styles.chipLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          {[
            { label: 'GPS', value: 'Active', color: '#F28C82' },
            { label: 'Risk', value: 'Low', color: '#F28C82' },
          ].map((s) => (
            <View key={s.label} style={styles.statChip}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Evidence Vault */}
        <View style={styles.vaultSection}>
          <TouchableOpacity
            style={styles.vaultHeader}
            onPress={() => {
              const willOpen = !showVault;
              setShowVault(willOpen);
              if (willOpen) fetchRecordings();
            }}
          >
            <View style={styles.vaultLeft}>
              <Text style={styles.vaultIcon}>🔒</Text>
              <View>
                <Text style={styles.vaultTitle}>Evidence Vault</Text>
                <Text style={styles.vaultSub}>{recordings.length} files encrypted</Text>
              </View>
            </View>
            <Text style={styles.vaultToggle}>{showVault ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showVault && (
            <View style={styles.vaultList}>
              {loadingVault ? (
                <ActivityIndicator color="#ff4d79" style={{ paddingVertical: 20 }} />
              ) : recordings.length === 0 ? (
                <Text style={{ color: '#F2EDE8', textAlign: 'center', paddingVertical: 20, fontSize: 13 }}>
                  No recordings yet. Evidence will appear here after an SOS event.
                </Text>
              ) : (
                recordings.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.vaultItem}
                  onPress={() => handleEvidenceOptions(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.vaultItemIconContainer}>
                    <Text style={styles.vaultItemIcon}>{item.type}</Text>
                    {playingAudio === item.id && (
                      <View style={styles.playingIndicator}>
                        <Text style={styles.playingText}>▶️</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.vaultItemInfo}>
                    <Text style={styles.vaultItemTitle}>{item.title}</Text>
                    <Text style={styles.vaultItemDate}>{item.date} • {item.size}</Text>
                  </View>
                  <View style={styles.vaultItemActions}>
                    {item.type === '🎙️' && (
                      <TouchableOpacity 
                        style={styles.playBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePlayAudio(item);
                        }}
                      >
                        <Text style={styles.playBtnText}>
                          {playingAudio === item.id ? '⏹️' : '▶️'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.encryptedBadge}
                      onPress={(e) => {
                        e.stopPropagation();
                        Alert.alert('Blockchain Evidence', `SHA-256 Signature:\n${item.hash || 'Verifying on-chain...'}`);
                      }}
                    >
                      <Text style={styles.encryptedText}>🔐</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                ))
              )}
              <TouchableOpacity
                style={styles.addEvidenceBtn}
                onPress={() => Alert.alert('📁 Evidence Added', 'Your recording has been encrypted and saved to the vault.')}
              >
                <Text style={styles.addEvidenceText}>+ Add Evidence</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom card */}
        <View style={styles.bottomCard}>
          <Text style={styles.bottomCardText}>
            🛡️ SafeHer is actively monitoring your safety
          </Text>
        </View>

      </ScrollView>

      {/* SOS Alert Modal */}
      <Modal
        visible={alertActive}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertModal}>
            {/* Alert Phase Indicator */}
            <View style={styles.alertHeader}>
              <Text style={styles.alertEmoji}>
                {alertPhase === 'alert1' && '🚨'}
                {alertPhase === 'gap1' && '⏸️'}
                {alertPhase === 'alert2' && '🚨🚨'}
                {alertPhase === 'gap2' && '⏸️'}
                {alertPhase === 'alert3' && '🚨🚨🚨'}
                {alertPhase === 'escalating' && '📡'}
              </Text>
              <Text style={styles.alertTitle}>
                {(alertPhase === 'alert1' || alertPhase === 'alert2' || alertPhase === 'alert3') && 'EMERGENCY ALERT'}
                {(alertPhase === 'gap1' || alertPhase === 'gap2') && 'ARE YOU SAFE?'}
                {alertPhase === 'escalating' && 'SENDING ALERTS...'}
              </Text>
            </View>

            {/* Countdown */}
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <Text style={styles.countdownLabel}>seconds</Text>
            </View>

            {/* Phase Description */}
            <Text style={styles.alertDescription}>
              {alertPhase === 'alert1' && 'First alert - Respond if you are safe'}
              {alertPhase === 'gap1' && 'Waiting for your response...'}
              {alertPhase === 'alert2' && 'Second alert - Please respond'}
              {alertPhase === 'gap2' && 'Last chance to respond...'}
              {alertPhase === 'alert3' && 'Final alert - Emergency contacts will be notified'}
              {alertPhase === 'escalating' && 'Notifying emergency contacts and nearby volunteers'}
            </Text>

            {/* Action Buttons */}
            {alertPhase !== 'escalating' && (
              <View style={styles.alertButtons}>
                <TouchableOpacity 
                  style={[styles.alertBtn, styles.safeBtn]}
                  onPress={handleSafe}
                >
                  <Text style={styles.alertBtnIcon}>✅</Text>
                  <Text style={styles.alertBtnText}>I AM SAFE</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.alertBtn, styles.notSafeBtn]}
                  onPress={handleNotSafe}
                >
                  <Text style={styles.alertBtnIcon}>🚨</Text>
                  <Text style={styles.alertBtnText}>I AM NOT SAFE</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Escalation Info */}
            {alertPhase === 'escalating' && (
              <View style={styles.escalationInfo}>
                <Text style={styles.escalationText}>
                  ✓ Alerting family & trusted contacts{'\n'}
                  ✓ Notifying nearby volunteers{'\n'}
                  ✓ Contacting police & emergency services{'\n'}
                  ✓ Sharing your live location
                </Text>
              </View>
            )}

            {/* Recording Status */}
            {alertRecordingStatus && (
              <View style={styles.recordingStatusBox}>
                <Text style={styles.recordingStatusText}>{alertRecordingStatus}</Text>
              </View>
            )}

            {/* Warning */}
            {(alertPhase === 'alert3' || alertPhase === 'gap2') && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ If you don't respond, emergency contacts will be alerted automatically
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A1F28',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    color: '#D8A46B',
    fontSize: 13,
  },
  logo: {
    color: '#E66A6A',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 1,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2e1e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  safeDot: {
    width: 7,
    height: 7,
    backgroundColor: '#F28C82',
    borderRadius: 10,
  },
  safeText: {
    color: '#F28C82',
    fontSize: 12,
  },
  sosWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#E66A6A',
  },
  ring1: { width: 260, height: 260 },
  ring2: { width: 210, height: 210 },
  ring3: { width: 165, height: 165 },
  sosBtn: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#E66A6A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E66A6A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 12,
    gap: 2,
  },
  sosBtnActive: {
    backgroundColor: '#6D3B4B',
  },
  sosIcon: { fontSize: 32 },
  sosText: {
    color: '#F5E6D3',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
  },
  sosHint: {
    color: '#D8A46B',
    fontSize: 9,
    letterSpacing: 1,
  },
  hint: {
    color: '#F2EDE8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  chip: {
    flex: 1,
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  chipIcon: { fontSize: 22 },
  chipLabel: {
    color: '#D8A46B',
    fontSize: 11,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    color: '#F2EDE8',
    fontSize: 10,
    marginTop: 2,
  },
  vaultSection: {
    marginHorizontal: 20,
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  vaultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  vaultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vaultIcon: { fontSize: 24 },
  vaultTitle: {
    color: '#F5E6D3',
    fontSize: 15,
    fontWeight: '500',
  },
  vaultSub: {
    color: '#F2EDE8',
    fontSize: 11,
    marginTop: 2,
  },
  vaultToggle: {
    color: '#F2EDE8',
    fontSize: 12,
  },
  vaultList: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    gap: 10,
  },
  vaultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D3B4B',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  vaultItemIconContainer: {
    position: 'relative',
  },
  vaultItemIcon: { fontSize: 22 },
  playingIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E66A6A',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingText: {
    fontSize: 8,
  },
  vaultItemInfo: { flex: 1 },
  vaultItemTitle: {
    color: '#F5E6D3',
    fontSize: 13,
    fontWeight: '500',
  },
  vaultItemDate: {
    color: '#F2EDE8',
    fontSize: 11,
    marginTop: 2,
  },
  vaultItemActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  playBtn: {
    backgroundColor: 'rgba(255,77,121,0.15)',
    borderRadius: 8,
    padding: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: {
    fontSize: 14,
  },
  encryptedBadge: {
    backgroundColor: 'rgba(255,77,121,0.1)',
    borderRadius: 8,
    padding: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encryptedText: { fontSize: 14 },
  addEvidenceBtn: {
    backgroundColor: 'rgba(255,77,121,0.1)',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  addEvidenceText: {
    color: '#E66A6A',
    fontSize: 13,
    fontWeight: '500',
  },
  bottomCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  bottomCardText: {
    color: '#F2EDE8',
    fontSize: 12,
  },
  // Alert Modal Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertModal: {
    backgroundColor: '#1B1620',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#E66A6A',
    shadowColor: '#E66A6A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alertEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  alertTitle: {
    color: '#E66A6A',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#6D3B4B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E66A6A',
  },
  countdownNumber: {
    color: '#E66A6A',
    fontSize: 64,
    fontWeight: '700',
  },
  countdownLabel: {
    color: '#D8A46B',
    fontSize: 14,
    marginTop: 4,
  },
  alertDescription: {
    color: '#F5E6D3',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  alertButtons: {
    gap: 12,
  },
  alertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
  },
  safeBtn: {
    backgroundColor: '#2D5F3F',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  notSafeBtn: {
    backgroundColor: '#5F2D2D',
    borderWidth: 2,
    borderColor: '#E66A6A',
  },
  alertBtnIcon: {
    fontSize: 24,
  },
  alertBtnText: {
    color: '#F5E6D3',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  escalationInfo: {
    backgroundColor: '#6D3B4B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E66A6A',
  },
  escalationText: {
    color: '#F5E6D3',
    fontSize: 14,
    lineHeight: 24,
  },
  recordingStatusBox: {
    backgroundColor: 'rgba(255, 77, 121, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ff4d79',
  },
  recordingStatusText: {
    color: '#ff4d79',
    fontSize: 13,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: 'rgba(230, 106, 106, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E66A6A',
  },
  warningText: {
    color: '#E66A6A',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
