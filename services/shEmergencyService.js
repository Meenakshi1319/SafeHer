import { apiPost } from "./api";
import { auth } from "./firebase";

export const triggerSOS = async (reason) => {
  try {
    console.log("🚨 Sending SOS Alert...");
    
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.log("Cannot trigger SOS: User not logged in");
      return;
    }

    const response = await apiPost('/trigger-sos', {
      uid,
      reason: reason,
      timestamp: new Date(),
    });

    console.log("SOS Response:", response);

  } catch (error) {
    console.log("SOS Error:", error);
  }
};
