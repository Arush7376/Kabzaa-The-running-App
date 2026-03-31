import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

function MetricCard({ label, value, accent }) {
  return (
    <View style={[styles.metricCard, accent ? styles.metricCardAccent : null]}>
      <Text style={[styles.metricLabel, accent ? styles.metricLabelAccent : null]}>{label}</Text>
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

export default function HUDOverlay({
  modeLabel,
  sessionLabel,
  distanceLabel,
  durationLabel,
  speedLabel,
  pointsLabel,
  tileLabel,
}) {
  const { width } = useWindowDimensions();
  const isCompact = width < 760;

  return (
    <View pointerEvents="none" style={[styles.overlay, isCompact ? styles.overlayCompact : null]}>
      <View style={[styles.topRow, isCompact ? styles.topRowCompact : null]}>
        <View style={styles.heroPanel}>
          <View style={styles.signalRow}>
            <Text style={styles.kicker}>{modeLabel}</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>Live</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={styles.title}>
            {sessionLabel}
          </Text>
          <Text style={styles.subtitle}>
            Stay centered, capture clean lines, and keep the route readable at a glance.
          </Text>
        </View>

        <View style={[styles.tilePanel, isCompact ? styles.tilePanelCompact : null]}>
          <Text style={styles.tileLabel}>Captured tile</Text>
          <Text style={styles.tileValue}>{tileLabel}</Text>
          <Text style={styles.tileHint}>Ownership updates stream in every few seconds.</Text>
        </View>
      </View>

      <View style={styles.metricWrap}>
        <MetricCard accent label="Distance" value={distanceLabel} />
        <MetricCard label="Time" value={durationLabel} />
        <MetricCard label="Speed" value={speedLabel} />
        <MetricCard label="Track points" value={pointsLabel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 162,
  },
  overlayCompact: {
    paddingBottom: 208,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  topRowCompact: {
    flexDirection: 'column',
  },
  heroPanel: {
    flex: 1,
    maxWidth: 700,
    backgroundColor: 'rgba(5, 10, 18, 0.76)',
    borderColor: 'rgba(117, 199, 255, 0.18)',
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  kicker: {
    color: '#63f98d',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(99, 249, 141, 0.24)',
    backgroundColor: 'rgba(10, 24, 15, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#63f98d',
  },
  liveLabel: {
    color: '#d4ffe2',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f4f7fb',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
  },
  subtitle: {
    color: '#8ea6c5',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  tilePanel: {
    width: 180,
    backgroundColor: 'rgba(6, 11, 18, 0.84)',
    borderColor: 'rgba(99, 249, 141, 0.2)',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tilePanelCompact: {
    width: '100%',
  },
  tileLabel: {
    color: '#7ec7ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  tileValue: {
    color: '#63f98d',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  tileHint: {
    color: '#8ea6c5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  metricWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    minWidth: 135,
    flexGrow: 1,
    backgroundColor: 'rgba(6, 10, 18, 0.74)',
    borderColor: 'rgba(117, 199, 255, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricCardAccent: {
    borderColor: 'rgba(99, 249, 141, 0.24)',
    backgroundColor: 'rgba(9, 20, 14, 0.72)',
  },
  metricLabel: {
    color: '#8ea6c5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  metricLabelAccent: {
    color: '#63f98d',
  },
  metricValue: {
    color: '#f4f7fb',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 8,
  },
});
