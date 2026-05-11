import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '@core/api/client';
import { auth } from '@core/firebase';

// Conditionally import MapView only on native platforms
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Circle = maps.Circle;
}

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
            Platform.OS === 'web' ? (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>📍 Map view available on mobile app</Text>
                <Text style={styles.mapCoords}>
                  {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                </Text>
              </View>
            ) : MapView ? (
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
                {isSharing && Circle && (
                  <Circle
                    center={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                    radius={100}
                    fillColor="rgba(255,77,121,0.2)"
                    strokeColor="rgba(255,77,121,0.6)"
                    strokeWidth={1.5}
                  />
                )}
                {Marker && (
                  <Marker
                    coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                    title="You are here"
                  />
                )}
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>📍 Map not available</Text>
              </View>
            )
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
  container: { flex: 1, backgroundColor: '#3A1F28' },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { marginBottom: 4 },
  headerTitle: { color: '#F5E6D3', fontSize: 24, fontWeight: '700' },
  headerSub: { color: '#D8A46B', fontSize: 13, marginTop: 4 },
  mapContainer: { height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111830', position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapPlaceholderText: { color: '#D8A46B', fontSize: 14 },
  mapCoords: { color: '#F2EDE8', fontSize: 12, fontFamily: 'monospace' },
  pulseWrapper: { position: 'absolute', bottom: 16, right: 16, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,77,121,0.3)', borderWidth: 1.5, borderColor: '#E66A6A' },
  pulseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E66A6A' },
  card: { backgroundColor: '#6D3B4B', borderWidth: 1, borderColor: '#8B6F74', borderRadius: 16, padding: 16, gap: 8 },
  cardActive: { borderColor: '#F28C82', backgroundColor: 'rgba(16,185,129,0.06)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusIcon: { fontSize: 16 },
  statusActiveText: { color: '#F28C82', fontSize: 15, fontWeight: '700' },
  statusOffText: { color: '#F2EDE8', fontSize: 15, fontWeight: '600' },
  statusHint: { color: '#D8A46B', fontSize: 13, lineHeight: 18 },
  elapsedText: { color: '#D8A46B', fontSize: 13 },
  shareLink: { color: '#E66A6A', fontSize: 12, marginTop: 2 },
  section: { gap: 10 },
  sectionTitle: { color: '#D8A46B', fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6D3B4B', borderWidth: 1, borderColor: '#8B6F74', borderRadius: 14, padding: 14, gap: 12 },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,77,121,0.15)', alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { color: '#E66A6A', fontSize: 16, fontWeight: '700' },
  contactInfo: { flex: 1, gap: 2 },
  contactName: { color: '#F5E6D3', fontSize: 14, fontWeight: '600' },
  contactPhone: { color: '#D8A46B', fontSize: 12 },
  typeBadge: { backgroundColor: 'rgba(255,77,121,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { color: '#E66A6A', fontSize: 10, fontWeight: '700' },
  emptyText: { color: '#D8A46B', fontSize: 13, textAlign: 'center', paddingVertical: 4 },
  actionBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  actionBtnStart: { backgroundColor: '#E66A6A', shadowColor: '#E66A6A' },
  actionBtnStop: { backgroundColor: '#F28C82', shadowColor: '#F28C82' },
  actionBtnText: { color: '#F5E6D3', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { fontSize: 16, marginTop: 1 },
  infoText: { flex: 1, color: '#D8A46B', fontSize: 12, lineHeight: 18 },
});
