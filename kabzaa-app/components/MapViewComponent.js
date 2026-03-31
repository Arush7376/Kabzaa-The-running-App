import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import AvatarMarker from './AvatarMarker';

const PATH_COLOR = '#63f98d';
const CAMERA_PITCH = 58;
const CAMERA_ZOOM = 17.6;
const CAMERA_HEADING = 24;

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f1420' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7d8ca4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1018' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#18253a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0b121f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#08111d' }] },
];

function MapViewComponent({ region, pathCoordinates, currentCoordinate, lastTileInfo }) {
  const mapRef = useRef(null);
  const lastCameraTimestampRef = useRef(0);

  const mapProps = useMemo(() => {
    if (Platform.OS === 'android') {
      return {
        provider: PROVIDER_GOOGLE,
        customMapStyle: DARK_MAP_STYLE,
      };
    }

    return {};
  }, []);

  const animateCameraToRunner = useCallback((coordinate) => {
    if (!coordinate || !mapRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastCameraTimestampRef.current < 250) {
      return;
    }

    lastCameraTimestampRef.current = now;
    mapRef.current.animateCamera(
      {
        center: coordinate,
        pitch: CAMERA_PITCH,
        heading: CAMERA_HEADING,
        zoom: CAMERA_ZOOM,
        altitude: 220,
      },
      { duration: 600 },
    );
  }, []);

  useEffect(() => {
    animateCameraToRunner(currentCoordinate);
  }, [animateCameraToRunner, currentCoordinate]);

  return (
    <View style={styles.container}>
      <MapView
        initialRegion={region}
        mapType="standard"
        pitchEnabled
        ref={mapRef}
        rotateEnabled
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={false}
        style={StyleSheet.absoluteFill}
        {...mapProps}
      >
        {pathCoordinates.length > 1 ? (
          <Polyline
            coordinates={pathCoordinates}
            geodesic
            lineCap="round"
            lineJoin="round"
            strokeColor={PATH_COLOR}
            strokeWidth={5}
          />
        ) : null}

        {currentCoordinate ? (
          <Marker anchor={{ x: 0.5, y: 0.5 }} coordinate={currentCoordinate} tracksViewChanges>
            <AvatarMarker />
          </Marker>
        ) : null}
      </MapView>

      {lastTileInfo ? (
        <View pointerEvents="none" style={styles.tileBadge}>
          <Text style={styles.tileLabel}>Claimed tile</Text>
          <Text style={styles.tileValue}>
            {lastTileInfo.lat_index} / {lastTileInfo.lng_index}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function propsAreEqual(previousProps, nextProps) {
  const previousCurrent = previousProps.currentCoordinate;
  const nextCurrent = nextProps.currentCoordinate;

  if (previousCurrent?.latitude !== nextCurrent?.latitude) {
    return false;
  }

  if (previousCurrent?.longitude !== nextCurrent?.longitude) {
    return false;
  }

  if (previousProps.pathCoordinates.length !== nextProps.pathCoordinates.length) {
    return false;
  }

  if (previousProps.lastTileInfo?.lat_index !== nextProps.lastTileInfo?.lat_index) {
    return false;
  }

  if (previousProps.lastTileInfo?.lng_index !== nextProps.lastTileInfo?.lng_index) {
    return false;
  }

  return true;
}

export default React.memo(MapViewComponent, propsAreEqual);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070c',
  },
  tileBadge: {
    position: 'absolute',
    left: 14,
    bottom: 116,
    backgroundColor: 'rgba(5, 7, 12, 0.88)',
    borderColor: '#20314d',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tileLabel: {
    color: '#7d8ca4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tileValue: {
    color: PATH_COLOR,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
});
