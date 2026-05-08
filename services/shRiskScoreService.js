import { apiGet, apiPost } from "./api";
import { auth } from "./firebase";
import { startAutoRecording } from "./shAutoVideoRecorder";

let riskScore = 0;

/*
Multi-Level Risk Score System

0 – 30   → Low Risk → No Alert
31 – 60  → Medium Risk → Family + Trusted Contacts
61 – 85  → High Risk → Family + Volunteers + NGO
86 – 100 → Very High Risk → Police + Emergency Services

NOTE: The backend's /update-risk endpoint handles all emergency escalation
(Firestore saves, SMS dispatch, socket events). We do NOT call triggerSOS
here to avoid double-triggering alerts.
*/

export const addRiskScore = async (value, reason) => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Send the risk delta to the backend — backend handles all escalation logic
    const res = await apiPost('/update-risk', { uid, value, reason, source: 'ai_sensor' });
    
    // Update local score based on backend response, capped at 100
    riskScore = res.score !== undefined ? res.score : Math.min(riskScore + value, 100);

    console.log("================================");
    console.log(`Risk Added: +${value}`);
    console.log(`Reason: ${reason}`);
    console.log(`Current Risk Score: ${riskScore}`);
    console.log("================================");

    // Log risk level locally for debugging
    if (riskScore <= 30) {
      console.log("🟢 LOW RISK — No local action needed");
    } else if (riskScore <= 60) {
      console.log("🟡 MEDIUM RISK — Backend notifying Family + Trusted Contacts");
    } else if (riskScore <= 85) {
      console.log("🟠 HIGH RISK — Backend notifying Family + Volunteers + NGO");
      // Start local recording as a supplementary action
      await startAutoRecording();
    } else {
      console.log("🔴 VERY HIGH RISK — Backend notifying Police + Emergency Services");
      await startAutoRecording();
    }

  } catch (error) {
    console.log(error);
  }
};

export const resetRiskScore = async () => {
  riskScore = 0;
  console.log("Risk Score Reset");
  
  const uid = auth.currentUser?.uid;
  if (uid) {
    try {
      await apiPost('/reset-risk', { uid });
    } catch(e) {}
  }
};

export const getCurrentRiskScore = () => {
  return riskScore;
};

// Helper to fetch and sync score from backend on app start
export const syncRiskScore = async () => {
  const uid = auth.currentUser?.uid;
  if (uid) {
    try {
      const res = await apiGet(`/risk/${uid}`);
      if (res.success && res.riskScore !== undefined) {
        riskScore = res.riskScore;
      }
    } catch(e) {}
  }
};
