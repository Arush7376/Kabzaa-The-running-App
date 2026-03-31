import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  background: '#04070c',
  panel: 'rgba(10, 14, 22, 0.88)',
  panelMuted: 'rgba(12, 19, 30, 0.92)',
  border: 'rgba(117, 199, 255, 0.14)',
  text: '#f4f7fb',
  muted: '#90a5c0',
  accent: '#63f98d',
  secondary: '#69c6ff',
};

function secondsToClock(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function RunSummaryScreen({ navigation, route }) {
  const summary = route.params?.summary;

  if (!summary) {
    navigation.replace('Home');
    return null;
  }

  const unlocked = (summary.achievements || []).filter((item) => item.unlocked);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowPrimary} />
      <View style={styles.glowSecondary} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>RUN COMPLETE</Text>
          <Text style={styles.title}>District sweep secured.</Text>
          <Text style={styles.subtitle}>
            Session #{summary.session_id} converted real movement into territory, XP, and rank
            progression.
          </Text>
          <View style={styles.rankRibbon}>
            <Text style={styles.rankRibbonLabel}>Current rank</Text>
            <Text style={styles.rankRibbonValue}>{summary.rank}</Text>
            <Text style={styles.rankRibbonXp}>{summary.xp} XP total</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <Metric label="Distance" value={`${(summary.distance_meters / 1000).toFixed(2)} km`} />
          <Metric label="Duration" value={secondsToClock(summary.duration_seconds)} />
          <Metric label="Avg speed" value={`${summary.average_speed_kmh.toFixed(1)} km/h`} />
          <Metric label="Owned tiles" value={`${summary.owned_tiles}`} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Unlocked on this session</Text>
          {unlocked.length ? (
            unlocked.map((item) => (
              <View key={item.id} style={styles.achievementCard}>
                <View style={styles.achievementDot} />
                <View style={styles.achievementText}>
                  <Text style={styles.achievementTitle}>{item.title}</Text>
                  <Text style={styles.achievementDesc}>{item.description}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No new badges this time, but the run still added progress.</Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Next move</Text>
          <Text style={styles.nextMoveText}>
            Keep momentum with another run, check your profile progression, or inspect the tile
            board for fresh contested zones.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.replace('Run')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Run Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Open Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Territory')} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View Territory</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  glowPrimary: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(99, 249, 141, 0.12)',
  },
  glowSecondary: {
    position: 'absolute',
    left: -120,
    bottom: -140,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(105, 198, 255, 0.1)',
  },
  content: { padding: 20, gap: 16 },
  hero: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 30,
    padding: 22,
  },
  kicker: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: COLORS.text, fontSize: 32, fontWeight: '900', marginTop: 10 },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  rankRibbon: {
    marginTop: 18,
    backgroundColor: COLORS.panelMuted,
    borderColor: 'rgba(99, 249, 141, 0.2)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rankRibbonLabel: { color: COLORS.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  rankRibbonValue: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 6 },
  rankRibbonXp: { color: COLORS.accent, fontSize: 15, fontWeight: '800', marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: {
    minWidth: 150,
    flexGrow: 1,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  metricLabel: { color: COLORS.secondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  metricValue: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 8 },
  panel: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  panelTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  achievementCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  achievementDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    backgroundColor: COLORS.accent,
  },
  achievementText: { flex: 1 },
  achievementTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  achievementDesc: { color: COLORS.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  nextMoveText: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  emptyText: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  actions: { gap: 10, marginBottom: 18 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 16,
  },
  primaryButtonText: { color: '#05120b', fontSize: 17, fontWeight: '900' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 15,
    backgroundColor: COLORS.panel,
  },
  secondaryButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
});
