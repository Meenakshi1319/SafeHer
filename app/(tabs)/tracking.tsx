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
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '../../services/api';
import { auth } from '../../services/firebase';

type Contact = {
  id: string;
  name: string;
  phone: string;
  type: string;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function TrackingScreen() {
  const [isSharing, setIsSharing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [shareLink, setShareLink] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to share your live location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      buildShareLink(loc);
    })();
    fetchContacts();
    return () => {
      clearIntervals();
      pulseLoopRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (isSharing) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 750, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isSharing, pulseAnim]);

  function buildShareLink(loc: Location.LocationObject) {
    const { latitude, longitude } = loc.coords;
    setShareLink(`https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`);
  }

  async function fetchContacts() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const res = await apiGet(`/contacts/${uid}`);
      setContacts(res.contacts || []);
    } catch (err: any) {
      console.log('Contacts fetch error:', err.message);
      setContacts([]);
    }
  }

  function clearIntervals() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
  }

  async function sendLocation() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      buildShareLink(loc);
      await apiPost('/save-location', { uid, latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (err: any) {
      console.log('Location update error:', err.message);
    }
  }

  async function startSharing() {
    if (isSharing || starting) return;
    setStarting(true);
    setIsSharing(true);
    setElapsed(0);
    try {
      clearIntervals();
      await sendLocation();
      intervalRef.current = setInterval(sendLocation, 30_000);
      elapsedRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1_000);
      Alert.alert('📍 Live location shared with your trusted contacts');
    } finally {
      setStarting(false);
    }
  }

  function stopSharing() {
    clearIntervals();
    setIsSharing(false);
    setElapsed(0);
  }

  const trustedContacts = contacts.filter((c) => ['family', 'trusted'].includes(c.type));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSub}>Share your location in real-time</Text>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {location ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation
            >
              {isSharing && (
                <Circle
                  center={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                  radius={100}
                  fillColor="rgba(255,77,121,0.2)"
                  strokeColor="rgba(255,77,121,0.6)"
                  strokeWidth={1.5}
                />
              )}
              <Marker
                coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                title="You are here"
              />
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>📍 Locating…</Text>
            </View>
          )}
          {isSharing && (
            <View style={styles.pulseWrapper} pointerEvents="none">
              <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.pulseDot} />
            </View>
          )}
        </View>

        {/* Status card */}
        {isSharing ? (
          <View style={[styles.card, styles.cardActive]}>
            <View style={styles.statusRow}>
              <Text style={styles.statusIcon}>🟢</Text>
              <Text style={styles.statusActiveText}>Live Sharing Active</Text>
            </View>
            <Text style={styles.elapsedText}>Sharing for {formatElapsed(elapsed)}</Text>
            {shareLink ? <Text style={styles.shareLink} numberOfLines={1}>🔗 {shareLink}</Text> : null}
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Text style={styles.statusIcon}>⚫</Text>
              <Text style={styles.statusOffText}>Location sharing is off</Text>
            </View>
            <Text style={styles.statusHint}>Tap the button below to start sharing with your trusted contacts.</Text>
          </View>
        )}

        {/* Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACTS BEING NOTIFIED</Text>
          {trustedContacts.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>Add trusted contacts first</Text>
            </View>
          ) : (
            trustedContacts.map((contact) => (
              <View key={contact.id} style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{contact.type.toUpperCase()}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Start / Stop */}
        <TouchableOpacity
          style={[styles.actionBtn, isSharing ? styles.actionBtnStop : styles.actionBtnStart]}
          onPress={isSharing ? stopSharing : startSharing}
          activeOpacity={0.85}
          disabled={starting}
        >
          <Text style={styles.actionBtnText}>{starting ? 'Starting...' : (isSharing ? '⏹ Stop Sharing' : '📍 Start Live Sharing')}</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={[styles.card, styles.infoCard]}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Location updates every 30 seconds. Your contacts receive a live Google Maps link via SMS during SOS.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { marginBottom: 4 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
  mapContainer: { height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111830', position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapPlaceholderText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  pulseWrapper: { position: 'absolute', bottom: 16, right: 16, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,77,121,0.3)', borderWidth: 1.5, borderColor: '#ff4d79' },
  pulseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff4d79' },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, gap: 8 },
  cardActive: { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.06)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusIcon: { fontSize: 16 },
  statusActiveText: { color: '#10b981', fontSize: 15, fontWeight: '700' },
  statusOffText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '600' },
  statusHint: { color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 18 },
  elapsedText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  shareLink: { color: '#ff4d79', fontSize: 12, marginTop: 2 },
  section: { gap: 10 },
  sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, gap: 12 },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,77,121,0.15)', alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { color: '#ff4d79', fontSize: 16, fontWeight: '700' },
  contactInfo: { flex: 1, gap: 2 },
  contactName: { color: 'white', fontSize: 14, fontWeight: '600' },
  contactPhone: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  typeBadge: { backgroundColor: 'rgba(255,77,121,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { color: '#ff4d79', fontSize: 10, fontWeight: '700' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', paddingVertical: 4 },
  actionBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  actionBtnStart: { backgroundColor: '#ff4d79', shadowColor: '#ff4d79' },
  actionBtnStop: { backgroundColor: '#10b981', shadowColor: '#10b981' },
  actionBtnText: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { fontSize: 16, marginTop: 1 },
  infoText: { flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 18 },
});
