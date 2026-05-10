import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '../../services/api';
import { auth } from '../../services/firebase';

function SettingRow({
  icon,
  label,
  onPress,
  right,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={styles.settingLabel}>{label}</Text>
      {right}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const [loggingOut, setLoggingOut] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const user = auth.currentUser;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            const uid = auth.currentUser?.uid;
            if (uid) {
              await apiPost('/logout', { uid }).catch(() => {});
            }
            await signOut(auth);
            router.replace('/login');
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Card */}
        <View style={[styles.card, styles.userCard]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.emailText}>{email}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified ✓</Text>
            </View>
          </View>
        </View>

        {/* Protection Settings */}
        <Text style={styles.sectionTitle}>PROTECTION SETTINGS</Text>
        <View style={styles.card}>
          <SettingRow
            icon="📳"
            label="Shake Detection"
            right={
              <Switch
                value={shakeEnabled}
                onValueChange={setShakeEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,77,121,0.5)' }}
                thumbColor={shakeEnabled ? '#ff4d79' : 'rgba(255,255,255,0.4)'}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🎤"
            label="Voice Trigger"
            right={
              <Switch
                value={voiceEnabled}
                onValueChange={setVoiceEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,77,121,0.5)' }}
                thumbColor={voiceEnabled ? '#ff4d79' : 'rgba(255,255,255,0.4)'}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🔔"
            label="Notifications"
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,77,121,0.5)' }}
                thumbColor={notificationsEnabled ? '#ff4d79' : 'rgba(255,255,255,0.4)'}
              />
            }
          />
        </View>

        {/* App Section */}
        <Text style={styles.sectionTitle}>APP</Text>
        <View style={styles.card}>
          <SettingRow
            icon="🔐"
            label="Decoy Mode"
            onPress={() => router.push('/(tabs)/decoy')}
            right={<Text style={styles.chevron}>›</Text>}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="⏱"
            label="Check-In Timer"
            onPress={() => router.push('/(tabs)/checkin' as any)}
            right={<Text style={styles.chevron}>›</Text>}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="📍"
            label="Live Tracking"
            onPress={() => router.push('/(tabs)/tracking' as any)}
            right={<Text style={styles.chevron}>›</Text>}
          />
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#ff4d79" size="small" />
            ) : (
              <Text style={styles.logoutText}>Logout</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>SafeHer v1.0.0 · Built for safety</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '700', letterSpacing: 0.5 },
  card: {
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, overflow: 'hidden',
  },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ff4d79', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: 'white', fontSize: 26, fontWeight: '700' },
  userInfo: { flex: 1, marginLeft: 16, justifyContent: 'center', gap: 4 },
  displayName: { color: 'white', fontSize: 17, fontWeight: '600' },
  emailText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  verifiedBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2,
  },
  verifiedText: { color: '#10b981', fontSize: 11, fontWeight: '500' },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginHorizontal: 20, marginTop: 20, marginBottom: 8,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  settingIcon: { fontSize: 20, marginRight: 14, width: 28, textAlign: 'center' },
  settingLabel: { flex: 1, color: 'white', fontSize: 15 },
  chevron: { color: 'rgba(255,255,255,0.3)', fontSize: 22, fontWeight: '300', lineHeight: 24 },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 58 },
  logoutBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16,
    borderWidth: 0.5, borderColor: 'rgba(255,77,121,0.3)', borderRadius: 16, minHeight: 52,
  },
  logoutText: { color: '#ff4d79', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  versionText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', marginTop: 24 },
});
