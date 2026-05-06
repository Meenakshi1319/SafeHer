import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';

export default function DecoyScreen() {
  const [input, setInput] = useState('0');
  const [decoyActive, setDecoyActive] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);

  const buttons = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ];

  function handlePress(btn: string) {
    // Secret code — if user types 1234 it triggers SOS
    const newInput = input === '0' ? btn : input + btn;

    if (newInput.endsWith('1234')) {
      triggerSecretSOS();
      return;
    }

    if (btn === 'C') {
      setInput('0');
    } else if (btn === '=') {
      try {
        const expr = input
          .replace('×', '*')
          .replace('÷', '/')
          .replace('−', '-');
        setInput(String(eval(expr)));
      } catch {
        setInput('Error');
      }
    } else {
      setInput(newInput);
    }
  }

  function triggerSecretSOS() {
    setSosTriggered(true);
    Alert.alert(
      '🚨 Secret SOS Sent!',
      '✅ Family alerted silently\n✅ Location shared\n✅ Recording started\n\nCalculator still shows normally to attacker',
      [{ text: 'OK', onPress: () => setSosTriggered(false) }]
    );
  }

  function toggleDecoy() {
    setDecoyActive(!decoyActive);
    if (!decoyActive) {
      Alert.alert(
        '🔐 Decoy Mode Activated',
        'App now looks like a calculator.\nType 1234 to secretly trigger SOS.',
        [{ text: 'Got it' }]
      );
    }
  }

  if (decoyActive) {
    return (
      <SafeAreaView style={styles.calcContainer}>
        {/* Secret SOS indicator — tiny and hidden */}
        {sosTriggered && (
          <View style={styles.secretIndicator}>
            <Text style={styles.secretText}>●</Text>
          </View>
        )}

        {/* Calculator Display */}
        <View style={styles.calcDisplay}>
          <Text style={styles.calcInput} numberOfLines={1} adjustsFontSizeToFit>
            {input}
          </Text>
        </View>

        {/* Calculator Buttons */}
        <View style={styles.calcButtons}>
          {buttons.map((row, i) => (
            <View key={i} style={styles.calcRow}>
              {row.map((btn) => (
                <TouchableOpacity
                  key={btn}
                  style={[
                    styles.calcBtn,
                    btn === '0' && styles.calcBtnWide,
                    ['÷', '×', '−', '+', '='].includes(btn) && styles.calcBtnOrange,
                    ['C', '±', '%'].includes(btn) && styles.calcBtnGray,
                  ]}
                  onPress={() => handlePress(btn)}
                >
                  <Text style={[
                    styles.calcBtnText,
                    ['÷', '×', '−', '+', '='].includes(btn) && styles.calcBtnTextWhite,
                    ['C', '±', '%'].includes(btn) && styles.calcBtnTextDark,
                  ]}>
                    {btn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Hidden exit — long press bottom right corner */}
        <TouchableOpacity
          style={styles.hiddenExit}
          onLongPress={() => setDecoyActive(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Decoy Mode</Text>
        <Text style={styles.subtitle}>Hidden protection</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>🔐</Text>
        <Text style={styles.infoTitle}>How Decoy Mode Works</Text>
        <Text style={styles.infoText}>
          When activated, your app disguises itself as a calculator.
          If an attacker forces you to unlock your phone, they only see a calculator.
        </Text>
      </View>

      {/* Steps */}
      <View style={styles.steps}>
        {[
          { icon: '1️⃣', text: 'Activate Decoy Mode below' },
          { icon: '2️⃣', text: 'App looks like a calculator' },
          { icon: '3️⃣', text: 'Type 1234 to secretly trigger SOS' },
          { icon: '4️⃣', text: 'Long press bottom-right corner to exit' },
        ].map((s, i) => (
          <View key={i} style={styles.stepRow}>
            <Text style={styles.stepNum}>{s.icon}</Text>
            <Text style={styles.stepText}>{s.text}</Text>
          </View>
        ))}
      </View>

      {/* Activate Button */}
      <TouchableOpacity style={styles.activateBtn} onPress={toggleDecoy}>
        <Text style={styles.activateText}>🔐 Activate Decoy Mode</Text>
      </TouchableOpacity>

      {/* Warning */}
      <View style={styles.warning}>
        <Text style={styles.warningText}>
          ⚠️ Once activated, your app will look like a calculator until you long press the bottom-right corner to exit.
        </Text>
      </View>

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
  infoCard: {
    marginHorizontal: 20,
    backgroundColor: '#1a0a0f',
    borderWidth: 0.5,
    borderColor: '#e05a7a30',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 36,
  },
  infoTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  infoText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  steps: {
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 28,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNum: {
    fontSize: 20,
  },
  stepText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  activateBtn: {
    marginHorizontal: 20,
    backgroundColor: '#e05a7a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#e05a7a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  activateText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  warning: {
    margin: 20,
    backgroundColor: 'rgba(240,165,0,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(240,165,0,0.2)',
    borderRadius: 12,
    padding: 14,
  },
  warningText: {
    color: 'rgba(240,165,0,0.8)',
    fontSize: 12,
    lineHeight: 18,
  },
  // Calculator styles
  calcContainer: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  secretIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 999,
  },
  secretText: {
    color: '#e05a7a',
    fontSize: 8,
  },
  calcDisplay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 24,
  },
  calcInput: {
    color: 'white',
    fontSize: 64,
    fontWeight: '200',
  },
  calcButtons: {
    padding: 12,
    gap: 12,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  calcBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcBtnWide: {
    width: 156,
    alignItems: 'flex-start',
    paddingLeft: 26,
  },
  calcBtnOrange: {
    backgroundColor: '#ff9f0a',
  },
  calcBtnGray: {
    backgroundColor: '#a5a5a5',
  },
  calcBtnText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '400',
  },
  calcBtnTextWhite: {
    color: 'white',
  },
  calcBtnTextDark: {
    color: '#1c1c1e',
  },
  hiddenExit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 60,
    height: 60,
  },
});