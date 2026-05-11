import * as Location from "expo-location";
import { Alert } from "react-native";
import { apiPost } from "@core/api/client";
import { auth } from "@core/firebase";
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'MOCK_KEY_FOR_BUILD');

let SpeechRecognition = null;
let isModuleAvailable = false;

try {
  const module = require("expo-speech-recognition");
  SpeechRecognition = module.ExpoSpeechRecognitionModule;
  isModuleAvailable = true;
  console.log("✅ Speech Recognition module loaded successfully");
} catch (error) {
  console.log("❌ Speech Recognition module not available:", error.message);
  SpeechRecognition = null;
  isModuleAvailable = false;
}

const triggerWords = ["help me", "save me", "emergency", "bachao", "stop", "please help", "help"];
const loudSoundThreshold = 8;
const soundReportCooldownMs = 30000;

class VoiceHelper {
  subscriptions = [];
  shouldListen = false;
  listening = false;
  lastSoundReportAt = 0;
  permissionsGranted = false;

  isAvailable() {
    if (!isModuleAvailable || !SpeechRecognition) {
      console.log("❌ Speech Recognition not available");
      return false;
    }

    try {
      const available = SpeechRecognition.isRecognitionAvailable();
      console.log("🎤 Speech Recognition available:", available);
      return Boolean(available);
    } catch (error) {
      console.log("❌ Error checking availability:", error);
      return false;
    }
  }

  async startListening() {
    console.log("🎤 Starting voice recognition...");

    if (!isModuleAvailable || !SpeechRecognition) {
      console.log("❌ Speech Recognition module not loaded");
      return false;
    }

    if (!this.isAvailable()) {
      console.log("❌ Speech Recognition not available on this device");
      return false;
    }

    if (this.listening) {
      console.log("⚠️ Already listening");
      return true;
    }

    try {
      console.log("🔐 Requesting microphone permissions...");
      const permissions = await SpeechRecognition.requestPermissionsAsync();
      console.log("🔐 Permissions result:", permissions);

      if (!permissions.granted) {
        console.log("❌ Microphone permission denied");
        return false;
      }

      this.permissionsGranted = true;
      this.shouldListen = true;
      this.attachListeners();
      this.startRecognition();
      console.log("✅ Voice and sound safety monitor active");
      return true;
    } catch (error) {
      console.log("❌ Voice monitor start error:", error);
      console.log("Error details:", error.message);
      return false;
    }
  }

  stopListening() {
    this.shouldListen = false;
    this.listening = false;

    try {
      SpeechRecognition?.abort?.();
    } catch {}

    this.subscriptions.forEach((subscription) => subscription?.remove?.());
    this.subscriptions = [];
  }

  attachListeners() {
    if (this.subscriptions.length > 0) {
      return;
    }

    this.subscriptions = [
      SpeechRecognition.addListener("result", this.onSpeechResults),
      SpeechRecognition.addListener("volumechange", this.onVolumeChange),
      SpeechRecognition.addListener("error", this.onSpeechError),
      SpeechRecognition.addListener("end", this.onRecognitionEnd),
    ];
  }

  startRecognition() {
    if (!this.shouldListen || !SpeechRecognition) {
      console.log("⚠️ Cannot start recognition - shouldListen:", this.shouldListen, "SpeechRecognition:", !!SpeechRecognition);
      return;
    }

    try {
      console.log("🎙️ Starting speech recognition with config...");
      SpeechRecognition.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
        contextualStrings: triggerWords,
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 500,
        },
        iosVoiceProcessingEnabled: true,
        androidIntentLookup: true,
        androidRecognitionServicePackage: "com.google.android.googlequicksearchbox",
      });
      this.listening = true;
      console.log("✅ Speech recognition started successfully");
    } catch (error) {
      this.listening = false;
      console.log("❌ Voice recognition start error:", error);
      console.log("Error details:", error.message);
    }
  }

  onRecognitionEnd = () => {
    console.log("🔄 Recognition ended, restarting...");
    this.listening = false;
    if (this.shouldListen) {
      setTimeout(() => this.startRecognition(), 1000);
    }
  };

  onSpeechResults = async (event) => {
    const text = event?.results?.[0]?.transcript?.toLowerCase() || "";
    console.log("🎤 Speech detected:", text);
    
    if (!text) {
      return;
    }

    // 🧠 AI Distress Analysis using Gemini
    let aiDistressDetected = false;
    try {
      console.log("🧠 Sending transcript to Gemini for distress analysis...");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Analyze the following spoken transcript for signs of extreme distress, panic, threats, or an emergency situation. Reply ONLY with the exact word "TRUE" if the person appears to be in an emergency or danger, and "FALSE" otherwise. Transcript: "${text}"`;
      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text().trim().toUpperCase();
      aiDistressDetected = aiResponse.includes("TRUE");
      console.log(`🧠 Gemini AI Analysis Result: ${aiResponse}`);
    } catch (e) {
      console.log("❌ AI Analysis error:", e);
    }

    const keywordTriggered = triggerWords.some((word) => text.includes(word));
    
    if (!keywordTriggered && !aiDistressDetected) {
      console.log("⚠️ No trigger word or AI distress detected in:", text);
      return;
    }

    console.log("🚨 VOICE EMERGENCY DETECTED:", text);
    Alert.alert(
      "🚨 Voice Trigger Detected!",
      `Emergency phrase detected: "${text}"\n\nTriggering SOS...`,
      [{ text: "OK" }]
    );

    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.log("❌ No user ID available");
      return;
    }

    const location = await this.getCurrentLocation();

    try {
      console.log("📡 Sending voice trigger to backend...");
      await apiPost("/sensor/voice", { uid, transcript: text, location });
      console.log("✅ Voice trigger sent successfully");
    } catch (err) {
      console.log("❌ Voice trigger API error:", err);
    }
  };

  onVolumeChange = async (event) => {
    if (!event || event.value < loudSoundThreshold) {
      return;
    }

    const now = Date.now();
    if (now - this.lastSoundReportAt < soundReportCooldownMs) {
      return;
    }
    this.lastSoundReportAt = now;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const location = await this.getCurrentLocation();

    try {
      await apiPost("/sensor/sound", { uid, soundLevel: event.value, location });
      console.log("Loud sound reported to backend");
    } catch (err) {
      console.log("Sound API error:", err);
    }
  };

  onSpeechError = (event) => {
    const errorType = event?.error || "unknown";
    
    if (errorType === "aborted" || errorType === "no-speech") {
      console.log("ℹ️ Recognition stopped:", errorType);
      return;
    }
    
    console.log("❌ Voice recognition error:", {
      error: errorType,
      message: event?.message,
      full: JSON.stringify(event)
    });

    // Restart recognition on certain errors
    if (errorType === "audio" || errorType === "network") {
      console.log("🔄 Attempting to restart recognition...");
      this.listening = false;
      setTimeout(() => {
        if (this.shouldListen) {
          this.startRecognition();
        }
      }, 2000);
    }
  };

  async getCurrentLocation() {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch {
      return null;
    }
  }
}

export default new VoiceHelper();
