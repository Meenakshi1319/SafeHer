import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost, BASE_URL } from '../../services/api';
import { auth } from '../../services/firebase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Contact = {
  id: string;
  name: string;
  phone: string;
  type: string;
};

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('trusted');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) { setLoading(false); return; }
      const res = await apiGet(`/contacts/${uid}`);
      setContacts(res.contacts || []);
    } catch (err: any) {
      console.log('Contacts fetch error:', err.message);
      // Don't crash if backend is slow — just show empty
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!name || !phone) {
      Alert.alert('Missing Info', 'Please enter both name and phone number.');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      await apiPost(`/contacts/${uid}`, { name, phone, type });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await fetchContacts();
      setModalVisible(false);
      setName('');
      setPhone('');
      setType('trusted');
    } catch (err) {
      console.log('Add contact error:', err);
      Alert.alert('Error', 'Failed to add contact. Make sure the backend is running.');
    }
  };

  const handleDelete = async (cid: string, contactName: string) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;
            try {
              const res = await fetch(`${BASE_URL}/contacts/${uid}/${cid}`, { method: 'DELETE' });
              if (res.ok) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setContacts((prev) => prev.filter((c) => c.id !== cid));
              } else {
                Alert.alert('Error', 'Failed to delete contact from server.');
              }
            } catch (err) {
              console.log('Delete contact error:', err);
              Alert.alert('Error', 'Could not connect to server.');
            }
          },
        },
      ]
    );
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.name)}>
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <Text style={styles.headerSub}>These people will be notified during an SOS</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ff4d79" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Contact Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Contact</Text>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (e.g. +1234567890)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <View style={styles.typeSelector}>
              {['family', 'trusted', 'police'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleAddContact}
              >
                <Text style={styles.modalBtnText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  header: { padding: 24, paddingBottom: 12 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  list: { padding: 20, gap: 12 },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  contactInfo: { flex: 1, gap: 4 },
  contactName: { color: 'white', fontSize: 16, fontWeight: '600' },
  contactPhone: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,77,121,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  typeText: { color: '#ff4d79', fontSize: 10, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: 'rgba(255,0,0,0.1)',
    padding: 12,
    borderRadius: 12,
  },
  deleteIcon: { fontSize: 18 },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#ff4d79',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff4d79',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: { color: 'white', fontSize: 32, fontWeight: '300', marginTop: -2 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#111120',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: 'white',
    fontSize: 15,
    marginBottom: 12,
  },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: '#ff4d79' },
  typeBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  typeBtnTextActive: { color: 'white' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  saveBtn: { backgroundColor: '#ff4d79' },
  modalBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
});
