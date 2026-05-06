import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Animated,
  ScrollView,
} from 'react-native';

const evidenceData = [
  { id: '1', type: '🎥', title: 'Video Recording', date: 'Today 10:32 PM', size: '12.4 MB' },
  { id: '2', type: '🎙️', title: 'Audio Recording', date: 'Today 10:31 PM', size: '2.1 MB' },
  { id: '3', type: '📍', title: 'Location Log', date: 'Today 10:30 PM', size: '0.3 MB' },
  { id: '4', type: '🎥', title: 'Video Recording', date: 'Yesterday 11:20 PM', size: '8.7 MB' },
];

export default function SOSScreen() {
  const [sosActive, setSosActive] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    function animate(anim: Animated.Value, delay: number) {
      Animated.loop(
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
      ).start();
    }
    animate(pulse1, 0);
    animate(pulse2, 300);
    animate(pulse3, 600);
  }, []);

  function handleSOS() {
    setSosActive(true);
    Alert.alert(
      '🚨 SOS Activated!',
      '✅ Recording started\n✅ Location shared\n✅ Family alerted\n✅ Evidence saved to vault',
      [{ text: 'Cancel SOS', onPress: () => setSosActive(false) }]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, Meenakshi 👋</Text>
            <Text style={styles.logo}>SafeHer</Text>
          </View>
          <View style={styles.safeBadge}>
            <View style={styles.safeDot} />
            <Text style={styles.safeText}>You are safe</Text>
          </View>
        </View>

        {/* SOS Button */}
        <View style={styles.sosWrapper}>
          <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: pulse1 }], opacity: 0.15 }]} />
          <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: pulse2 }], opacity: 0.10 }]} />
          <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: pulse3 }], opacity: 0.06 }]} />

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
          {sosActive ? '🔴 Sending alerts...' : 'Press for emergency'}
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
                <Text style={styles.vaultSub}>{evidenceData.length} files encrypted</Text>
              </View>
            </View>
            <Text style={styles.vaultToggle}>{showVault ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showVault && (
            <View style={styles.vaultList}>
              {evidenceData.map((item) => (
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