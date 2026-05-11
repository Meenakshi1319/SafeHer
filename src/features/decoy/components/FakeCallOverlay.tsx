import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { apiPost } from '@core/api/client';
import { auth } from '@core/firebase';

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
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionListeners = useRef<any[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Reset state when overlay opens
  useEffect(() => {
    const toggleStealth = async (enabled: boolean) => {
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          await apiPost('/ai/stealth/toggle', { uid, enabled });
        }
      } catch (err) {
        console.log("Failed to toggle stealth mode:", err);
      }
    };

    if (visible) {
      setCallStatus('incoming');
      setConvStatus('idle');
      setDuration(0);
      setChatHistory([]);
      Vibration.vibrate([1000, 2000], true);
      
      toggleStealth(true);
      
      // Request mic permission silently if available
      if (SpeechRecognition) {
        SpeechRecognition.requestPermissionsAsync();
      }
    } else {
      stopCall();
      toggleStealth(false);
    }
    return () => { 
      stopCall(); 
      if (visible) toggleStealth(false);
    };
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
        const fileUri = (FileSystem as any).cacheDirectory + 'reply.mp3';
        await (FileSystem as any).writeAsStringAsync(fileUri, audioBase64, {
          encoding: (FileSystem as any).EncodingType?.Base64 ?? 'base64',
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
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1B1620' }]}>
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
    backgroundColor: '#1B1620',
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
    backgroundColor: '#6D3B4B',
    borderWidth: 2,
    borderColor: '#8B6F74',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarSpeaking: {
    borderColor: '#F28C82',
    backgroundColor: '#6D3B4B',
    borderWidth: 4,
  },
  avatarText: {
    fontSize: 48,
    color: '#F2EDE8',
    fontWeight: 'bold',
  },
  callerName: {
    fontSize: 32,
    color: '#F2EDE8',
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
    backgroundColor: '#F28C82',
    shadowColor: '#F28C82',
  },
  btnDecline: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  btnIcon: {
    fontSize: 28,
    color: '#F5E6D3',
  },
});
