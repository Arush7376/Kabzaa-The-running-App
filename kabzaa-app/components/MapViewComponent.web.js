import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const MAP_SIZE = 1000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function projectCoordinates(pathCoordinates, currentCoordinate) {
  const basis = currentCoordinate || pathCoordinates[pathCoordinates.length - 1];
  if (!basis) {
    return [];
  }

  const longitudeScale = Math.cos((basis.latitude * Math.PI) / 180) || 1;

  return pathCoordinates.map((coordinate, index) => {
    const offsetX = (coordinate.longitude - basis.longitude) * 240000 * longitudeScale;
    const offsetY = (basis.latitude - coordinate.latitude) * 240000;
    const x = clamp(MAP_SIZE / 2 + offsetX, 40, MAP_SIZE - 40);
    const y = clamp(MAP_SIZE / 2 + offsetY, 40, MAP_SIZE - 40);

    return {
      id: `${coordinate.latitude}-${coordinate.longitude}-${index}`,
      x,
      y,
    };
  });
}

function buildSegments(projectedPoints) {
  return projectedPoints.slice(1).map((point, index) => {
    const previous = projectedPoints[index];
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    return {
      id: `${point.id}-segment`,
      midX: previous.x + dx / 2,
      midY: previous.y + dy / 2,
      width: Math.max(length, 6),
      angle,
    };
  });
}

function buildDistrictCells(projectedPoints) {
  const seed = projectedPoints[projectedPoints.length - 1];
  const centerX = seed?.x ?? MAP_SIZE / 2;
  const centerY = seed?.y ?? MAP_SIZE / 2;

  return Array.from({ length: 8 }).map((_, index) => {
    const angle = index * 0.82;
    const distance = 120 + (index % 3) * 58;
    return {
      id: `district-${index}`,
      left: clamp(centerX + Math.cos(angle) * distance - 46, 34, MAP_SIZE - 130),
      top: clamp(centerY + Math.sin(angle) * distance - 46, 34, MAP_SIZE - 130),
      size: 84 + (index % 2) * 20,
      active: index < Math.min(projectedPoints.length, 5),
    };
  });
}

export default function MapViewComponent({
  region,
  pathCoordinates = [],
  currentCoordinate,
  lastTileInfo,
}) {
  const { width } = useWindowDimensions();
  const isCompact = width < 760;
  const latitude = currentCoordinate?.latitude ?? region?.latitude;
  const longitude = currentCoordinate?.longitude ?? region?.longitude;

  const projectedPoints = useMemo(
    () => projectCoordinates(pathCoordinates, currentCoordinate),
    [currentCoordinate, pathCoordinates],
  );
  const segments = useMemo(() => buildSegments(projectedPoints), [projectedPoints]);
  const districtCells = useMemo(() => buildDistrictCells(projectedPoints), [projectedPoints]);
  const currentPoint = projectedPoints[projectedPoints.length - 1];

  return (
    <View style={styles.container}>
      <View style={styles.haloPrimary} />
      <View style={styles.haloSecondary} />
      <View style={styles.noiseOverlay} />

      <View style={styles.mapShell}>
        <View style={styles.horizonGlow} />

        <View style={styles.mapPlane}>
          {Array.from({ length: 11 }).map((_, index) => (
            <View
              key={`vertical-${index}`}
              style={[styles.gridLine, styles.gridVertical, { left: `${index * 10}%` }]}
            />
          ))}
          {Array.from({ length: 11 }).map((_, index) => (
            <View
              key={`horizontal-${index}`}
              style={[styles.gridLine, styles.gridHorizontal, { top: `${index * 10}%` }]}
            />
          ))}

          {districtCells.map((cell) => (
            <View
              key={cell.id}
              style={[
                styles.districtCell,
                cell.active ? styles.districtCellActive : null,
                {
                  left: cell.left,
                  top: cell.top,
                  width: cell.size,
                  height: cell.size,
                },
              ]}
            />
          ))}

          {segments.map((segment, index) => (
            <View
              key={segment.id}
              style={[
                styles.segmentGlow,
                {
                  left: segment.midX - segment.width / 2,
                  top: segment.midY - 5,
                  width: segment.width,
                  opacity: 0.16 + index / Math.max(segments.length * 1.5, 1),
                  transform: [{ rotate: `${segment.angle}deg` }],
                },
              ]}
            />
          ))}
          {segments.map((segment, index) => (
            <View
              key={`${segment.id}-core`}
              style={[
                styles.segment,
                {
                  left: segment.midX - segment.width / 2,
                  top: segment.midY - 2.5,
                  width: segment.width,
                  opacity: 0.36 + index / Math.max(segments.length * 1.5, 1),
                  transform: [{ rotate: `${segment.angle}deg` }],
                },
              ]}
            />
          ))}

          {projectedPoints.map((point, index) => (
            <View
              key={point.id}
              style={[
                styles.pathNode,
                {
                  left: point.x - 4,
                  top: point.y - 4,
                  opacity: 0.35 + index / Math.max(projectedPoints.length * 1.5, 1),
                },
              ]}
            />
          ))}

          {currentPoint ? (
            <>
              <View style={[styles.capturePulseOuter, { left: currentPoint.x - 42, top: currentPoint.y - 42 }]} />
              <View style={[styles.capturePulseInner, { left: currentPoint.x - 28, top: currentPoint.y - 28 }]} />
              <View style={[styles.currentMarker, { left: currentPoint.x - 12, top: currentPoint.y - 12 }]} />
            </>
          ) : null}

          <View style={styles.scanLine} />
        </View>

        <View style={[styles.mapChrome, isCompact ? styles.mapChromeCompact : null]}>
          <View style={styles.boardCopy}>
            <Text style={styles.mapLabel}>TACTICAL DISTRICT</Text>
            <Text style={styles.mapTitle}>Neon pursuit board</Text>
            <Text style={styles.mapBody}>
              Follow the route, keep the path legible, and turn each pass into owned ground.
            </Text>
          </View>

          <View style={styles.chromeStack}>
            <View style={styles.coordChip}>
              <Text style={styles.coordLabel}>GPS</Text>
              <Text style={styles.coordValue}>
                {latitude != null && longitude != null
                  ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                  : 'Awaiting position'}
              </Text>
            </View>

            <View style={styles.coordChip}>
              <Text style={styles.coordLabel}>Board status</Text>
              <Text style={styles.coordValue}>
                {pathCoordinates.length > 1 ? 'Tracking live route' : 'Stand by for movement'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {lastTileInfo ? (
        <View style={[styles.tileBadge, isCompact ? styles.tileBadgeCompact : null]}>
          <Text style={styles.tileLabel}>Captured tile</Text>
          <Text style={styles.tileValue}>
            {lastTileInfo.lat_index} / {lastTileInfo.lng_index}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04070c',
    justifyContent: 'center',
    padding: 18,
  },
  haloPrimary: {
    position: 'absolute',
    top: -120,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(96, 255, 156, 0.16)',
  },
  haloSecondary: {
    position: 'absolute',
    left: -120,
    bottom: -140,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(56, 152, 255, 0.12)',
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    backgroundColor: 'rgba(117, 199, 255, 0.04)',
  },
  mapShell: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(117, 199, 255, 0.18)',
    backgroundColor: 'rgba(8, 12, 20, 0.92)',
    overflow: 'hidden',
    shadowColor: '#4ce3ff',
    shadowOpacity: 0.18,
    shadowRadius: 26,
  },
  horizonGlow: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(99, 249, 141, 0.12)',
  },
  mapPlane: {
    flex: 1,
    marginHorizontal: 18,
    marginTop: 18,
    marginBottom: 150,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(96, 255, 156, 0.16)',
    backgroundColor: '#09111d',
    overflow: 'hidden',
    transform: [{ perspective: 1200 }, { rotateX: '62deg' }, { scale: 1.12 }],
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(117, 199, 255, 0.09)',
  },
  gridVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  gridHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
  districtCell: {
    position: 'absolute',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(117, 199, 255, 0.1)',
    backgroundColor: 'rgba(16, 29, 48, 0.42)',
  },
  districtCellActive: {
    borderColor: 'rgba(99, 249, 141, 0.22)',
    backgroundColor: 'rgba(18, 58, 35, 0.42)',
  },
  segmentGlow: {
    position: 'absolute',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 249, 141, 0.24)',
  },
  segment: {
    position: 'absolute',
    height: 5,
    borderRadius: 999,
    backgroundColor: '#63f98d',
    shadowColor: '#63f98d',
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  pathNode: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c0ffd7',
  },
  currentMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ecfff5',
    borderWidth: 3,
    borderColor: '#63f98d',
    shadowColor: '#63f98d',
    shadowOpacity: 0.95,
    shadowRadius: 18,
  },
  capturePulseOuter: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: 'rgba(99, 249, 141, 0.28)',
    backgroundColor: 'rgba(99, 249, 141, 0.05)',
  },
  capturePulseInner: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(126, 199, 255, 0.24)',
    backgroundColor: 'rgba(126, 199, 255, 0.06)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '45%',
    height: 3,
    backgroundColor: 'rgba(90, 213, 255, 0.22)',
  },
  mapChrome: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
  },
  mapChromeCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  boardCopy: {
    flex: 1,
    maxWidth: 480,
  },
  mapLabel: {
    color: '#73f9a3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  mapTitle: {
    color: '#f5f9ff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  mapBody: {
    color: '#93a7c4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  chromeStack: {
    width: 240,
    gap: 10,
  },
  coordChip: {
    backgroundColor: 'rgba(9, 15, 24, 0.88)',
    borderColor: 'rgba(117, 199, 255, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  coordLabel: {
    color: '#72dfef',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  coordValue: {
    color: '#f5f9ff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  tileBadge: {
    position: 'absolute',
    top: 34,
    right: 34,
    backgroundColor: 'rgba(9, 15, 24, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(99, 249, 141, 0.26)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tileBadgeCompact: {
    top: 26,
    right: 26,
  },
  tileLabel: {
    color: '#7ec7ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tileValue: {
    color: '#63f98d',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
});
