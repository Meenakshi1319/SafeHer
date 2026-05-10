import * as Location from "expo-location";
import { apiPost } from "./api";
import { auth } from "./firebase";

let SpeechRecognition = null;

try {
  SpeechRecognition = require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch {
  SpeechRecognition = null;
}

const triggerWords = ["help me", "save me", "emergency", "bachao", "stop", "please help"];
const loudSoundThreshold = 8;
const soundReportCooldownMs = 30000;

class VoiceHelper {
  subscriptions = [];
  shouldListen = false;
  listening = false;
  lastSoundReportAt = 0;

  isAvailable() {
    try {
      return Boolean(SpeechRecognition?.isRecognitionAvailable?.());
    } catch {
      return false;
    }
  }

  async startListening() {
    if (!this.isAvailable() || this.listening) {
      return false;
    }

    try {
      const permissions = await SpeechRecognition.requestPermissionsAsync();
      if (!permissions.granted) {
        return false;
      }

      this.shouldListen = true;
      this.attachListeners();
      this.startRecognition();
      console.log("Voice and sound safety monitor active");
      return true;
    } catch (error) {
      console.log("Voice monitor start error:", error);
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
      return;
    }

    try {
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
      });
      this.listening = true;
    } catch (error) {
      this.listening = false;
      console.log("Voice recognition start error:", error);
    }
  }

  onRecognitionEnd = () => {
    this.listening = false;
    if (this.shouldListen) {
      setTimeout(() => this.startRecognition(), 1000);
    }
  };

  onSpeechResults = async (event) => {
    const text = event?.results?.[0]?.transcript?.toLowerCase() || "";
    if (!text) {
      return;
    }

    const triggered = triggerWords.some((word) => text.includes(word));
    if (!triggered) {
      return;
    }

    console.log("Voice trigger detected");

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const location = await this.getCurrentLocation();

    try {
      await apiPost("/sensor/voice", { uid, transcript: text, location });
    } catch (err) {
      console.log("Voice trigger API error:", err);
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
    if (event?.error === "aborted" || event?.error === "no-speech") {
      return;
    }
    console.log("Voice recognition error:", event?.message || event?.error || event);
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
