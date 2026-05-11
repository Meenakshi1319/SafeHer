import { apiPost } from "@core/api/client";
import { auth } from "@core/firebase";

let isRecording = false;

export const startAutoRecording = async () => {
  try {
    if (isRecording) return;
    
    isRecording = true;
    console.log("🎥 Automatic Video Recording Started");

    const uid = auth.currentUser?.uid;
    if (uid) {
      await apiPost('/recording/start', { uid, reason: 'High Risk Auto Recording' });
    }

    // Future:
    // Camera package integration
    // Save video
    // Upload to backend/Firebase via /upload-evidence

  } catch (error) {
    console.log(error);
  }
};

export const stopAutoRecording = async () => {
  try {
    isRecording = false;
    console.log("🛑 Video Recording Stopped");
    
    const uid = auth.currentUser?.uid;
    if (uid) {
      await apiPost('/recording/stop', { uid });
    }
  } catch (error) {
    console.log(error);
  }
};
