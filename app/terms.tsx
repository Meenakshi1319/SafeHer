import { router } from 'expo-router';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const [accepted, setAccepted] = useState(false);

  function handleAccept() {
    if (!accepted) return;
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🛡️ SafeHer</Text>
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>Please read carefully before continuing</Text>
      </View>

      {/* Terms Content */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {[
          {
            title: '1. Data Privacy',
            content: 'SafeHer collects your location, voice, and motion data ONLY during emergencies. We never share your data with third parties without your consent. All data is encrypted using AES-256.'
          },
          {
            title: '2. Emergency Data Collection',
            content: 'During an SOS event, SafeHer will automatically record audio and video, track your location, and share it with your trusted contacts and authorities. This data is stored securely.'
          },
          {
            title: '3. Evidence Storage',
            content: 'All emergency recordings are stored in an encrypted Evidence Vault. Only you and authorized law enforcement can access this evidence. A blockchain hash is created for tamper-proof verification.'
          },
          {
            title: '4. Volunteer Network',
            content: 'SafeHer connects you with verified volunteers. All volunteers are background-checked. SafeHer is not responsible for volunteer actions but ensures they meet our verification standards.'
          },
          {
            title: '5. False Alarms',
            content: 'Repeated false alarms may result in temporary suspension of your account. Please use the SOS feature responsibly.'
          },
          {
            title: '6. User Responsibility',
            content: 'You are responsible for keeping your account secure. Do not share your login credentials with anyone. SafeHer is not liable for unauthorized access to your account.'
          },
          {
            title: '7. Age Requirement',
            content: 'SafeHer is designed for users aged 13 and above. Users under 18 should have parental consent before using this application.'
          },
          {
            title: '8. Changes to Terms',
            content: 'SafeHer reserves the right to update these terms at any time. You will be notified of major changes via the app.'
          },
        ].map((term, i) => (
          <View key={i} style={styles.termCard}>
            <Text style={styles.termTitle}>{term.title}</Text>
            <Text style={styles.termContent}>{term.content}</Text>
          </View>
        ))}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Accept Section */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAccepted(!accepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
            {accepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>
            I have read and agree to the Terms & Conditions and Privacy Policy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptBtn, !accepted && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={!accepted}
        >
          <Text style={styles.acceptText}>
            {accepted ? 'Continue →' : 'Accept to Continue'}
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A1F28',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logo: {
    fontSize: 28,
    marginBottom: 8,
  },
  title: {
    color: '#F5E6D3',
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    color: '#F2EDE8',
    fontSize: 12,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
    padding: 20,
  },
  termCard: {
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  termTitle: {
    color: '#E66A6A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  termContent: {
    color: '#F2EDE8',
    fontSize: 13,
    lineHeight: 20,
  },
  spacer: {
    height: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#F2EDE8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: '#E66A6A',
    borderColor: '#E66A6A',
  },
  checkmark: {
    color: '#F5E6D3',
    fontSize: 14,
    fontWeight: '700',
  },
  checkText: {
    color: '#F2EDE8',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  acceptBtn: {
    backgroundColor: '#E66A6A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#E66A6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptBtnDisabled: {
    backgroundColor: 'rgba(255,77,121,0.3)',
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptText: {
    color: '#F5E6D3',
    fontSize: 16,
    fontWeight: '600',
  },
});
