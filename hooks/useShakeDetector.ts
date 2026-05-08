import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { apiPost } from '../services/api';
import { auth } from '../services/firebase';

const THRESHOLD = 1.8; // G-force threshold
const SHAKE_DELAY = 1000; // Reset count if more than 1s between shakes
const REQUIRED_SHAKES = 3;

export function useShakeDetector(onShake: () => void, onProgress?: (count: number) => void, isActive: boolean = true) {
  const lastShakeTime = useRef(0);
  const shakeCount = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    Accelerometer.setUpdateInterval(100);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const gForce = Math.sqrt(x * x + y * y + z * z);
      
      if (gForce > THRESHOLD) {
        const now = Date.now();
        // Debounce individual shakes
        if (now - lastShakeTime.current > 200) {
          // If too much time passed since last shake, reset count
          if (now - lastShakeTime.current > SHAKE_DELAY) {
            shakeCount.current = 1;
          } else {
            shakeCount.current += 1;
          }
          
          lastShakeTime.current = now;
          if (onProgress) onProgress(shakeCount.current);

          if (shakeCount.current >= REQUIRED_SHAKES) {
            shakeCount.current = 0;
            if (onProgress) onProgress(0);
            
            // Notify backend
            const uid = auth.currentUser?.uid;
            if (uid) {
              apiPost('/sensor/shake', { uid }).catch((err) => {
                console.log('Shake API error:', err);
              });
            }

            onShake();
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onShake, onProgress, isActive]);
}
