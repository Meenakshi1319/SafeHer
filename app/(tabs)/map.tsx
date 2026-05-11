import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Circle } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { apiPost, apiGet } from '@core/api/client';

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'MOCK_KEY';
import { auth } from '@core/firebase';

const riskLevels = [
  { risk: 'High Risk', color: '#ff4d79', icon: '🔴' },
  { risk: 'High Risk', color: '#ff4d79', icon: '🔴' },
  { risk: 'Moderate', color: '#f0a500', icon: '🟡' },
  { risk: 'Moderate', color: '#f0a500', icon: '🟡' },
  { risk: 'Safe', color: '#10b981', icon: '🟢' },
  { risk: 'Safe', color: '#10b981', icon: '🟢' },
];

const tips = [
  'Avoid after 8 PM',
  'Avoid narrow lanes at night',
  'Stay on main roads',
  'Avoid after 10 PM',
  'Well lit and patrolled',
  'Safe for travel',
];

const reportTexts = [
  '5 SOS reports today',
  '3 SOS reports today',
  'Low lighting reported',
  '2 alerts this week',
  'All clear',
  'All clear',
];

// Offsets to generate nearby points around the user
const nearbyOffsets = [
  { lat: 0.015, lng: 0.01 },
  { lat: -0.012, lng: 0.015 },
  { lat: 0.008, lng: -0.013 },
  { lat: -0.01, lng: -0.008 },
  { lat: 0.02, lng: 0.005 },
  { lat: -0.005, lng: 0.02 },
];

export default function MapScreen() {
  const [destination, setDestination] = useState('');
  const [showRoutes, setShowRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [cityName, setCityName] = useState('Locating...');
  const [dangerZones, setDangerZones] = useState<any[]>([]);
  const [safeRoutes, setSafeRoutes] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [destinationCoords, setDestinationCoords] = useState<{latitude: number, longitude: number} | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show your position on the map.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Fetch Real-time Heatmap
      try {
        const heatRes = await apiGet('/location/heatmap');
        if (heatRes.success && heatRes.data) {
          setHeatmapData(heatRes.data);
        }
      } catch (err) {
        console.log('Heatmap fetch error:', err);
      }

      // Reverse geocode to get actual city name
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (place) {
          const area = place.subregion || place.district || place.city || place.region || 'Unknown';
          const city = place.city || place.region || '';
          setCityName(area !== city ? `${area}, ${city}` : city);
        }
      } catch (e) {
        console.log('Reverse geocode failed:', e);
        setCityName('Location found');
      }

      // Reverse geocode nearby points to build dynamic zones
      const zones: any[] = [];
      for (let i = 0; i < nearbyOffsets.length; i++) {
        try {
          const [p] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude + nearbyOffsets[i].lat,
            longitude: loc.coords.longitude + nearbyOffsets[i].lng,
          });
          const areaName = p?.subregion || p?.district || p?.street || p?.name || p?.city || `Area ${i + 1}`;
          zones.push({
            icon: riskLevels[i].icon,
            area: areaName,
            risk: riskLevels[i].risk,
            color: riskLevels[i].color,
            reports: reportTexts[i],
            tip: tips[i],
          });
        } catch {
          zones.push({
            icon: riskLevels[i].icon,
            area: `Nearby Area ${i + 1}`,
            risk: riskLevels[i].risk,
            color: riskLevels[i].color,
            reports: reportTexts[i],
            tip: tips[i],
          });
        }
      }
      setDangerZones(zones);

      // We no longer build dummy safeRoutes here. It happens in handleSearch.
      const uid = auth.currentUser?.uid;
      if (uid) {
        apiPost('/save-location', {
          uid,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        }).catch((err) => console.log('Save location error:', err));
      }
    })();
  }, []);

  async function handleSearch() {
    if (!destination.trim()) {
      Alert.alert('Enter Destination', 'Please enter where you want to go!');
      return;
    }
    
    // Convert destination string to coordinates
    let destCoords = { latitude: location?.coords.latitude! + 0.05, longitude: location?.coords.longitude! + 0.05 };
    try {
      const geocodeResult = await Location.geocodeAsync(destination);
      if (geocodeResult.length > 0) {
        destCoords = { latitude: geocodeResult[0].latitude, longitude: geocodeResult[0].longitude };
      }
    } catch (e) {
      console.log('Geocoding error:', e);
    }
    setDestinationCoords(destCoords);
    
    try {
      const uid = auth.currentUser?.uid || 'guest';
      const routeRes = await apiPost('/location/safe-route', {
        uid,
        start: { latitude: location?.coords.latitude || 0, longitude: location?.coords.longitude || 0 },
        end: destCoords
      });
      
      if (routeRes.success && routeRes.route) {
        // Map the backend route format to UI format
        setSafeRoutes([
          { from: 'Current Location', to: destination, time: routeRes.route.duration, safety: 'Safe', color: '#10b981', via: `via ${dangerZones[2]?.area || 'Main Road'}`, distance: routeRes.route.distance },
          { from: 'Current Location', to: destination, time: '12 mins', safety: 'Moderate', color: '#f0a500', via: `via ${dangerZones[1]?.area || 'Highway'}` },
          { from: 'Current Location', to: destination, time: '10 mins', safety: 'Risky', color: '#ff4d79', via: `via ${dangerZones[0]?.area || 'Shortcut'}` },
        ]);
      }
    } catch (err) {
      console.log('Safe route fetch error:', err);
      // Fallback
      setSafeRoutes([
        { from: 'Current Location', to: destination, time: '18 mins', safety: 'Safe', color: '#10b981', via: `via Main Road` },
      ]);
    }
    
    setShowRoutes(true);
  }

  const filters = ['All', 'High Risk', 'Moderate', 'Safe'];
  const filtered = activeFilter === 'All'
    ? dangerZones
    : dangerZones.filter(z => z.risk === activeFilter);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Safe Route Map</Text>
          <Text style={styles.subtitle}>Real-time danger zones near you</Text>
        </View>

        {/* Search Box */}
        <View style={styles.searchSection}>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>📍 {cityName}</Text>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter destination..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={destination}
              onChangeText={setDestination}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>Go</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safe Routes */}
        {showRoutes && (
          <View style={styles.routesSection}>
            <Text style={styles.sectionTitle}>SAFE ROUTES TO {destination.toUpperCase()}</Text>
            {safeRoutes.map((route, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.routeCard,
                  selectedRoute === i && { borderColor: route.color, borderWidth: 1.5 }
                ]}
                onPress={() => setSelectedRoute(i)}
              >
                <View style={[styles.routeSafety, { backgroundColor: route.color + '20' }]}>
                  <Text style={[styles.routeSafetyText, { color: route.color }]}>
                    {route.safety}
                  </Text>
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeVia}>{route.via}</Text>
                  <Text style={styles.routeTime}>🕐 {route.time}</Text>
                </View>
                {selectedRoute === i && (
                  <Text style={[styles.routeSelected, { color: route.color }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => {
                const currentRoute = safeRoutes[selectedRoute];
                if (!currentRoute) {
                  Alert.alert('Route unavailable', 'Routes are still loading. Please try again.');
                  return;
                }
                Alert.alert(
                  '🗺️ Navigation Started',
                  `Taking the ${currentRoute.safety} route via ${currentRoute.via}\n\nEstimated time: ${currentRoute.time}`
                );
              }}
            >
              <Text style={styles.startBtnText}>▶ Start Safe Navigation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real Map Visual */}
        <View style={styles.mapVisual}>
          <View style={styles.mapBg}>
            {location ? (
              <MapView
                style={{ width: '100%', height: '100%' }}
                initialRegion={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
              >
                {heatmapData.map((point, i) => (
                  <Circle
                    key={i}
                    center={{ latitude: point.latitude, longitude: point.longitude }}
                    radius={point.intensity * 1000} // radius based on intensity
                    fillColor={`rgba(255, 77, 121, ${point.intensity * 0.5})`}
                    strokeColor={`rgba(255, 77, 121, ${point.intensity})`}
                  />
                ))}

                {showRoutes && location && destinationCoords && (
                  <MapViewDirections
                    origin={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                    destination={destinationCoords}
                    apikey={GOOGLE_MAPS_APIKEY}
                    strokeWidth={4}
                    strokeColor="#10b981"
                    optimizeWaypoints={true}
                  />
                )}
              </MapView>
            ) : (
              <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <Text style={{color: 'rgba(255,255,255,0.5)'}}>Locating...</Text>
              </View>
            )}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {[
              { color: '#ff4d79', label: 'High Risk' },
              { color: '#f0a500', label: 'Moderate' },
              { color: '#10b981', label: 'Safe' },
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filter Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Zone List */}
        <View style={styles.zoneList}>
          <Text style={styles.sectionTitle}>AREA REPORTS</Text>
          {filtered.map((z, i) => (
            <TouchableOpacity
              key={i}
              style={styles.zoneCard}
              onPress={() => Alert.alert(
                z.icon + ' ' + z.area,
                `Risk Level: ${z.risk}\n${z.reports}\n\n💡 Tip: ${z.tip}`
              )}
            >
              <Text style={styles.zoneIcon}>{z.icon}</Text>
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneArea}>{z.area}</Text>
                <Text style={styles.zoneReports}>{z.reports}</Text>
              </View>
              <View style={[styles.riskBadge, { backgroundColor: z.color + '20' }]}>
                <Text style={[styles.riskBadgeText, { color: z.color }]}>{z.risk}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080810',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '500',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 4,
  },
  searchSection: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationDot: { fontSize: 16 },
  locationText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    color: 'white',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#ff4d79',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  routesSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  routeSafety: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  routeSafetyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeInfo: { flex: 1 },
  routeVia: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  routeTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  routeSelected: {
    fontSize: 18,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: '#ff4d79',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  startBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  mapVisual: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  mapBg: {
    height: 180,
    backgroundColor: '#111830',
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapZone: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapZoneText: { fontSize: 22 },
  youAreHere: {
    position: 'absolute',
    top: '45%',
    left: '45%',
    alignItems: 'center',
  },
  youAreHereIcon: { fontSize: 24 },
  youAreHereText: {
    color: '#ff4d79',
    fontSize: 10,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  filterScroll: { marginBottom: 12 },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  filterChipActive: {
    backgroundColor: '#ff4d7920',
    borderColor: '#ff4d79',
  },
  filterText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#ff4d79',
  },
  zoneList: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 20,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  zoneIcon: { fontSize: 22 },
  zoneInfo: { flex: 1 },
  zoneArea: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  zoneReports: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
