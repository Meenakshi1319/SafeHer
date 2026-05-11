import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '@core/api/client';
import { auth } from '@core/firebase';

export default function RiskScreen() {
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchRisk();
  }, []);

  const fetchRisk = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    try {
      const res = await apiGet(`/risk/${uid}`);
      setScore(res.riskScore || 0);

      const histRes = await apiGet(`/risk/${uid}/history`);
      setHistory((histRes.history || []).slice(0, 10)); // Last 10 events
    } catch (err) {
      console.log('Risk fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setResetting(true);
    try {
      await apiPost('/reset-risk', { uid });
      setScore(0);
      await fetchRisk();
    } catch (err) {
      console.log('Reset error:', err);
    } finally {
      setResetting(false);
    }
  };

  function getRiskLevel() {
    if (score <= 30) return { label: 'Low Risk', color: '#4caf8a', emoji: '🟢' };
    if (score <= 60) return { label: 'Moderate Risk', color: '#f0a500', emoji: '🟡' };
    if (score <= 85) return { label: 'High Risk', color: '#e05a7a', emoji: '🟠' };
    return { label: 'Critical!', color: '#ff0000', emoji: '🔴' };
  }

  const risk = getRiskLevel();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#e05a7a" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Risk Engine</Text>
          <Text style={styles.subtitle}>Real-time danger detection</Text>
        </View>

        {/* Risk Circle */}
        <View style={styles.circleWrapper}>
          <View style={[styles.circle, { borderColor: risk.color, shadowColor: risk.color }]}>
            <Text style={styles.scoreNum}>{score}</Text>
            <Text style={[styles.riskLabel, { color: risk.color }]}>{risk.label}</Text>
          </View>
        </View>

        {/* I'm Safe Button */}
        {score > 0 && (
          <TouchableOpacity style={styles.safeBtn} onPress={handleReset} disabled={resetting}>
            {resetting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.safeBtnText}>I am Safe - Reset Risk</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Escalation Level */}
        <View style={styles.escalation}>
          <Text style={styles.escTitle}>ESCALATION LEVEL</Text>
          <View style={styles.escRow}>
            {[
              { icon: '👨‍👩‍👧', label: 'Family', threshold: 30 },
              { icon: '🙋', label: 'Volunteers', threshold: 60 },
              { icon: '🚔', label: 'Police', threshold: 85 },
            ].map((step, i) => (
              <View key={i} style={styles.escStep}>
                <View style={[
                  styles.escDot,
                  { backgroundColor: score > step.threshold ? '#e05a7a' : 'rgba(255,255,255,0.1)' }
                ]}>
                  <Text style={{ fontSize: 14 }}>{step.icon}</Text>
                </View>
                <Text style={styles.escLabel}>{step.label}</Text>
                {i < 2 && (
                  <View style={[
                    styles.escLine,
                    { backgroundColor: score > [60, 85][i] ? '#e05a7a' : 'rgba(255,255,255,0.1)' }
                  ]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Risk History */}
        <View style={styles.historySection}>
          <Text style={styles.histTitle}>RECENT RISK EVENTS</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No risk events yet. Stay safe! 🛡️</Text>
          ) : (
            history.map((h, i) => (
              <View key={i} style={styles.histCard}>
                <View style={styles.histInfo}>
                  <Text style={styles.histReason}>{h.reason || 'Risk event'}</Text>
                  <Text style={styles.histSource}>{h.source || 'system'} · Score: {h.score}</Text>
                </View>
                <Text style={[styles.histDelta, { color: h.delta > 0 ? '#e05a7a' : '#4caf8a' }]}>
                  {h.delta > 0 ? `+${h.delta}` : h.delta === 0 ? 'Reset' : h.delta}
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  header: { padding: 20 },
  title: { color: 'white', fontSize: 20, fontWeight: '500' },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 },
  circleWrapper: { alignItems: 'center', marginVertical: 20 },
  circle: {
    width: 150, height: 150, borderRadius: 75, borderWidth: 6,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  scoreNum: { color: 'white', fontSize: 42, fontWeight: '500' },
  riskLabel: { fontSize: 12, marginTop: 4 },
  safeBtn: {
    marginHorizontal: 20, backgroundColor: '#4caf8a', borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 16,
  },
  safeBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
  escalation: {
    margin: 20, marginTop: 4, backgroundColor: '#1a0a0f',
    borderWidth: 0.5, borderColor: 'rgba(224,90,122,0.2)', borderRadius: 14, padding: 16,
  },
  escTitle: { color: '#e05a7a', fontSize: 11, letterSpacing: 1, marginBottom: 12 },
  escRow: { flexDirection: 'row', alignItems: 'center' },
  escStep: { alignItems: 'center', flex: 1, position: 'relative' },
  escDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  escLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4 },
  escLine: { position: 'absolute', height: 1, width: '100%', top: 18, left: '50%' },
  historySection: { paddingHorizontal: 20, gap: 10, paddingBottom: 30 },
  histTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  emptyText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20 },
  histCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 14, gap: 12,
  },
  histInfo: { flex: 1, gap: 2 },
  histReason: { color: 'white', fontSize: 13, fontWeight: '500' },
  histSource: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  histDelta: { fontSize: 16, fontWeight: '700' },
});
