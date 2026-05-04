import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface RestaurantLocation {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

interface RestaurantMapProps {
  location: RestaurantLocation;
  height?: number;
  onOpenMaps?: () => void;
}

export default function RestaurantMap({ location, height = 220, onOpenMaps }: RestaurantMapProps) {
  if (!location?.latitude || !location?.longitude) {
    return (
      <View style={[styles.noLocation, { height }]}>
        <Ionicons name="map-outline" size={32} color="#bbb" />
        <Text style={styles.noLocationText}>Location not available</Text>
      </View>
    );
  }

  const { latitude, longitude } = location;

  const openMaps = async () => {
    if (onOpenMaps) {
      onOpenMaps();
      return;
    }
    const destination = `${latitude},${longitude}`;
    const urls = Platform.select({
      ios: [
        `comgooglemaps://?daddr=${destination}&directionsmode=driving`,
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      ],
      android: [
        `google.navigation:q=${destination}`,
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      ],
      default: [`https://www.google.com/maps/dir/?api=1&destination=${destination}`],
    }) || [];

    for (const url of urls) {
      try {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
      } catch {}
    }
  };

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #f0ede8; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      center: [${latitude}, ${longitude}],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var icon = L.divIcon({
      html: '<div style="background:${Colors.primary};width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: ''
    });

    L.marker([${latitude}, ${longitude}], { icon: icon, interactive: false }).addTo(map);
  </script>
</body>
</html>`;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        javaScriptEnabled
        scrollEnabled={false}
        nestedScrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      />

      {/* Tap overlay — directs to Google Maps */}
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={openMaps} activeOpacity={1} />

      {/* "Open in Maps" badge */}
      <TouchableOpacity style={styles.badge} onPress={openMaps} activeOpacity={0.85}>
        <Ionicons name="navigate" size={14} color="#fff" />
        <Text style={styles.badgeText}>Open in Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0ede8',
  },
  webview: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f3ee',
  },
  badge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  noLocation: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#F5F3EE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noLocationText: {
    fontSize: 13,
    color: '#aaa',
    fontFamily: 'PlusJakartaSans-Regular',
  },
});
