import React, { Suspense, lazy, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../services/api';

const Avatar3D = lazy(() => import('../components/Avatar3D'));

const COLORS = {
  background: '#04070c',
  panel: 'rgba(10, 14, 22, 0.86)',
  panelMuted: 'rgba(12, 19, 30, 0.92)',
  border: 'rgba(117, 199, 255, 0.14)',
  text: '#f4f7fb',
  muted: '#90a5c0',
  accent: '#63f98d',
  secondary: '#69c6ff',
};

function formatDistance(distanceMeters) {
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
}

function StatTile({ label, value }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileLabel}>{label}</Text>
      <Text style={styles.statTileValue}>{value}</Text>
    </View>
  );
}

function ProgressBar({ progress }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(8, progress * 100)}%` }]} />
    </View>
  );
}

function AvatarFallback() {
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarFallbackText}>Loading avatar</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const loadData = useCallback(async () => {
    const [profile, history] = await Promise.all([api.fetchProfile(), api.fetchRunHistory()]);
    setData({
      ...profile,
      history: history.results || [],
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          await loadData();
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  if (loading && !data) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  const unlockedAchievements = data.achievements.filter((item) => item.unlocked);
  const lockedAchievements = data.achievements.filter((item) => !item.unlocked);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#63f98d" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>OPERATIVE PROFILE</Text>
            <Text style={styles.title}>{data.username}</Text>
            <Text style={styles.rank}>{data.rank}</Text>
            <Text style={styles.subtitle}>
              Territory progress, challenge momentum, and recent run performance in one place.
            </Text>
            <View style={styles.xpRibbon}>
              <Text style={styles.xpRibbonLabel}>Current progression</Text>
              <Text style={styles.xpRibbonValue}>{data.xp} XP</Text>
            </View>
          </View>
          <Suspense fallback={<AvatarFallback />}>
            <Avatar3D speed={4.2} style={styles.avatar} />
          </Suspense>
        </View>

        <View style={styles.statsRow}>
          <StatTile label="Runs" value={`${data.totals.total_runs}`} />
          <StatTile label="Distance" value={formatDistance(data.totals.total_distance)} />
          <StatTile label="Tiles" value={`${data.totals.total_tiles}`} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Live challenges</Text>
          {data.challenges.map((item) => (
            <View key={item.id} style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <Text style={styles.challengeTitle}>{item.title}</Text>
                <Text style={styles.challengeValue}>
                  {item.current} / {item.target} {item.unit}
                </Text>
              </View>
              <Text style={styles.challengeBody}>{item.description}</Text>
              <ProgressBar progress={item.progress} />
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Achievements</Text>
          <View style={styles.achievementSection}>
            <Text style={styles.sectionLabel}>Unlocked</Text>
            {unlockedAchievements.length ? (
              unlockedAchievements.map((item) => (
                <View key={item.id} style={styles.achievementCard}>
                  <View style={[styles.dot, styles.dotAccent]} />
                  <View style={styles.achievementText}>
                    <Text style={styles.achievementTitle}>{item.title}</Text>
                    <Text style={styles.achievementBody}>{item.description}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Finish more runs to start unlocking achievements.</Text>
            )}
          </View>
          <View style={styles.achievementSection}>
            <Text style={styles.sectionLabel}>Next unlocks</Text>
            {lockedAchievements.map((item) => (
              <View key={item.id} style={styles.achievementCard}>
                <View style={styles.dot} />
                <View style={styles.achievementText}>
                  <Text style={styles.achievementTitle}>{item.title}</Text>
                  <Text style={styles.achievementBody}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent runs</Text>
          {data.history.map((run) => (
            <View key={run.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyTitle}>Session #{run.id}</Text>
                <Text style={styles.historySpeed}>{run.average_speed_kmh.toFixed(1)} km/h</Text>
              </View>
              <Text style={styles.historyBody}>
                {formatDistance(run.distance_meters)} | {formatDuration(run.duration_seconds)} |{' '}
                {run.points_count} path points
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 18, gap: 16 },
  hero: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 30,
    padding: 18,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  heroCopy: { flex: 1 },
  kicker: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: COLORS.text, fontSize: 32, fontWeight: '900', marginTop: 10 },
  rank: { color: COLORS.secondary, fontSize: 18, fontWeight: '800', marginTop: 6 },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 420 },
  xpRibbon: {
    marginTop: 16,
    backgroundColor: COLORS.panelMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 249, 141, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  xpRibbonLabel: { color: COLORS.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  xpRibbonValue: { color: COLORS.accent, fontSize: 20, fontWeight: '900', marginTop: 6 },
  avatar: {
    width: Platform.OS === 'web' ? 150 : 120,
    height: Platform.OS === 'web' ? 150 : 120,
    alignSelf: Platform.OS === 'web' ? 'flex-end' : 'center',
  },
  avatarFallback: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: COLORS.panelMuted,
  },
  avatarFallbackText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statTile: {
    minWidth: 150,
    flexGrow: 1,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  statTileLabel: { color: COLORS.secondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  statTileValue: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 8 },
  panel: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  panelTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  challengeCard: {
    backgroundColor: COLORS.panelMuted,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  challengeTitle: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '800' },
  challengeValue: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  challengeBody: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(40, 55, 75, 0.85)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.accent },
  achievementSection: { gap: 10 },
  sectionLabel: { color: COLORS.secondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  achievementCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#243346',
    marginTop: 4,
  },
  dotAccent: { backgroundColor: COLORS.accent },
  achievementText: { flex: 1 },
  achievementTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  achievementBody: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  emptyText: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  historyCard: {
    backgroundColor: COLORS.panelMuted,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  historyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  historySpeed: { color: COLORS.secondary, fontSize: 13, fontWeight: '800' },
  historyBody: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
});
