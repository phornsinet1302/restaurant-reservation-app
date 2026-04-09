import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface WebMapPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  onDetectLocation: () => void;
  height?: number;
}

export default function WebMapPicker({
  latitude,
  longitude,
  onLocationChange,
  onDetectLocation,
  height = 300,
}: WebMapPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'locationSelected') {
          onLocationChange(data.lat, data.lng);
        } else if (data.type === 'mapReady') {
          readyRef.current = true;
        }
      } catch {}
    },
    [onLocationChange],
  );

  // When parent lat/lng change (e.g. after GPS detect), update the map
  useEffect(() => {
    if (readyRef.current) {
      webViewRef.current?.injectJavaScript(`
        if (window.updateMarker) window.updateMarker(${latitude}, ${longitude});
        true;
      `);
    }
  }, [latitude, longitude]);

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .hint {
      position: absolute; bottom: 12px; left: 50%;
      transform: translateX(-50%);
      background: rgba(47,37,24,0.85); color: #fff;
      padding: 6px 14px; border-radius: 20px;
      font: 12px/1 sans-serif; white-space: nowrap; z-index: 1000;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="hint">Drag pin or tap to set location</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      center: [${latitude}, ${longitude}],
      zoom: 16,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var marker = L.marker([${latitude}, ${longitude}], { draggable: true }).addTo(map);

    function sendLocation(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'locationSelected', lat: lat, lng: lng
      }));
    }

    marker.on('dragend', function(e) {
      var pos = e.target.getLatLng();
      map.panTo(pos);
      sendLocation(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      sendLocation(e.latlng.lat, e.latlng.lng);
    });

    window.updateMarker = function(lat, lng) {
      var pos = L.latLng(lat, lng);
      marker.setLatLng(pos);
      map.setView(pos, 16);
    };

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
  </script>
</body>
</html>`;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        scalesPageToFit={false}
      />
      <TouchableOpacity style={styles.locateBtn} onPress={onDetectLocation}>
        <Ionicons name="locate" size={22} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5DED3',
  },
  webview: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
  },
  locateBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5DED3',
  },
});
