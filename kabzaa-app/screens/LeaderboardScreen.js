import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../services/api';

const COLORS = {
  background: '#04070c',
  panel: 'rgba(10, 14, 22, 0.86)',
  panelMuted: 'rgba(12, 19, 30, 0.92)',
  border: 'rgba(117, 199, 255, 0.14)',
  text: '#f4f7fb',
  muted: '#90a5c0',
  accent: '#63f98d',
  secondary: '#69c6ff',
  bronze: '#d8a06f',
};

function formatDistance(distanceMeters) {
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function PodiumCard({ place, item }) {
  const tone =
    place === 1 ? COLORS.accent : place === 2 ? COLORS.secondary : COLORS.bronze;

  return (
    <View style={[styles.podiumCard, { borderColor: `${tone}55` }]}>
      <Text style={[styles.podiumPlace, { color: tone }]}>#{place}</Text>
      <Text style={styles.podiumName}>{item?.username || '---'}</Text>
      <Text style={styles.podiumMeta}>{item?.rank || 'No data'}</Text>
      <Text style={[styles.podiumScore, { color: tone }]}>{item?.xp || 0} XP</Text>
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

export default function LeaderboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [board, setBoard] = useState([]);
  const [challenges, setChallenges] = useState([]);

  const loadData = useCallback(async () => {
    const [leaderboard, challengeData] = await Promise.all([
      api.fetchLeaderboard(),
      api.fetchChallenges(),
    ]);
    setBoard(leaderboard.results || []);
    setChallenges(challengeData.challenges || []);
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

  if (loading && !board.length) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

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
          <Text style={styles.kicker}>LIVE SEASON BOARD</Text>
          <Text style={styles.title}>Competitive control, cleaner read</Text>
          <Text style={styles.subtitle}>
            Top operatives are highlighted first, with challenge progress easier to scan below.
          </Text>
        </View>

        <View style={styles.podiumRow}>
          <PodiumCard item={board[0]} place={1} />
          <PodiumCard item={board[1]} place={2} />
          <PodiumCard item={board[2]} place={3} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Full standings</Text>
          {board.map((item, index) => (
            <View key={`${item.username}-${index}`} style={styles.entryRow}>
              <Text style={styles.entryRank}>#{index + 1}</Text>
              <View style={styles.entryText}>
                <Text style={styles.entryName}>{item.username}</Text>
                <Text style={styles.entryMeta}>
                  {item.rank} | {item.tiles} tiles | {formatDistance(item.distance_meters)}
                </Text>
              </View>
              <Text style={styles.entryXp}>{item.xp} XP</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Active challenges</Text>
          {challenges.map((item) => (
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
    borderRadius: 28,
    padding: 20,
  },
  kicker: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: COLORS.text, fontSize: 30, fontWeight: '900', marginTop: 10 },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  podiumRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  podiumCard: {
    minWidth: 160,
    flexGrow: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  podiumPlace: { fontSize: 18, fontWeight: '900' },
  podiumName: { color: COLORS.text, fontSize: 18, fontWeight: '900', marginTop: 12 },
  podiumMeta: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  podiumScore: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  panel: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  panelTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.panelMuted,
    borderRadius: 18,
    padding: 14,
  },
  entryRank: { color: COLORS.accent, fontSize: 18, fontWeight: '900', width: 34 },
  entryText: { flex: 1 },
  entryName: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  entryMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  entryXp: { color: COLORS.secondary, fontSize: 14, fontWeight: '900' },
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
});
