import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '@core/api/client';
import { auth } from '@core/firebase';

type AlertItem = {
  id: string;
  message: string;
  riskScore: number;
  source: string;
  seen: boolean;
  createdAt: any;
};

function getSourceIcon(source: string) {
  switch (source) {
    case 'shake': return '📳';
    case 'sound': return '🔊';
    case 'voice': return '🎙️';
    case 'emergency': return '🚨';
    case 'recording': return '🎥';
    case 'evidence': return '📁';
    case 'reset': return '✅';
    default: return '🔔';
  }
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function EscalationScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    try {
      const res = await apiGet(`/alerts/${uid}`);
      setAlerts(res.alerts || []);
    } catch (err) {
      console.log('Alerts fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markSeen = async (aid: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await apiPost(`/alerts/${uid}/seen/${aid}`, {});
      setAlerts((prev) =>
        prev.map((a) => (a.id === aid ? { ...a, seen: true } : a))
      );
    } catch (err) {
      console.log('Mark seen error:', err);
    }
  };

  const unseenCount = alerts.filter((a) => !a.seen).length;

  const renderAlert = ({ item }: { item: AlertItem }) => (
    <TouchableOpacity
      style={[styles.alertCard, !item.seen && styles.alertUnseen]}
      onPress={() => !item.seen && markSeen(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.alertIcon}>{getSourceIcon(item.source)}</Text>
      <View style={styles.alertInfo}>
        <Text style={styles.alertMsg} numberOfLines={2}>{item.message}</Text>
        <View style={styles.alertMeta}>
          <Text style={styles.alertSource}>{item.source}</Text>
          <Text style={styles.alertTime}>{timeAgo(item.createdAt?._seconds ? new Date(item.createdAt._seconds * 1000).toISOString() : item.createdAt)}</Text>
        </View>
      </View>
      {!item.seen && <View style={styles.unseenDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Alert History</Text>
          <Text style={styles.subtitle}>
            {unseenCount > 0 ? `${unseenCount} unread alert${unseenCount > 1 ? 's' : ''}` : 'All caught up ✓'}
          </Text>
        </View>
        {unseenCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unseenCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ff4d79" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAlerts(); }} tintColor="#ff4d79" />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyText}>No alerts yet</Text>
              <Text style={styles.emptySub}>Your safety alerts will appear here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 10,
  },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  badge: {
    backgroundColor: '#ff4d79', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { color: 'white', fontSize: 13, fontWeight: '700' },
  list: { padding: 16, gap: 10 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.05)',
  },
  alertUnseen: {
    backgroundColor: 'rgba(255,77,121,0.05)',
    borderColor: 'rgba(255,77,121,0.15)',
  },
  alertIcon: { fontSize: 24 },
  alertInfo: { flex: 1, gap: 4 },
  alertMsg: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  alertMeta: { flexDirection: 'row', gap: 8 },
  alertSource: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  alertTime: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
  unseenDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4d79',
  },
  emptyWrapper: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '600' },
  emptySub: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
});
