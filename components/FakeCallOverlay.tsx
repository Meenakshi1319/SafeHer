import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { apiPost } from '../services/api';

let SpeechRecognition: any = null;
try {
  SpeechRecognition = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {}

interface FakeCallOverlayProps {
  visible: boolean;
  callerName: string;
  onClose: () => void;
}

type ConversationStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function FakeCallOverlay({ visible, callerName, onClose }: FakeCallOverlayProps) {
  const [callStatus, setCallStatus] = useState<'incoming' | 'active'>('incoming');
  const [convStatus, setConvStatus] = useState<ConversationStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionListeners = useRef<any[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Reset state when overlay opens
  useEffect(() => {
    if (visible) {
      setCallStatus('incoming');
      setConvStatus('idle');
      setDuration(0);
      setChatHistory([]);
      Vibration.vibrate([1000, 2000], true);
      
      // Request mic permission silently if available
      if (SpeechRecognition) {
        SpeechRecognition.requestPermissionsAsync();
      }
    } else {
      stopCall();
    }
    return () => stopCall();
  }, [visible]);

  // Handle active call timer
  useEffect(() => {
    if (callStatus === 'active') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const handleAccept = async () => {
    Vibration.cancel();
    setCallStatus('active');
    
    // Initial AI prompt
    speakWithAI(`Hey! Is everything okay? I saw your location update. I'm actually just a couple of minutes away. Just keep talking to me. Can you hear me?`);
  };

  const speakWithAI = async (text: string, audioBase64?: string) => {
    setConvStatus('speaking');

    if (audioBase64) {
      try {
        const fileUri = FileSystem.cacheDirectory + 'reply.mp3';
        await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: fileUri },
          { shouldPlay: true }
        );
        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            sound.unloadAsync();
            startListening();
          }
        });
        return; // Exit here if we are playing high-quality audio
      } catch (err) {
        console.log("Error playing audio from base64, falling back to local TTS", err);
      }
    }

    // Fallback to local TTS if no base64 audio provided or if it failed
    Speech.speak(text, {
      rate: 0.95,
      pitch: 1.0,
      onDone: () => startListening(),
      onError: () => startListening(),
    });
  };

  const startListening = () => {
    if (!SpeechRecognition) return;
    
    setConvStatus('listening');
    
    // Clear previous listeners
    recognitionListeners.current = [
      SpeechRecognition.addListener("result", onSpeechResult),
      SpeechRecognition.addListener("error", onSpeechError),
      SpeechRecognition.addListener("end", onSpeechEnd),
    ];

    try {
      SpeechRecognition.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
        iosVoiceProcessingEnabled: true,
      });
    } catch (e) {
      console.log('Speech rec error:', e);
      setConvStatus('idle');
    }
  };

  const onSpeechResult = async (event: any) => {
    console.log("Speech Result:", event);
    if (!event.isFinal) return; // Wait until they finish speaking

    const text = event?.results?.[0]?.transcript?.trim();
    if (!text) {
      return; // End event will restart it if empty
    }
    
    // We got user text. Stop listening and send to AI
    SpeechRecognition.abort?.();
    setConvStatus('thinking');

    try {
      console.log("Sending to backend:", text);
      const response = await apiPost('/ai/fake-call', {
        message: text,
        callerName,
        history: chatHistory,
      });
      console.log("Got response:", response.reply);

      if (response && response.reply) {
        setChatHistory(prev => [
          ...prev, 
          { role: 'user', text },
          { role: 'model', text: response.reply }
        ]);
        speakWithAI(response.reply, response.audioBase64);
      } else {
        speakWithAI("I couldn't hear you clearly, I am almost there though.");
      }
    } catch (error) {
      console.log('Fake call API error', error);
      speakWithAI("I'm having trouble hearing you, just hang on.");
    }
  };

  const onSpeechError = (event: any) => {
    console.log("Speech Error:", event);
    if (event?.error === "no-speech" || event?.error === "aborted") {
      setConvStatus('idle');
      setTimeout(() => {
        if (callStatus === 'active') startListening();
      }, 1000);
    }
  };

  const onSpeechEnd = () => {
    setConvStatus((prev) => {
      if (prev === 'listening') {
        setTimeout(() => {
          if (callStatus === 'active') startListening();
        }, 500);
      }
      return prev;
    });
  };

  const handleDecline = () => {
    stopCall();
    onClose();
  };

  const stopCall = async () => {
    Vibration.cancel();
    Speech.stop();
    try { SpeechRecognition?.abort?.(); } catch {}
    recognitionListeners.current.forEach(sub => sub?.remove?.());
    recognitionListeners.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (callStatus === 'incoming') return 'Incoming Call...';
    if (convStatus === 'listening') return 'Listening...';
    if (convStatus === 'thinking') return 'Thinking...';
    return formatDuration(duration);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={s.container}>
          
          <View style={s.topSection}>
            <View style={[s.avatarPlaceholder, convStatus === 'speaking' && s.avatarSpeaking]}>
              <Text style={s.avatarText}>{callerName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={s.callerName}>{callerName}</Text>
            <Text style={s.statusText}>{getStatusText()}</Text>
          </View>

          <View style={s.bottomSection}>
            {callStatus === 'incoming' ? (
              <View style={s.actionRow}>
                <TouchableOpacity style={[s.callButton, s.btnDecline]} onPress={handleDecline}>
                  <Text style={s.btnIcon}>✕</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[s.callButton, s.btnAccept]} onPress={handleAccept}>
                  <Text style={s.btnIcon}>📞</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.actionRowCenter}>
                <TouchableOpacity style={[s.callButton, s.btnDecline]} onPress={handleDecline}>
                  <Text style={s.btnIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(27, 22, 32, 0.85)',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212, 112, 143, 0.2)',
    borderWidth: 2,
    borderColor: '#D4708F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarSpeaking: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 4,
  },
  avatarText: {
    fontSize: 48,
    color: '#F5E6EB',
    fontWeight: 'bold',
  },
  callerName: {
    fontSize: 32,
    color: '#F5E6EB',
    fontWeight: '300',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    color: '#B89AA5',
  },
  bottomSection: {
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  btnAccept: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  btnDecline: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  btnIcon: {
    fontSize: 28,
    color: 'white',
  },
});
