import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import HUDOverlay from '../components/HUDOverlay';
import MapViewComponent from '../components/MapViewComponent';
import * as api from '../services/api';

const Avatar3D = lazy(() => import('../components/Avatar3D'));

const COLORS = {
  background: '#04070c',
  panel: 'rgba(7, 11, 18, 0.84)',
  panelMuted: 'rgba(8, 13, 21, 0.76)',
  panelBorder: 'rgba(117, 199, 255, 0.14)',
  text: '#f4f7fb',
  muted: '#90a5c0',
  accent: '#63f98d',
  secondary: '#69c6ff',
  danger: '#ff4f73',
  warning: '#ffd66b',
};

const DEFAULT_REGION = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

const GPS_TIME_INTERVAL_MS = 2500;
const GPS_DISTANCE_INTERVAL_M = 6;
const BACKEND_SYNC_INTERVAL_MS = 5000;
const DEMO_INTERVAL_MS = 2200;
const MAX_TRACK_POINTS = 500;

function getFriendlyError(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

function calculateSegmentDistance(previous, current) {
  if (!previous || !current) {
    return 0;
  }

  const latDistance = (current.latitude - previous.latitude) * 111139;
  const lonDistance =
    (current.longitude - previous.longitude) *
    111139 *
    Math.cos((current.latitude * Math.PI) / 180);

  return Math.sqrt(latDistance * latDistance + lonDistance * lonDistance);
}

function calculateTotalDistance(pathCoordinates) {
  let totalMeters = 0;
  for (let index = 1; index < pathCoordinates.length; index += 1) {
    totalMeters += calculateSegmentDistance(pathCoordinates[index - 1], pathCoordinates[index]);
  }
  return totalMeters;
}

function formatDuration(startedAt, now) {
  if (!startedAt) {
    return '00:00';
  }

  const elapsedMs = Math.max(now - startedAt, 0);
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDistance(totalDistanceMeters) {
  return `${(totalDistanceMeters / 1000).toFixed(2)} km`;
}

function formatSpeed(totalDistanceMeters, startedAt, now) {
  if (!startedAt) {
    return '0.0 km/h';
  }

  const elapsedHours = Math.max((now - startedAt) / 3600000, 1 / 3600000);
  const speed = totalDistanceMeters / 1000 / elapsedHours;
  return `${speed.toFixed(1)} km/h`;
}

function createDemoPoint(step) {
  const center = { latitude: 28.6139, longitude: 77.209 };
  const radius = 0.0013 + Math.sin(step / 5) * 0.00035;
  const angle = step * 0.44;

  return {
    latitude: center.latitude + Math.cos(angle) * radius,
    longitude: center.longitude + Math.sin(angle) * radius,
  };
}

function AvatarFallbackCard() {
  return (
    <View style={styles.avatarFallbackCard}>
      <Text style={styles.avatarFallbackLabel}>Loading avatar</Text>
    </View>
  );
}

function SurfaceMetric({ label, value, tone = 'default' }) {
  return (
    <View style={[styles.surfaceMetric, tone === 'warning' ? styles.surfaceMetricWarning : null]}>
      <Text style={[styles.surfaceMetricLabel, tone === 'warning' ? styles.surfaceMetricLabelWarning : null]}>
        {label}
      </Text>
      <Text numberOfLines={1} style={styles.surfaceMetricValue}>
        {value}
      </Text>
    </View>
  );
}

export default function RunScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 760;
  const [booting, setBooting] = useState(true);
  const [runMode, setRunMode] = useState('LIVE TERRITORY');
  const [currentCoordinate, setCurrentCoordinate] = useState(null);
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [sessionId, setSessionId] = useState(null);
  const [lastTileInfo, setLastTileInfo] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const [statusText, setStatusText] = useState('Initializing run systems');
  const [demoMode, setDemoMode] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const watchRef = useRef(null);
  const syncTimerRef = useRef(null);
  const clockTimerRef = useRef(null);
  const demoTimerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const latestCoordinateRef = useRef(null);
  const mountedRef = useRef(true);
  const stopRequestedRef = useRef(false);
  const initialRegionSetRef = useRef(false);
  const demoStepRef = useRef(0);

  const pushCoordinate = useCallback((latitude, longitude) => {
    const nextCoordinate = { latitude, longitude };
    latestCoordinateRef.current = nextCoordinate;
    setCurrentCoordinate(nextCoordinate);

    if (!initialRegionSetRef.current) {
      initialRegionSetRef.current = true;
      setRegion({
        ...DEFAULT_REGION,
        latitude,
        longitude,
      });
    }

    setPathCoordinates((currentPath) => {
      const previous = currentPath[currentPath.length - 1];
      if (
        previous &&
        previous.latitude === nextCoordinate.latitude &&
        previous.longitude === nextCoordinate.longitude
      ) {
        return currentPath;
      }

      const nextPath = [...currentPath, nextCoordinate];
      return nextPath.length > MAX_TRACK_POINTS ? nextPath.slice(-MAX_TRACK_POINTS) : nextPath;
    });
  }, []);

  const totalDistanceMeters = useMemo(
    () => calculateTotalDistance(pathCoordinates),
    [pathCoordinates],
  );

  const metrics = useMemo(
    () => ({
      duration: formatDuration(startedAt, clock),
      distance: formatDistance(totalDistanceMeters),
      speed: formatSpeed(totalDistanceMeters, startedAt, clock),
      points: `${pathCoordinates.length} pts`,
      statusTone: demoMode || offlineMode ? 'warning' : 'default',
    }),
    [clock, demoMode, offlineMode, pathCoordinates.length, startedAt, totalDistanceMeters],
  );

  const syncLatestLocation = useCallback(async () => {
    const currentSessionId = sessionIdRef.current;
    const coordinate = latestCoordinateRef.current;

    if (!currentSessionId || !coordinate || stopRequestedRef.current || demoMode || offlineMode) {
      return;
    }

    try {
      const response = await api.updateLocation(
        currentSessionId,
        coordinate.latitude,
        coordinate.longitude,
      );

      if (response?.tile && mountedRef.current) {
        setLastTileInfo(response.tile);
      }
    } catch (error) {
      if (mountedRef.current) {
        setStatusText('Link unstable, local tracking continues');
      }
      console.warn('update-location failed', getFriendlyError(error, 'Request failed'));
    }
  }, [demoMode, offlineMode]);

  const clearActiveTimers = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }

    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    if (clockTimerRef.current) {
      clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }

    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  }, []);

  const startClock = useCallback(() => {
    clockTimerRef.current = setInterval(() => {
      if (mountedRef.current) {
        setClock(Date.now());
      }
    }, 1000);
  }, []);

  const startDemoRun = useCallback(() => {
    setDemoMode(true);
    setOfflineMode(false);
    setRunMode('SIMULATION MODE');
    setStatusText('Browser-safe simulation engaged');
    const localSessionId = 'SIM-RUN';
    setSessionId(localSessionId);
    sessionIdRef.current = localSessionId;
    const initialPoint = createDemoPoint(0);
    pushCoordinate(initialPoint.latitude, initialPoint.longitude);
    startClock();

    demoTimerRef.current = setInterval(() => {
      demoStepRef.current += 1;
      const point = createDemoPoint(demoStepRef.current);
      pushCoordinate(point.latitude, point.longitude);
      setLastTileInfo({
        lat_index: 2860 + (demoStepRef.current % 4),
        lng_index: 7720 + (demoStepRef.current % 5),
      });
    }, DEMO_INTERVAL_MS);
  }, [pushCoordinate, startClock]);

  const startOfflineRun = useCallback(() => {
    setDemoMode(false);
    setOfflineMode(true);
    setRunMode('OFFLINE RUN');
    setStatusText('Server link unstable, continuing with local GPS tracking');
    const localSessionId = `OFFLINE-${Date.now()}`;
    setSessionId(localSessionId);
    sessionIdRef.current = localSessionId;
  }, []);

  const stopRun = useCallback(
    async (navigateBack = true) => {
      if (stopRequestedRef.current) {
        return;
      }

      stopRequestedRef.current = true;
      clearActiveTimers();

      try {
        const coordinate = latestCoordinateRef.current;
        if (sessionIdRef.current && coordinate && !demoMode && !offlineMode) {
          const response = await api.updateLocation(
            sessionIdRef.current,
            coordinate.latitude,
            coordinate.longitude,
          );

          if (response?.tile && mountedRef.current) {
            setLastTileInfo(response.tile);
          }
        }
      } catch (error) {
        console.warn('final sync skipped', getFriendlyError(error, 'Request failed'));
      }

      let summaryPayload = null;

      try {
        if (sessionIdRef.current && !demoMode && !offlineMode) {
          const response = await api.endRun(sessionIdRef.current);
          summaryPayload = response.summary || null;
        }
      } catch (error) {
        console.warn('end-run failed', getFriendlyError(error, 'Request failed'));
      } finally {
        if (!navigateBack) {
          return;
        }

        if (summaryPayload) {
          navigation.replace('RunSummary', { summary: summaryPayload });
          return;
        }

        if (demoMode || offlineMode) {
          navigation.replace('RunSummary', {
            summary: {
              session_id: sessionIdRef.current || 'SIM-RUN',
              distance_meters: totalDistanceMeters,
              duration_seconds: startedAt ? Math.max(Math.floor((Date.now() - startedAt) / 1000), 0) : 0,
              average_speed_kmh: parseFloat(formatSpeed(totalDistanceMeters, startedAt, Date.now())),
              owned_tiles: lastTileInfo ? 1 : 0,
              xp: Math.floor(totalDistanceMeters / 80) + pathCoordinates.length * 4,
              rank: offlineMode ? 'Offline Runner' : 'Simulation Runner',
              achievements: [
                {
                  id: offlineMode ? 'offline-mode' : 'demo-mode',
                  title: offlineMode ? 'Offline Runner' : 'Simulation Runner',
                  description: offlineMode
                    ? 'Completed a run while the backend link was unavailable.'
                    : 'Completed a browser-safe tactical demo run.',
                  unlocked: true,
                },
              ],
            },
          });
          return;
        }

        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    },
    [
      clearActiveTimers,
      offlineMode,
      demoMode,
      lastTileInfo,
      navigation,
      pathCoordinates.length,
      startedAt,
      totalDistanceMeters,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;
    stopRequestedRef.current = false;
    initialRegionSetRef.current = false;
    demoStepRef.current = 0;

    (async () => {
      setStatusText('Requesting location access');

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        const canUseLocation = permission.status === 'granted';

        setStatusText('Opening run session');

        try {
          const runSession = await api.startRun();
          if (mountedRef.current) {
            setSessionId(runSession.session_id);
            sessionIdRef.current = runSession.session_id;
          }
        } catch (error) {
          if (Platform.OS === 'web') {
            setStatusText('Backend unavailable, switching to simulation');
            setStartedAt(Date.now());
            startDemoRun();
            return;
          }

          if (mountedRef.current) {
            startOfflineRun();
          }
        }

        if (!mountedRef.current) {
          return;
        }

        setStartedAt(Date.now());

        if (!canUseLocation) {
          if (Platform.OS === 'web') {
            setStatusText('Location blocked, switching to simulation');
            startDemoRun();
            return;
          }

          Alert.alert('Location permission required', 'Enable location access to start a run.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        const firstPosition = await Location.getCurrentPositionAsync({
          accuracy:
            Platform.OS === 'web'
              ? Location.Accuracy.Balanced
              : Location.Accuracy.BestForNavigation,
        });

        if (!mountedRef.current) {
          return;
        }

        setStatusText(offlineMode ? 'GPS lock acquired in offline mode' : 'GPS lock acquired');
        pushCoordinate(firstPosition.coords.latitude, firstPosition.coords.longitude);
        await syncLatestLocation();

        watchRef.current = await Location.watchPositionAsync(
          {
            accuracy:
              Platform.OS === 'web'
                ? Location.Accuracy.Balanced
                : Location.Accuracy.BestForNavigation,
            timeInterval: GPS_TIME_INTERVAL_MS,
            distanceInterval: GPS_DISTANCE_INTERVAL_M,
          },
          (locationUpdate) => {
            pushCoordinate(locationUpdate.coords.latitude, locationUpdate.coords.longitude);
          },
        );

        syncTimerRef.current = setInterval(syncLatestLocation, BACKEND_SYNC_INTERVAL_MS);
        startClock();
      } catch (error) {
        if (Platform.OS === 'web') {
          setStartedAt(Date.now());
          startDemoRun();
        } else {
          Alert.alert('Run startup failed', getFriendlyError(error, 'Unable to start the run.'), [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } finally {
        if (mountedRef.current) {
          setBooting(false);
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      if (!stopRequestedRef.current) {
        stopRun(false).catch(() => {});
      }
    };
  }, [navigation, offlineMode, pushCoordinate, startClock, startDemoRun, startOfflineRun, stopRun, syncLatestLocation]);

  if (booting) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingOrb} />
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={styles.loadingTitle}>Priming KABZAA systems</Text>
        <Text style={styles.loadingSubtitle}>{statusText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapViewComponent
        currentCoordinate={currentCoordinate}
        lastTileInfo={lastTileInfo}
        pathCoordinates={pathCoordinates}
        region={region}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.safeOverlay}>
        <HUDOverlay
          distanceLabel={metrics.distance}
          durationLabel={metrics.duration}
          modeLabel={runMode}
          pointsLabel={metrics.points}
          sessionLabel={`Session ${sessionId || '--'}`}
          speedLabel={metrics.speed}
          tileLabel={
            lastTileInfo ? `${lastTileInfo.lat_index}/${lastTileInfo.lng_index}` : '---'
          }
        />

        <View pointerEvents="box-none" style={[styles.bottomLayer, isCompact ? styles.bottomLayerCompact : null]}>
          <View style={[styles.surfaceRail, isCompact ? styles.surfaceRailCompact : null]}>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillLabel}>Mode</Text>
              <Text style={styles.statusPillValue}>
                {demoMode ? 'Simulation' : offlineMode ? 'Offline GPS' : 'Live GPS'}
              </Text>
            </View>
            <SurfaceMetric label="Status" tone={metrics.statusTone} value={statusText} />
          </View>

          <View style={[styles.controlDock, isCompact ? styles.controlDockCompact : null]}>
            <View style={styles.avatarPanel}>
              <Text style={styles.avatarLabel}>
                {demoMode ? 'Digital Runner' : offlineMode ? 'Offline Avatar' : 'Avatar Sync'}
              </Text>
              <Suspense fallback={<AvatarFallbackCard />}>
                <Avatar3D speed={parseFloat(metrics.speed)} style={styles.avatarCanvas} />
              </Suspense>
            </View>

            <View style={styles.commandBar}>
              <View style={styles.commandTextWrap}>
                <Text style={styles.commandLabel}>Run control</Text>
                <Text style={styles.commandValue}>
                  {demoMode
                    ? 'Simulation remains active until you end the session.'
                    : offlineMode
                      ? 'Tracking continues locally. Summary will be saved on-device for this session.'
                      : 'Live route is syncing with the backend.'}
                </Text>
              </View>

              <TouchableOpacity activeOpacity={0.92} onPress={() => stopRun(true)} style={styles.stopButton}>
                <Text style={styles.stopButtonText}>End Run</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99, 249, 141, 0.08)',
  },
  loadingTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 18,
  },
  loadingSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 10,
  },
  safeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomLayer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 12,
  },
  bottomLayerCompact: {
    gap: 10,
  },
  surfaceRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
  },
  surfaceRailCompact: {
    flexDirection: 'column',
  },
  statusPill: {
    minWidth: 130,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 249, 141, 0.2)',
    backgroundColor: 'rgba(8, 18, 13, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusPillLabel: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  statusPillValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
  surfaceMetric: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    backgroundColor: COLORS.panelMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  surfaceMetricWarning: {
    borderColor: 'rgba(255, 214, 107, 0.2)',
    backgroundColor: 'rgba(35, 27, 10, 0.8)',
  },
  surfaceMetricLabel: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  surfaceMetricLabelWarning: {
    color: COLORS.warning,
  },
  surfaceMetricValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  controlDock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
  },
  controlDockCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  avatarPanel: {
    alignSelf: 'flex-start',
  },
  avatarLabel: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  avatarCanvas: {
    width: Platform.OS === 'web' ? 232 : 210,
    height: Platform.OS === 'web' ? 232 : 210,
  },
  avatarFallbackCard: {
    width: 210,
    height: 210,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  avatarFallbackLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  commandBar: {
    flex: 1,
    minHeight: 132,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  commandTextWrap: {
    flex: 1,
    alignSelf: 'stretch',
  },
  commandLabel: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  commandValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 8,
  },
  stopButton: {
    minWidth: 156,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 16,
    shadowColor: COLORS.danger,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
