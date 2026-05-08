// Sound monitoring is handled by shVoiceTriggerAI through expo-speech-recognition
// volumechange events. These no-op exports keep older imports from breaking.
export const startSoundDetection = () => false;
export const stopSoundDetection = () => {};
