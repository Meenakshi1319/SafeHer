import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '@core/api/client';
import { auth } from '@core/firebase';

const PRESET_DURATIONS = [5, 10, 15, 20, 30, 45, 60];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CheckInScreen() {
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSecondsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function triggerAutoSOS() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      let location = null;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }

      await apiPost('/trigger-sos', {
        uid,
        reason: 'Check-in timer expired',
        riskScore: 100,
        location,
      });
    } catch (err) {
      console.log('Auto SOS error:', err);
    }
  }

  function startTimer() {
    const totalSeconds = selectedMinutes * 60;
    totalSecondsRef.current = totalSeconds;
    setSecondsLeft(totalSeconds);
    setIsRunning(true);
    setTimerExpired(false);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsRunning(false);
          setTimerExpired(true);
          Vibration.vibrate([0, 500, 200, 500]);
          triggerAutoSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleImSafe() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setSecondsLeft(null);
    setTimerExpired(false);
    Alert.alert('✅ Checked In', "You're safe! Timer has been stopped.");
  }

  function handleCancel() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setSecondsLeft(null);
    setTimerExpired(false);
  }

  function handleReset() {
    setTimerExpired(false);
    setSecondsLeft(null);
    setIsRunning(false);
  }

  const progressPercent =
    isRunning && secondsLeft !== null && totalSecondsRef.current > 0
      ? (secondsLeft / totalSecondsRef.current) * 100
      : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Check-In Timer</Text>
          <Text style={styles.subtitle}>Auto-SOS if you don{"'"}t check in</Text>
        </View>

        {/* Status Card */}
        {timerExpired ? (
          <View style={styles.expiredCard}>
            <Text style={styles.expiredIcon}>⚠️</Text>
            <Text style={styles.expiredTitle}>Timer Expired</Text>
            <Text style={styles.expiredSub}>SOS has been sent automatically</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        ) : isRunning && secondsLeft !== null ? (
          <View style={styles.card}>
            <Text style={styles.timerActiveLabel}>TIMER ACTIVE</Text>
            <Text style={styles.countdown}>{formatTime(secondsLeft)}</Text>
            <Text style={styles.timerHint}>SOS triggers when this reaches 00:00</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelText}>0:00</Text>
              <Text style={styles.progressLabelText}>{selectedMinutes}m</Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.idleTitle}>Set your check-in time</Text>
            <Text style={styles.idleSub}>
              If you don{"'"}t tap {"\"I'm Safe\""} before the timer ends, SOS will trigger automatically.
            </Text>
            <View style={styles.chipsRow}>
              {PRESET_DURATIONS.map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[styles.chip, selectedMinutes === min && styles.chipSelected]}
                  onPress={() => setSelectedMinutes(min)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, selectedMinutes === min && styles.chipTextSelected]}>
                    {min}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {!timerExpired && (
          <View style={styles.actions}>
            {isRunning ? (
              <>
                <TouchableOpacity style={styles.safeBtn} onPress={handleImSafe} activeOpacity={0.85}>
                  <Text style={styles.safeBtnIcon}>✅</Text>
                  <Text style={styles.safeBtnText}>I{"'"}m Safe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>Cancel Timer</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.startBtn} onPress={startTimer} activeOpacity={0.85}>
                <Text style={styles.startBtnText}>Start Timer ({selectedMinutes}m)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            🛡️ Your location will be shared with emergency contacts if the timer expires.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { color: 'white', fontSize: 26, fontWeight: '700', letterSpacing: 0.3 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  idleTitle: { color: 'white', fontSize: 17, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  idleSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipSelected: { backgroundColor: 'rgba(255,77,121,0.18)', borderColor: '#ff4d79' },
  chipText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: '#ff4d79', fontWeight: '700' },
  timerActiveLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  countdown: { color: '#ff4d79', fontSize: 72, fontWeight: '700', letterSpacing: 2 },
  timerHint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8, marginBottom: 24, textAlign: 'center' },
  progressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#ff4d79', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 },
  progressLabelText: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
  expiredCard: {
    backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 16, padding: 28, marginBottom: 20, alignItems: 'center',
  },
  expiredIcon: { fontSize: 40, marginBottom: 12 },
  expiredTitle: { color: '#ef4444', fontSize: 22, fontWeight: '700', marginBottom: 6 },
  expiredSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 24 },
  resetBtn: {
    backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.5)',
    borderRadius: 14, paddingHorizontal: 32, paddingVertical: 12,
  },
  resetBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  actions: { gap: 12, marginBottom: 20 },
  startBtn: {
    backgroundColor: '#ff4d79', borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: '#ff4d79', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  startBtnText: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  safeBtn: {
    backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  safeBtnIcon: { fontSize: 22 },
  safeBtnText: { color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
  infoCard: {
    backgroundColor: 'rgba(255,77,121,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,77,121,0.15)',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  infoText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
