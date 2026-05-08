import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const volunteers = [
  { name: 'Priya S.', role: 'College Volunteer', distance: '0.8 km away', rating: '4.9', avatar: '👩', available: true },
  { name: 'Rahul M.', role: 'NGO Worker', distance: '1.2 km away', rating: '4.8', avatar: '👨', available: true },
  { name: 'Anjali T.', role: 'Night Patrol', distance: '2.1 km away', rating: '5.0', avatar: '👩', available: true },
  { name: 'Kavya R.', role: 'Corporate Security', distance: '3.0 km away', rating: '4.7', avatar: '👩', available: false },
];

export default function CommunityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Community Network</Text>
          <Text style={styles.subtitle}>Verified volunteers near you</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { value: '24', label: 'Active Volunteers' },
            { value: '3', label: 'Night Patrols' },
            { value: '98%', label: 'Response Rate' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Volunteer List */}
        <View style={styles.listWrapper}>
          <Text style={styles.listTitle}>NEARBY VOLUNTEERS</Text>
          {volunteers.map((v, i) => (
            <View key={i} style={styles.volCard}>
              <View style={[styles.avatar, { backgroundColor: v.available ? '#1a0a0f' : '#1a1a1a' }]}>
                <Text style={styles.avatarText}>{v.avatar}</Text>
              </View>
              <View style={styles.volInfo}>
                <Text style={styles.volName}>{v.name}</Text>
                <Text style={styles.volRole}>{v.role}</Text>
                <Text style={styles.volDist}>📍 {v.distance}</Text>
              </View>
              <View style={styles.volRight}>
                <View style={[styles.availDot, { backgroundColor: v.available ? '#4caf8a' : '#666' }]} />
                <Text style={styles.volRating}>⭐ {v.rating}</Text>
                <TouchableOpacity style={styles.callBtn}>
                  <Text style={styles.callText}>Alert</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    color: '#e05a7a',
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  listWrapper: {
    paddingHorizontal: 20,
    gap: 10,
  },
  listTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
  },
  volCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111120',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
  },
  volInfo: {
    flex: 1,
  },
  volName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  volRole: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  volDist: {
    color: '#e05a7a',
    fontSize: 11,
    marginTop: 4,
  },
  volRight: {
    alignItems: 'center',
    gap: 6,
  },
  availDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  volRating: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  callBtn: {
    backgroundColor: 'rgba(224,90,122,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(224,90,122,0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  callText: {
    color: '#e05a7a',
    fontSize: 11,
  },
});
