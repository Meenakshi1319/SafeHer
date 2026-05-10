import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111120',
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarActiveTintColor: '#ff4d79',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'SOS',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛡️</Text>,
        }}
      />
      {/* Hidden screens — accessible via router.push from Profile */}
      <Tabs.Screen name="decoy"     options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="explore"   options={{ href: null }} />
      <Tabs.Screen name="checkin"   options={{ href: null }} />
      <Tabs.Screen name="tracking"  options={{ href: null }} />
      <Tabs.Screen name="voice-test" options={{ href: null }} />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="escalation"
        options={{
          title: 'Alerts',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🚨</Text>,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🤖</Text>,
        }}
      />
      <Tabs.Screen
        name="risk"
        options={{
          title: 'Risk',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🧠</Text>,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📞</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
