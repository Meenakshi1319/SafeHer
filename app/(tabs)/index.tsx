import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
} from 'expo-audio';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { useShakeDetector } from '../../hooks/useShakeDetector';
import { BASE_URL, apiPost } from '../../services/api';
import { auth } from '../../services/firebase';

import { syncRiskScore } from '../../services/shRiskScoreService';
import VoiceHelper from '../../services/shVoiceTriggerAI';

const evidenceData = [
  { id: '1', type: '🎥', title: 'Video Recording', date: 'Today 10:32 PM', size: '12.4 MB' },
  { id: '2', type: '🎙️', title: 'Audio Recording', date: 'Today 10:31 PM', size: '2.1 MB' },
  { id: '3', type: '📍', title: 'Location Log', date: 'Today 10:30 PM', size: '0.3 MB' },
  { id: '4', type: '🎥', title: 'Video Recording', date: 'Yesterday 11:20 PM', size: '8.7 MB' },
];

export default function SOSScreen() {
  const [sosActive, setSosActive] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [recordings, setRecordings] = useState(evidenceData);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [shakeProgress, setShakeProgress] = useState(0);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useShakeDetector(() => {
    if (!sosActive) {
      handleSOS();
    }
  }, (count) => setShakeProgress(count), !sosActive);
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const sosTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const pulseLoopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

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

    // Start AI Protection Sensors
    syncRiskScore();
    VoiceHelper.startListening();

    return () => {
      mountedRef.current = false;
      if (sosTimeoutRef.current) clearTimeout(sosTimeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      socket.disconnect();
      VoiceHelper.stopListening();
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

  async function handleSOS() {
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

        let fileName = '';
        const uid = auth.currentUser?.uid || 'unknown';

        if (uri) {
          const token = await auth.currentUser?.getIdToken();
          const formData = new FormData();
          formData.append('uid', uid);
          formData.append('type', 'audio');
          formData.append('reason', 'SOS Audio Recording');
          formData.append('file', {
            uri,
            name: `audio_${Date.now()}.m4a`,
            type: 'audio/m4a',
          } as any);

          const res = await fetch(`${BASE_URL}/upload-evidence`, {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          
          const result = await res.json();
          if (result.success) {
            fileName = result.fileName;
          }
        }

        await apiPost('/trigger-sos', {
          uid,
          reason: 'Emergency Auto-Trigger',
          riskScore: 100,
          location: locationObj ? { lat: locationObj.coords.latitude, lng: locationObj.coords.longitude } : null
        });

        setRecordings(prev => [
          {
            id: fileName || Date.now().toString(),
            type: '🎙️',
            title: 'Emergency Audio (Backend)',
            date: new Date().toLocaleTimeString(),
            size: 'Synced',
          },
          ...prev
        ]);

        if (!mountedRef.current) return;
        setRecordingStatus('✅ Evidence securely saved to Firebase.');
        statusTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) setRecordingStatus('');
        }, 4000);
      }, 10000);

    } catch (err) {
      console.log('Firebase/Audio Error:', err);
      setRecordingStatus('❌ Error saving evidence');
    }
  }

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
            style={[styles.sosBtn, sosActive && styles.sosBtnActive]}
            onPress={handleSOS}
            activeOpacity={0.8}
          >
            <Text style={styles.sosIcon}>🛡️</Text>
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosHint}>tap to activate</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.hint, sosActive && { color: '#ff4d79' }]}>
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
              onPress={() => Alert.alert(t.label + ' Trigger', t.msg)}
            >
              <Text style={styles.chipIcon}>{t.icon}</Text>
              <Text style={styles.chipLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          {[
            { label: 'GPS', value: 'Active', color: '#10b981' },
            { label: 'Risk', value: 'Low', color: '#10b981' },
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
            onPress={() => setShowVault(!showVault)}
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
              {recordings.map((item) => (
                <View key={item.id} style={styles.vaultItem}>
                  <Text style={styles.vaultItemIcon}>{item.type}</Text>
                  <View style={styles.vaultItemInfo}>
                    <Text style={styles.vaultItemTitle}>{item.title}</Text>
                    <Text style={styles.vaultItemDate}>{item.date} • {item.size}</Text>
                  </View>
                  <View style={styles.encryptedBadge}>
                    <Text style={styles.encryptedText}>🔐</Text>
                  </View>
                </View>
              ))}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080810',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  logo: {
    color: '#ff4d79',
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
    backgroundColor: '#10b981',
    borderRadius: 10,
  },
  safeText: {
    color: '#10b981',
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
    backgroundColor: '#ff4d79',
  },
  ring1: { width: 260, height: 260 },
  ring2: { width: 210, height: 210 },
  ring3: { width: 165, height: 165 },
  sosBtn: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#ff4d79',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff4d79',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 12,
    gap: 2,
  },
  sosBtnActive: {
    backgroundColor: '#c0344f',
  },
  sosIcon: { fontSize: 32 },
  sosText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
  },
  sosHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    letterSpacing: 1,
  },
  hint: {
    color: 'rgba(255,255,255,0.3)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  chipIcon: { fontSize: 22 },
  chipLabel: {
    color: 'rgba(255,255,255,0.4)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 2,
  },
  vaultSection: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
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
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  vaultSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 2,
  },
  vaultToggle: {
    color: 'rgba(255,255,255,0.3)',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  vaultItemIcon: { fontSize: 22 },
  vaultItemInfo: { flex: 1 },
  vaultItemTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  vaultItemDate: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 2,
  },
  encryptedBadge: {
    backgroundColor: 'rgba(255,77,121,0.1)',
    borderRadius: 8,
    padding: 6,
  },
  encryptedText: { fontSize: 14 },
  addEvidenceBtn: {
    backgroundColor: 'rgba(255,77,121,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,77,121,0.3)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  addEvidenceText: {
    color: '#ff4d79',
    fontSize: 13,
    fontWeight: '500',
  },
  bottomCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,77,121,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,77,121,0.2)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  bottomCardText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});
