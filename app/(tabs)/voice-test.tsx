import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceHelper from '@features/ai/services/voiceTrigger';

export default function VoiceTestScreen() {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastTranscript, setLastTranscript] = useState('');

  useEffect(() => {
    checkAvailability();
    
    // Override console.log to capture logs
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      if (message.includes('🎤') || message.includes('Voice') || message.includes('Speech')) {
        addLog(message);
      }
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  };

  const checkAvailability = () => {
    const available = VoiceHelper.isAvailable();
    setIsAvailable(available);
    addLog(`Voice Recognition Available: ${available}`);
  };

  const startListening = async () => {
    addLog('Starting voice recognition...');
    const success = await VoiceHelper.startListening();
    setIsListening(success);
    addLog(`Start result: ${success}`);
  };

  const stopListening = () => {
    addLog('Stopping voice recognition...');
    VoiceHelper.stopListening();
    setIsListening(false);
  };

  const testTriggerWords = () => {
    Alert.alert(
      'Trigger Words',
      'Try saying these phrases:\n\n' +
      '• "Help me"\n' +
      '• "Save me"\n' +
      '• "Emergency"\n' +
      '• "Bachao"\n' +
      '• "Stop"\n' +
      '• "Please help"\n\n' +
      'Make sure voice recognition is started and your microphone is working.',
      [{ text: 'OK' }]
    );
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎤 Voice Recognition Test</Text>
        <Text style={styles.subtitle}>Debug & Test Voice Triggers</Text>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Available:</Text>
          <View style={[styles.statusBadge, isAvailable ? styles.statusGreen : styles.statusRed]}>
            <Text style={styles.statusText}>{isAvailable ? 'YES' : 'NO'}</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Listening:</Text>
          <View style={[styles.statusBadge, isListening ? styles.statusGreen : styles.statusGray]}>
            <Text style={styles.statusText}>{isListening ? 'ACTIVE' : 'INACTIVE'}</Text>
          </View>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={startListening}
          disabled={isListening}
        >
          <Text style={styles.buttonText}>▶️ Start</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={stopListening}
          disabled={!isListening}
        >
          <Text style={styles.buttonText}>⏹️ Stop</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={testTriggerWords}
        >
          <Text style={styles.buttonText}>📝 Trigger Words</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={checkAvailability}
        >
          <Text style={styles.buttonText}>🔄 Check Status</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>📋 How to Test:</Text>
        <Text style={styles.instructionsText}>
          1. Tap "Start" to begin listening{'\n'}
          2. Say one of the trigger words clearly{'\n'}
          3. Watch the logs below for detection{'\n'}
          4. Check console for detailed output
        </Text>
      </View>

      {/* Logs */}
      <View style={styles.logsContainer}>
        <View style={styles.logsHeader}>
          <Text style={styles.logsTitle}>📊 Logs</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.logsList}>
          {logs.length === 0 ? (
            <Text style={styles.noLogs}>No logs yet. Start listening to see activity.</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={styles.logItem}>{log}</Text>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080810',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusGreen: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  statusRed: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  statusGray: {
    backgroundColor: 'rgba(156,163,175,0.2)',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#10b981',
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 20,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    color: '#ff4d79',
    fontSize: 12,
    fontWeight: '600',
  },
  logsList: {
    flex: 1,
    padding: 12,
  },
  noLogs: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  logItem: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 6,
    lineHeight: 16,
  },
});
