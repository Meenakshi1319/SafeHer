import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>Safety resources & tips</Text>
        </View>

        {[
          { icon: '📖', title: 'Safety Guidelines', desc: 'Best practices for personal safety in different scenarios.' },
          { icon: '📞', title: 'Emergency Numbers', desc: 'Quick access to local and national emergency services.' },
          { icon: '🛡️', title: 'Self-Defense Tips', desc: 'Practical techniques and awareness strategies.' },
          { icon: '📍', title: 'Safe Spaces Directory', desc: 'Verified safe locations near you.' },
        ].map((item, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  header: { padding: 20 },
  title: { color: 'white', fontSize: 20, fontWeight: '600' },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, marginBottom: 10, padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardIcon: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardTitle: { color: 'white', fontSize: 15, fontWeight: '500' },
  cardDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
});
