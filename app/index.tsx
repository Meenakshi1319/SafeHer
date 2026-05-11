import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '@core/firebase';

export default function Index() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/terms');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#3A1F28', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#ff4d79" />
    </View>
  );
}
