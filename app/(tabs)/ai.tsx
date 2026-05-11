import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '@core/api/client';

type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
};

const quickActions = [
  { label: '😟 I feel unsafe', message: 'I feel unsafe right now. What should I do?' },
  { label: '🌙 Night travel tips', message: 'Give me safety tips for traveling alone at night.' },
  { label: '🛡️ Self-defense', message: 'What are some basic self-defense techniques?' },
  { label: '📞 Emergency numbers', message: 'What are the emergency helpline numbers in India?' },
];

export default function AIScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'ai', text: 'Hi! I\'m SafeHer AI 🛡️ — your personal safety assistant.\n\nI can help with safety tips, emergency guidance, self-defense advice, and more. How can I help you stay safe today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history for context (skip the welcome message)
      const history = messages
        .filter((m) => m.id !== '0')
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));

      const res = await apiPost('/ai/chat', { message: text.trim(), history });

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: res.reply };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Sorry, I\'m having trouble connecting right now. If you\'re in danger, press the SOS button or call 100 immediately! 🚨',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.msgRow, item.role === 'user' ? styles.userRow : styles.aiRow]}>
      {item.role === 'ai' && <Text style={styles.avatar}>🤖</Text>}
      <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.msgText, item.role === 'user' && styles.userText]}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SafeHer AI</Text>
          <Text style={styles.headerSub}>Your personal safety assistant</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListFooterComponent={
            loading ? (
              <View style={[styles.msgRow, styles.aiRow]}>
                <Text style={styles.avatar}>🤖</Text>
                <View style={[styles.bubble, styles.aiBubble]}>
                  <ActivityIndicator size="small" color="#ff4d79" />
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <View style={styles.quickActions}>
            {quickActions.map((q) => (
              <TouchableOpacity
                key={q.label}
                style={styles.quickBtn}
                onPress={() => sendMessage(q.message)}
              >
                <Text style={styles.quickText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask SafeHer AI..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            editable={!loading}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  header: { padding: 20, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { color: '#ff4d79', fontSize: 22, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
  messageList: { padding: 16, paddingBottom: 8, gap: 12 },
  msgRow: { flexDirection: 'row', gap: 8, maxWidth: '88%' },
  userRow: { alignSelf: 'flex-end' },
  aiRow: { alignSelf: 'flex-start' },
  avatar: { fontSize: 24, marginTop: 4 },
  bubble: { borderRadius: 18, padding: 14, maxWidth: '100%' },
  aiBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#ff4d79',
    borderTopRightRadius: 4,
  },
  msgText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },
  userText: { color: 'white' },
  quickActions: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, flexDirection: 'row', flexWrap: 'wrap' },
  quickBtn: {
    backgroundColor: 'rgba(255,77,121,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,77,121,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickText: { color: '#ff4d79', fontSize: 13 },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a14',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff4d79',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: 'white', fontSize: 18 },
});
