import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { apiPost, apiGet } from '@core/api/client';
import { auth } from '@core/firebase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Conditionally import MapView only on native platforms
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Circle = maps.Circle;
  Polyline = maps.Polyline;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

const riskLevels = [
  { risk: 'High Risk', color: '#E66A6A', icon: '🔴' },
  { risk: 'High Risk', color: '#E66A6A', icon: '🔴' },
  { risk: 'Moderate', color: '#f0a500', icon: '🟡' },
  { risk: 'Moderate', color: '#f0a500', icon: '🟡' },
  { risk: 'Safe', color: '#F28C82', icon: '🟢' },
  { risk: 'Safe', color: '#F28C82', icon: '🟢' },
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSteps, setShowSteps] = useState(false);

  // Real-time navigation states
  const [isNavigating, setIsNavigating] = useState(false);
  const [freePanMode, setFreePanMode] = useState(false);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [navStartTime, setNavStartTime] = useState<number | null>(null);

  const mapRef = useRef<MapView>(null);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show your position on the map.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Fetch Real-time Heatmap with user location
      try {
        const heatRes = await apiGet(`/location/heatmap?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&radius=10`);
        if (heatRes.success && heatRes.data) {
          console.log(`📍 Loaded ${heatRes.data.length} heatmap points`);
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
      
      if (routeRes.success && routeRes.routes && routeRes.routes.length > 0) {
        // Map the backend routes to UI format with real safety ratings
        const mappedRoutes = routeRes.routes.map((route: any, index: number) => {
          // Use backend's safety rating if available
          const safetyRating = route.safetyRating || route.safety || 'Safe';
          const riskScore = route.riskScore || 0;
          
          // Determine color based on safety rating
          let color = '#F28C82'; // Safe (green)
          if (safetyRating === 'Risky' || riskScore > 0.6) {
            color = '#E66A6A'; // Risky (red)
          } else if (safetyRating === 'Moderate' || riskScore > 0.3) {
            color = '#f0a500'; // Moderate (yellow)
          }

          return {
            from: 'Current Location',
            to: destination,
            time: route.duration,
            distance: route.distance,
            safety: safetyRating,
            color: color,
            via: `via ${route.summary}`,
            waypoints: route.waypoints,
            steps: route.steps || [],
            warnings: route.warnings || [],
            riskScore: riskScore
          };
        });

        console.log(`🛣️ Loaded ${mappedRoutes.length} routes with safety ratings:`, 
          mappedRoutes.map(r => `${r.safety} (${(r.riskScore * 100).toFixed(0)}%)`).join(', '));
        setSafeRoutes(mappedRoutes);
      } else {
        // Fallback if API fails - create curved route
        const latDiff = destCoords.latitude - (location?.coords.latitude || 0);
        const lngDiff = destCoords.longitude - (location?.coords.longitude || 0);
        const steps = 10;
        const waypoints = [];
        
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;
          const curve = Math.sin(progress * Math.PI) * 0.002;
          waypoints.push({
            latitude: (location?.coords.latitude || 0) + (latDiff * progress) + curve,
            longitude: (location?.coords.longitude || 0) + (lngDiff * progress) + curve
          });
        }
        
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
        setSafeRoutes([
          { 
            from: 'Current Location', 
            to: destination, 
            time: `${Math.ceil(distance * 3)} mins`, 
            distance: `${distance.toFixed(1)} km`,
            safety: 'Safe', 
            color: '#F28C82', 
            via: `via Direct Route`,
            waypoints: waypoints,
            steps: [
              {
                instruction: 'Head toward destination',
                distance: `${(distance * 0.3).toFixed(1)} km`,
                duration: `${Math.ceil(distance)} mins`,
                maneuver: 'straight'
              },
              {
                instruction: 'Continue on current road',
                distance: `${(distance * 0.5).toFixed(1)} km`,
                duration: `${Math.ceil(distance * 1.5)} mins`,
                maneuver: 'straight'
              },
              {
                instruction: 'Arrive at destination',
                distance: `${(distance * 0.2).toFixed(1)} km`,
                duration: `${Math.ceil(distance * 0.5)} mins`,
                maneuver: 'straight'
              }
            ]
          },
        ]);
      }
    } catch (err) {
      console.log('Safe route fetch error:', err);
      // Fallback - create curved route
      const latDiff = destCoords.latitude - (location?.coords.latitude || 0);
      const lngDiff = destCoords.longitude - (location?.coords.longitude || 0);
      const steps = 10;
      const waypoints = [];
      
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const curve = Math.sin(progress * Math.PI) * 0.002;
        waypoints.push({
          latitude: (location?.coords.latitude || 0) + (latDiff * progress) + curve,
          longitude: (location?.coords.longitude || 0) + (lngDiff * progress) + curve
        });
      }
      
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
      setSafeRoutes([
        { 
          from: 'Current Location', 
          to: destination, 
          time: `${Math.ceil(distance * 3)} mins`, 
          distance: `${distance.toFixed(1)} km`,
          safety: 'Safe', 
          color: '#F28C82', 
          via: `via Direct Route`,
          waypoints: waypoints,
          steps: [
            {
              instruction: 'Head toward destination',
              distance: `${(distance * 0.3).toFixed(1)} km`,
              duration: `${Math.ceil(distance)} mins`,
              maneuver: 'straight'
            },
            {
              instruction: 'Continue on current road',
              distance: `${(distance * 0.5).toFixed(1)} km`,
              duration: `${Math.ceil(distance * 1.5)} mins`,
              maneuver: 'straight'
            },
            {
              instruction: 'Arrive at destination',
              distance: `${(distance * 0.2).toFixed(1)} km`,
              duration: `${Math.ceil(distance * 0.5)} mins`,
              maneuver: 'straight'
            }
          ]
        },
      ]);
    }
    
    setShowRoutes(true);
  }

  // ── Real-time location watcher ────────────────────────────
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2, timeInterval: 1000 },
        (loc) => {
          setLocation(loc);
          setSpeed(loc.coords.speed ? Math.max(0, loc.coords.speed * 3.6) : 0); // m/s → km/h
          if (loc.coords.heading != null && loc.coords.heading >= 0) {
            setHeading(loc.coords.heading);
          }
        },
      );
      locationWatcherRef.current = sub;
    })();
    return () => { sub?.remove(); };
  }, []);

  // ── Camera follow when navigating ─────────────────────────
  useEffect(() => {
    if (!isNavigating || freePanMode || !location) return;
    mapRef.current?.animateCamera(
      {
        center: { latitude: location.coords.latitude, longitude: location.coords.longitude },
        pitch: 60,
        heading: heading,
        zoom: 18,
      },
      { duration: 800 },
    );
  }, [location, heading, isNavigating, freePanMode]);

  const startNavigation = useCallback(() => {
    const currentRoute = safeRoutes[selectedRoute];
    if (!currentRoute) {
      Alert.alert('Route unavailable', 'Please search for a destination first.');
      return;
    }
    setIsNavigating(true);
    setFreePanMode(false);
    setNavStartTime(Date.now());
    setCurrentStepIndex(0);
    setShowSteps(false);
    // Animate to 3D view
    if (location) {
      mapRef.current?.animateCamera(
        {
          center: { latitude: location.coords.latitude, longitude: location.coords.longitude },
          pitch: 60,
          heading: heading,
          zoom: 18,
        },
        { duration: 1000 },
      );
    }
  }, [safeRoutes, selectedRoute, location, heading]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setFreePanMode(false);
    setNavStartTime(null);
    setCurrentStepIndex(0);
    setShowSteps(false);
    // Reset to top-down view
    if (location) {
      mapRef.current?.animateCamera(
        {
          center: { latitude: location.coords.latitude, longitude: location.coords.longitude },
          pitch: 0,
          heading: 0,
          zoom: 15,
        },
        { duration: 800 },
      );
    }
  }, [location]);

  const recenterMap = useCallback(() => {
    setFreePanMode(false);
    if (location) {
      mapRef.current?.animateCamera(
        {
          center: { latitude: location.coords.latitude, longitude: location.coords.longitude },
          pitch: isNavigating ? 60 : 0,
          heading: isNavigating ? heading : 0,
          zoom: isNavigating ? 18 : 15,
        },
        { duration: 600 },
      );
    }
  }, [location, isNavigating, heading]);

  const getElapsedTime = () => {
    if (!navStartTime) return '0:00';
    const secs = Math.floor((Date.now() - navStartTime) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getCurrentStep = () => {
    const currentRoute = safeRoutes[selectedRoute];
    if (!currentRoute || !currentRoute.steps || currentRoute.steps.length === 0) {
      return null;
    }
    return currentRoute.steps[currentStepIndex] || null;
  };

  const getManeuverIcon = (maneuver: string) => {
    const icons: any = {
      'turn-left': '↰',
      'turn-right': '↱',
      'turn-slight-left': '↖',
      'turn-slight-right': '↗',
      'turn-sharp-left': '⬅',
      'turn-sharp-right': '➡',
      'uturn-left': '↶',
      'uturn-right': '↷',
      'merge': '⤴',
      'roundabout-left': '⟲',
      'roundabout-right': '⟳',
      'straight': '↑',
      'ramp-left': '↖',
      'ramp-right': '↗',
      'fork-left': '⤴',
      'fork-right': '⤴',
    };
    return icons[maneuver] || '↑';
  };

  const filters = ['All', 'High Risk', 'Moderate', 'Safe'];
  const filtered = activeFilter === 'All'
    ? dangerZones
    : dangerZones.filter(z => z.risk === activeFilter);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── FULL-SCREEN MAP (always visible) ─────────────── */}
      <View style={[styles.fullMap, !isNavigating && styles.previewMap]}>
        {Platform.OS === 'web' ? (
          <View style={styles.loadingMap}>
            <Text style={{ color: '#F2EDE8', fontSize: 16, textAlign: 'center' }}>
              📱 Map navigation is available on the mobile app
            </Text>
            <Text style={{ color: '#D8A46B', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
              Please use the Android or iOS app for full map features
            </Text>
          </View>
        ) : location && MapView ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            rotateEnabled={true}
            pitchEnabled={true}
            onPanDrag={() => { if (isNavigating) setFreePanMode(true); }}
          >
            {/* Heatmap circles */}
            {heatmapData.map((point, i) => Circle && (
              <Circle
                key={`heat-${i}`}
                center={{ latitude: point.latitude, longitude: point.longitude }}
                radius={point.intensity * 1000}
                fillColor={`rgba(230, 106, 106, ${point.intensity * 0.4})`}
                strokeColor={`rgba(230, 106, 106, ${point.intensity * 0.8})`}
              />
            ))}

            {/* Route polyline */}
            {showRoutes && safeRoutes[selectedRoute]?.waypoints && Polyline && (
              <Polyline
                coordinates={safeRoutes[selectedRoute].waypoints}
                strokeWidth={isNavigating ? 6 : 4}
                strokeColor={safeRoutes[selectedRoute].color || '#F28C82'}
              />
            )}

            {/* Destination marker */}
            {destinationCoords && Marker && (
              <Marker coordinate={destinationCoords} title={destination || 'Destination'}>
                <View style={styles.destMarker}>
                  <Text style={styles.destMarkerText}>📍</Text>
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View style={styles.loadingMap}>
            <Text style={{ color: '#F2EDE8', fontSize: 14 }}>📡 Getting your location...</Text>
          </View>
        )}

        {/* ── Re-center Button (visible when panned away) ── */}
        {freePanMode && (
          <TouchableOpacity style={styles.recenterBtn} onPress={recenterMap}>
            <Text style={styles.recenterText}>📍 Re-center</Text>
          </TouchableOpacity>
        )}

        {/* ── My Location Button (always visible on map) ── */}
        {!freePanMode && !isNavigating && (
          <TouchableOpacity style={styles.myLocationBtn} onPress={recenterMap}>
            <Text style={{ fontSize: 18 }}>◎</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── NAVIGATION DASHBOARD (visible during nav) ───── */}
      {isNavigating && (
        <View style={styles.navDashboard}>
          {/* Current Step Display */}
          {getCurrentStep() && (
            <TouchableOpacity 
              style={styles.navCurrentStep}
              onPress={() => setShowSteps(!showSteps)}
            >
              <View style={styles.navManeuverIcon}>
                <Text style={styles.navManeuverText}>{getManeuverIcon(getCurrentStep()?.maneuver || 'straight')}</Text>
              </View>
              <View style={styles.navStepInfo}>
                <Text style={styles.navStepInstruction} numberOfLines={2}>
                  {getCurrentStep()?.instruction || 'Continue on current route'}
                </Text>
                <Text style={styles.navStepDistance}>
                  {getCurrentStep()?.distance || '—'} • {getCurrentStep()?.duration || '—'}
                </Text>
              </View>
              <Text style={styles.navExpandIcon}>{showSteps ? '▼' : '▶'}</Text>
            </TouchableOpacity>
          )}

          {/* All Steps List (expandable) */}
          {showSteps && safeRoutes[selectedRoute]?.steps && (
            <ScrollView style={styles.navStepsList} showsVerticalScrollIndicator={false}>
              {safeRoutes[selectedRoute].steps.map((step: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.navStepItem,
                    index === currentStepIndex && styles.navStepItemActive
                  ]}
                  onPress={() => setCurrentStepIndex(index)}
                >
                  <Text style={styles.navStepNumber}>{index + 1}</Text>
                  <Text style={styles.navStepIcon}>{getManeuverIcon(step.maneuver)}</Text>
                  <View style={styles.navStepDetails}>
                    <Text style={[
                      styles.navStepText,
                      index === currentStepIndex && styles.navStepTextActive
                    ]} numberOfLines={2}>
                      {step.instruction}
                    </Text>
                    <Text style={styles.navStepMeta}>{step.distance}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.navStats}>
            <View style={styles.navStatItem}>
              <Text style={styles.navStatValue}>{Math.round(speed)}</Text>
              <Text style={styles.navStatLabel}>km/h</Text>
            </View>
            <View style={styles.navStatDivider} />
            <View style={styles.navStatItem}>
              <Text style={styles.navStatValue}>{safeRoutes[selectedRoute]?.time || '—'}</Text>
              <Text style={styles.navStatLabel}>ETA</Text>
            </View>
            <View style={styles.navStatDivider} />
            <View style={styles.navStatItem}>
              <Text style={styles.navStatValue}>{safeRoutes[selectedRoute]?.distance || '—'}</Text>
              <Text style={styles.navStatLabel}>Distance</Text>
            </View>
          </View>
          <View style={styles.navRouteInfo}>
            <View style={[styles.navSafetyBadge, { backgroundColor: (safeRoutes[selectedRoute]?.color || '#F28C82') + '30' }]}>
              <Text style={[styles.navSafetyText, { color: safeRoutes[selectedRoute]?.color || '#F28C82' }]}>
                {safeRoutes[selectedRoute]?.safety || 'Safe'}
              </Text>
            </View>
            <Text style={styles.navRouteVia}>{safeRoutes[selectedRoute]?.via || ''}</Text>
          </View>
          <TouchableOpacity style={styles.navStopBtn} onPress={stopNavigation}>
            <Text style={styles.navStopText}>✕ End Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── BROWSE MODE UI (hidden during navigation) ──── */}
      {!isNavigating && (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.browseScroll}>
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
                placeholderTextColor="#8B6F74"
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
              <TouchableOpacity style={styles.startBtn} onPress={startNavigation}>
                <Text style={styles.startBtnText}>▶ Start Safe Navigation</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Legend */}
          <View style={styles.legendRow}>
            {[
              { color: '#E66A6A', label: 'High Risk' },
              { color: '#f0a500', label: 'Moderate' },
              { color: '#F28C82', label: 'Safe' },
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A1F28',
  },
  // ── Map ──────────────────────────────────────────
  fullMap: {
    flex: 1,
    backgroundColor: '#1B1620',
  },
  previewMap: {
    height: SCREEN_HEIGHT * 0.35,
    flex: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B1620',
  },
  destMarker: { alignItems: 'center' },
  destMarkerText: { fontSize: 28 },

  // ── Floating map buttons ────────────────────────
  recenterBtn: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#1B1620',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E66A6A',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  recenterText: {
    color: '#F5E6D3',
    fontSize: 13,
    fontWeight: '600',
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: '#1B1620',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8B6F74',
    elevation: 4,
  },

  // ── Navigation Dashboard ────────────────────────
  navDashboard: {
    backgroundColor: '#1B1620',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  navCurrentStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D3B4B',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E66A6A',
  },
  navManeuverIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E66A6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navManeuverText: {
    fontSize: 28,
    color: '#F5E6D3',
  },
  navStepInfo: {
    flex: 1,
  },
  navStepInstruction: {
    color: '#F5E6D3',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  navStepDistance: {
    color: '#D8A46B',
    fontSize: 12,
  },
  navExpandIcon: {
    color: '#D8A46B',
    fontSize: 16,
  },
  navStepsList: {
    maxHeight: 200,
    backgroundColor: '#3A1F28',
    borderRadius: 12,
    padding: 8,
  },
  navStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  navStepItemActive: {
    backgroundColor: '#6D3B4B',
    borderWidth: 1,
    borderColor: '#E66A6A',
  },
  navStepNumber: {
    color: '#D8A46B',
    fontSize: 12,
    fontWeight: '700',
    width: 20,
  },
  navStepIcon: {
    fontSize: 20,
  },
  navStepDetails: {
    flex: 1,
  },
  navStepText: {
    color: 'rgba(245,230,211,0.7)',
    fontSize: 13,
    marginBottom: 2,
  },
  navStepTextActive: {
    color: '#F5E6D3',
    fontWeight: '500',
  },
  navStepMeta: {
    color: '#D8A46B',
    fontSize: 11,
  },
  navStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navStatItem: { alignItems: 'center', flex: 1 },
  navStatValue: {
    color: '#F5E6D3',
    fontSize: 20,
    fontWeight: '700',
  },
  navStatLabel: {
    color: '#D8A46B',
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  navStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#8B6F74',
  },
  navRouteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navSafetyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  navSafetyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  navRouteVia: {
    color: '#F2EDE8',
    fontSize: 13,
    flex: 1,
  },
  navStopBtn: {
    backgroundColor: '#E66A6A',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  navStopText: {
    color: '#F5E6D3',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Browse mode scroll ──────────────────────────
  browseScroll: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    color: '#F5E6D3',
    fontSize: 20,
    fontWeight: '500',
  },
  subtitle: {
    color: '#F2EDE8',
    fontSize: 12,
    marginTop: 4,
  },
  searchSection: {
    marginHorizontal: 20,
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
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
  locationText: {
    color: '#F2EDE8',
    fontSize: 13,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#3A1F28',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 10,
    padding: 12,
    color: '#F5E6D3',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#E66A6A',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#F5E6D3',
    fontWeight: '600',
    fontSize: 14,
  },
  routesSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    color: '#D8A46B',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
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
    color: '#F5E6D3',
    fontSize: 13,
    fontWeight: '500',
  },
  routeTime: {
    color: '#D8A46B',
    fontSize: 11,
    marginTop: 2,
  },
  routeSelected: {
    fontSize: 18,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: '#E66A6A',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  startBtnText: {
    color: '#F5E6D3',
    fontSize: 14,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginHorizontal: 20,
    marginBottom: 12,
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
    color: '#F2EDE8',
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
    borderColor: '#8B6F74',
  },
  filterChipActive: {
    backgroundColor: '#E66A6A20',
    borderColor: '#E66A6A',
  },
  filterText: {
    color: '#D8A46B',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#E66A6A',
  },
  zoneList: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 20,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6D3B4B',
    borderWidth: 0.5,
    borderColor: '#8B6F74',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  zoneIcon: { fontSize: 22 },
  zoneInfo: { flex: 1 },
  zoneArea: {
    color: '#F5E6D3',
    fontSize: 13,
    fontWeight: '500',
  },
  zoneReports: {
    color: '#D8A46B',
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

