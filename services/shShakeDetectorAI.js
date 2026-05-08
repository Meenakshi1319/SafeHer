import * as Location from "expo-location";
import { apiPost } from "./api";
import { auth } from "./firebase";
import { addRiskScore } from "./shRiskScoreService";

// Note: react-native-shake requires a native module.
// We already have useShakeDetector hook using expo-sensors as primary.
// This file provides an alternative using RNShake if available.
let RNShake = null;
try {
  const moduleName = "react-native-shake";
  RNShake = require(moduleName).default;
} catch {
  RNShake = null;
}

let subscription = null;

export const startShakeDetection = () => {
  if (!RNShake) {
    return false;
  }

  subscription = RNShake.addListener(async () => {
    console.log("📱 Phone Shake Detected (RNShake)");
    addRiskScore(20, "Phone Shake Detected");

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    let location = null;
    try {
      const loc = await Location.getCurrentPositionAsync({});
      location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch {}

    try {
      await apiPost("/sensor/shake", { uid, location });
    } catch (err) {
      console.log("Shake API error:", err);
    }
  });
  return true;
};

export const stopShakeDetection = () => {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
};
