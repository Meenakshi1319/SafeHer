import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useState } from 'react';
import Slider from '@react-native-community/slider';

export default function RiskScreen() {
  const [score, setScore] = useState(62);

  const factors = [
    { label: 'Voice Stress', value: 70, color: '#e05a7a' },
    { label: 'Motion Anomaly', value: 55, color: '#f0a500' },
    { label: 'Location Risk', value: 60, color: '#e05a7a' },
    { label: 'Night Time', value: 80, color: '#f0a500' },
    { label: 'Route Deviation', value: 40, color: '#4caf8a' },
  ];

  function getRiskLevel() {
    if (score < 30) return { label: 'Low Risk', color: '#4caf8a' };
    if (score < 60) return { label: 'Moderate Risk', color: '#f0a500' };
    if (score < 80) return { label: 'High Risk', color: '#e05a7a' };
    return { label: 'Critical!', color: '#ff0000' };
  }

  const risk = getRiskLevel();

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

        {/* Slider */}
        <View style={styles.sliderWrapper}>
          <Text style={styles.sliderLabel}>Simulate risk score</Text>
          <Slider
            style={{ width: '100%' }}
            minimumValue={0}
            maximumValue={100}
            value={score}
            onValueChange={(val) => setScore(Math.round(val))}
            minimumTrackTintColor="#e05a7a"
            maximumTrackTintColor="rgba(255,255,255,0.1)"
            thumbTintColor="#e05a7a"
          />
        </View>

        {/* Factors */}
        <View style={styles.factorsWrapper}>
          <Text style={styles.factorsTitle}>RISK FACTORS</Text>
          {factors.map((f) => (
            <View key={f.label} style={styles.factorRow}>
              <View style={styles.factorTop}>
                <Text style={styles.factorName}>{f.label}</Text>
                <Text style={[styles.factorVal, { color: f.color }]}>{f.value}%</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${f.value}%`, backgroundColor: f.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Escalation */}
        <View style={styles.escalation}>
          <Text style={styles.escTitle}>ESCALATION LEVEL</Text>
          <View style={styles.escRow}>
            {['👨‍👩‍👧', '🙋', '🚔'].map((icon, i) => (
              <View key={i} style={styles.escStep}>
                <View style={[
                  styles.escDot,
                  { backgroundColor: score > i * 30 ? '#e05a7a' : 'rgba(255,255,255,0.1)' }
                ]}>
                  <Text style={{ fontSize: 14 }}>{icon}</Text>
                </View>
                <Text style={styles.escLabel}>
                  {i === 0 ? 'Family' : i === 1 ? 'Volunteers' : 'Police'}
                </Text>
                {i < 2 && (
                  <View style={[
                    styles.escLine,
                    { backgroundColor: score > (i + 1) * 30 ? '#e05a7a' : 'rgba(255,255,255,0.1)' }
                  ]} />
                )}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
  header: {
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '500',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 4,
  },
  circleWrapper: {
    alignItems: 'center',
    marginVertical: 20,
  },
  circle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  scoreNum: {
    color: 'white',
    fontSize: 42,
    fontWeight: '500',
  },
  riskLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sliderWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sliderLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  factorsWrapper: {
    paddingHorizontal: 20,
    gap: 14,
  },
  factorsTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 1,
  },
  factorRow: {
    gap: 6,
  },
  factorTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  factorName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  factorVal: {
    fontSize: 13,
  },
  barBg: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
  },
  barFill: {
    height: 5,
    borderRadius: 4,
  },
  escalation: {
    margin: 20,
    backgroundColor: '#1a0a0f',
    borderWidth: 0.5,
    borderColor: 'rgba(224,90,122,0.2)',
    borderRadius: 14,
    padding: 16,
  },
  escTitle: {
    color: '#e05a7a',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
  },
  escRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  escStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  escDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 4,
  },
  escLine: {
    position: 'absolute',
    height: 1,
    width: '100%',
    top: 18,
    left: '50%',
  },
});