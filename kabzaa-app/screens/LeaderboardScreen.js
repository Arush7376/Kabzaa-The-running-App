import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  warning: '#ffd66b',
  bronze: '#d8a06f',
};

function formatDistance(distanceMeters) {
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function scoreForMode(item, mode) {
  if (mode === 'tiles') {
    return item.tiles || 0;
  }
  if (mode === 'distance') {
    return item.distance_meters || 0;
  }
  if (mode === 'weekly') {
    return item.weekly_distance_meters || 0;
  }
  return item.xp || 0;
}

function labelForMode(item, mode) {
  if (mode === 'tiles') {
    return `${item.tiles || 0} tiles`;
  }
  if (mode === 'distance') {
    return formatDistance(item.distance_meters || 0);
  }
  if (mode === 'weekly') {
    return `${formatDistance(item.weekly_distance_meters || 0)} this week`;
  }
  return `${item.xp || 0} XP`;
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

function ModeButton({ active, label, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.modeButton, active ? styles.modeButtonActive : null]}
    >
      <Text style={[styles.modeButtonText, active ? styles.modeButtonTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SeasonTile({ label, value }) {
  return (
    <View style={styles.seasonTile}>
      <Text style={styles.seasonTileLabel}>{label}</Text>
      <Text style={styles.seasonTileValue}>{value}</Text>
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
  const [season, setSeason] = useState(null);
  const [rivals, setRivals] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [mode, setMode] = useState('xp');

  const loadData = useCallback(async () => {
    const [leaderboard, challengeData] = await Promise.all([
      api.fetchLeaderboard(),
      api.fetchChallenges(),
    ]);
    setBoard(leaderboard.results || []);
    setSeason(leaderboard.season || null);
    setRivals(leaderboard.rivals || []);
    setCurrentUser(leaderboard.current_user || null);
    setCurrentPosition(leaderboard.current_position || null);
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

  const visibleBoard = useMemo(() => {
    return [...board].sort((a, b) => scoreForMode(b, mode) - scoreForMode(a, mode));
  }, [board, mode]);

  const currentPlayer = useMemo(
    () => board.find((item) => item.username === currentUser) || null,
    [board, currentUser],
  );

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

        <View style={styles.seasonGrid}>
          <SeasonTile label="Players" value={`${season?.players || board.length}`} />
          <SeasonTile
            label="Map Distance"
            value={formatDistance(season?.total_distance_meters || 0)}
          />
          <SeasonTile label="Tiles Held" value={`${season?.total_tiles || 0}`} />
          <SeasonTile label="Top Score" value={`${season?.top_score || 0} XP`} />
        </View>

        {currentPlayer && (
          <View style={styles.playerSpotlight}>
            <View>
              <Text style={styles.spotlightLabel}>Your board position</Text>
              <Text style={styles.spotlightTitle}>#{currentPosition || '--'} {currentPlayer.username}</Text>
              <Text style={styles.spotlightMeta}>
                {currentPlayer.rank} | {currentPlayer.streak_days || 0} day streak |{' '}
                {formatDistance(currentPlayer.weekly_distance_meters || 0)} this week
              </Text>
            </View>
            <Text style={styles.spotlightScore}>{currentPlayer.xp} XP</Text>
          </View>
        )}

        <View style={styles.modeRail}>
          <ModeButton active={mode === 'xp'} label="XP" onPress={() => setMode('xp')} />
          <ModeButton active={mode === 'tiles'} label="Tiles" onPress={() => setMode('tiles')} />
          <ModeButton active={mode === 'distance'} label="Distance" onPress={() => setMode('distance')} />
          <ModeButton active={mode === 'weekly'} label="Weekly" onPress={() => setMode('weekly')} />
        </View>

        <View style={styles.podiumRow}>
          <PodiumCard item={visibleBoard[0]} place={1} />
          <PodiumCard item={visibleBoard[1]} place={2} />
          <PodiumCard item={visibleBoard[2]} place={3} />
        </View>

        {!!rivals.length && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Rivals to chase</Text>
            {rivals.map((item, index) => (
              <View key={`${item.username}-rival-${index}`} style={styles.rivalRow}>
                <View style={styles.rivalPulse} />
                <View style={styles.entryText}>
                  <Text style={styles.entryName}>{item.username}</Text>
                  <Text style={styles.entryMeta}>
                    {item.rank} | {item.tiles} tiles | {item.streak_days || 0} day streak
                  </Text>
                </View>
                <Text style={styles.entryXp}>{item.xp} XP</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Full standings</Text>
          {visibleBoard.map((item, index) => (
            <View key={`${item.username}-${index}`} style={styles.entryRow}>
              <Text style={styles.entryRank}>#{index + 1}</Text>
              <View style={styles.entryText}>
                <Text style={styles.entryName}>{item.username}</Text>
                <Text style={styles.entryMeta}>
                  {item.rank} | {item.tiles} tiles | {formatDistance(item.distance_meters)} |{' '}
                  {item.weekly_runs || 0} weekly runs
                </Text>
              </View>
              <Text style={styles.entryXp}>{labelForMode(item, mode)}</Text>
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
  seasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  seasonTile: {
    minWidth: 142,
    flexGrow: 1,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },
  seasonTileLabel: { color: COLORS.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  seasonTileValue: { color: COLORS.text, fontSize: 18, fontWeight: '900', marginTop: 8 },
  playerSpotlight: {
    backgroundColor: 'rgba(12, 24, 18, 0.92)',
    borderColor: 'rgba(99, 249, 141, 0.22)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  spotlightLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  spotlightTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 8 },
  spotlightMeta: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  spotlightScore: { color: COLORS.accent, fontSize: 20, fontWeight: '900' },
  modeRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 10,
  },
  modeButton: {
    minWidth: 86,
    flexGrow: 1,
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.panelMuted,
  },
  modeButtonActive: { backgroundColor: COLORS.accent },
  modeButtonText: { color: COLORS.muted, fontSize: 13, fontWeight: '900' },
  modeButtonTextActive: { color: '#06120a' },
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
  rivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(35, 27, 10, 0.66)',
    borderRadius: 18,
    padding: 14,
  },
  rivalPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.warning,
  },
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
