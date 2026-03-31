import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

const COLORS = {
  background: '#04070c',
  backgroundSoft: '#09101a',
  panel: 'rgba(10, 14, 22, 0.78)',
  panelStrong: 'rgba(8, 12, 20, 0.94)',
  panelMuted: 'rgba(14, 20, 31, 0.9)',
  border: 'rgba(117, 199, 255, 0.14)',
  text: '#f4f7fb',
  muted: '#90a5c0',
  accent: '#63f98d',
  secondary: '#69c6ff',
  warning: '#ffd66b',
  danger: '#ff4f73',
};

function StatChip({ label, value, tone = 'default' }) {
  return (
    <View style={[styles.statChip, tone === 'accent' ? styles.statChipAccent : null]}>
      <Text style={[styles.statChipLabel, tone === 'accent' ? styles.statChipLabelAccent : null]}>
        {label}
      </Text>
      <Text style={styles.statChipValue}>{value}</Text>
    </View>
  );
}

function FeatureCard({ eyebrow, title, subtitle, onPress, accent }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.featureCard, accent ? styles.featureCardAccent : null]}
    >
      <Text style={[styles.featureEyebrow, accent ? styles.featureEyebrowAccent : null]}>
        {eyebrow}
      </Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{subtitle}</Text>
      <Text style={styles.featureLink}>Open</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { username, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const data = await api.fetchProfile();
          if (active) {
            setProfile(data);
          }
        } catch (error) {
          if (active) {
            setProfile(null);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const heroStats = profile
    ? [
        { label: 'Rank', value: profile.rank, tone: 'accent' },
        { label: 'XP', value: `${profile.xp}`, tone: 'default' },
        { label: 'Tiles', value: `${profile.totals.total_tiles}`, tone: 'default' },
        { label: 'Runs', value: `${profile.totals.total_runs}`, tone: 'default' },
      ]
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowPrimary} />
      <View style={styles.glowSecondary} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroPanel}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>KABZAA // DISTRICT CONTROL</Text>
              <Text style={styles.title}>Own the route, {username || 'operator'}.</Text>
              <Text style={styles.subtitle}>
                A cleaner tactical hub for runs, territory, progression, and competitive play.
              </Text>
            </View>
            <View style={styles.pulseBadge}>
              <Text style={styles.pulseBadgeLabel}>LIVE STATUS</Text>
              <Text style={styles.pulseBadgeValue}>Ready</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={styles.loading} />
          ) : profile ? (
            <View style={styles.heroStatsWrap}>
              {heroStats.map((item) => (
                <StatChip key={item.label} label={item.label} tone={item.tone} value={item.value} />
              ))}
            </View>
          ) : (
            <View style={styles.inlineNotice}>
              <Text style={styles.inlineNoticeText}>
                Profile feed is unavailable right now. Core run controls still work.
              </Text>
            </View>
          )}

          <View style={styles.primaryActions}>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => navigation.navigate('Run')}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Start Run</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.navigate('Leaderboard')}
              style={styles.ghostButton}
            >
              <Text style={styles.ghostButtonText}>Open Season Board</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.sectionPanel}>
            <Text style={styles.sectionEyebrow}>Mission Feed</Text>
            <Text style={styles.sectionTitle}>Choose your next move</Text>
            <Text style={styles.sectionBody}>
              Everything important is one tap away, with less friction and better pacing.
            </Text>
          </View>
          <View style={styles.directivePanel}>
            <Text style={styles.directiveLabel}>Today&apos;s directive</Text>
            <Text style={styles.directiveTitle}>Capture 3 fresh tiles</Text>
            <Text style={styles.directiveBody}>
              Use a short live run to keep momentum and climb the district board.
            </Text>
          </View>
        </View>

        <View style={styles.featureGrid}>
          <FeatureCard
            accent
            eyebrow="Progress"
            onPress={() => navigation.navigate('Profile')}
            subtitle="XP, achievements, run history, and your active player rank."
            title="Profile"
          />
          <FeatureCard
            eyebrow="Control"
            onPress={() => navigation.navigate('Territory')}
            subtitle="Review captured tiles, hotspot leaders, and long-term ownership."
            title="Territory"
          />
          <FeatureCard
            eyebrow="Competition"
            onPress={() => navigation.navigate('Leaderboard')}
            subtitle="Track the live season board and active challenge progression."
            title="Leaderboard"
          />
          <FeatureCard
            eyebrow="Action"
            onPress={() => navigation.navigate('Run')}
            subtitle={
              Platform.OS === 'web'
                ? 'Web-first tactical board with simulation support when GPS is limited.'
                : 'Live GPS run view with avatar sync and pseudo-3D map movement.'
            }
            title="Tactical Run"
          />
        </View>

        <View style={styles.footerBar}>
          <Text style={styles.footerBarText}>Session is token-backed and ready for mobile or web.</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutButtonText}>Sign out</Text>
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
    top: -160,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(99, 249, 141, 0.14)',
  },
  glowSecondary: {
    position: 'absolute',
    left: -140,
    bottom: -160,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(69, 160, 255, 0.12)',
  },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, gap: 16 },
  heroPanel: {
    backgroundColor: COLORS.panelStrong,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(117, 199, 255, 0.16)',
    padding: 22,
  },
  heroTopRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroCopy: { flex: 1, maxWidth: 620 },
  kicker: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2.2 },
  title: { color: COLORS.text, fontSize: 34, fontWeight: '900', lineHeight: 40, marginTop: 12 },
  subtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  pulseBadge: {
    alignSelf: Platform.OS === 'web' ? 'flex-start' : 'stretch',
    minWidth: 140,
    backgroundColor: 'rgba(11, 20, 32, 0.9)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(99, 249, 141, 0.22)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pulseBadgeLabel: { color: COLORS.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  pulseBadgeValue: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 8 },
  loading: { marginTop: 20 },
  heroStatsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  statChip: {
    minWidth: 112,
    flexGrow: 1,
    backgroundColor: COLORS.panelMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statChipAccent: { borderColor: 'rgba(99, 249, 141, 0.26)' },
  statChipLabel: { color: COLORS.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  statChipLabelAccent: { color: COLORS.accent },
  statChipValue: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginTop: 6 },
  inlineNotice: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(26, 22, 10, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 107, 0.2)',
  },
  inlineNoticeText: { color: COLORS.warning, fontSize: 13, lineHeight: 19 },
  primaryActions: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 12, marginTop: 20 },
  primaryButton: {
    flex: 1,
    minHeight: 60,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryButtonText: { color: '#06120a', fontSize: 17, fontWeight: '900', letterSpacing: 0.4 },
  ghostButton: {
    minHeight: 60,
    minWidth: 190,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(13, 19, 31, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  ghostButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  sectionRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 14 },
  sectionPanel: {
    flex: 1.4,
    backgroundColor: COLORS.panel,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  sectionEyebrow: { color: COLORS.secondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.7 },
  sectionTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', marginTop: 8 },
  sectionBody: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  directivePanel: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 32, 0.92)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(105, 198, 255, 0.18)',
    padding: 18,
  },
  directiveLabel: { color: COLORS.warning, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  directiveTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 10 },
  directiveBody: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  featureCard: {
    minWidth: 160,
    flexGrow: 1,
    backgroundColor: COLORS.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  featureCardAccent: { borderColor: 'rgba(99, 249, 141, 0.24)' },
  featureEyebrow: { color: COLORS.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  featureEyebrowAccent: { color: COLORS.accent },
  featureTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 10 },
  featureBody: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 8, minHeight: 58 },
  featureLink: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginTop: 12 },
  footerBar: {
    backgroundColor: 'rgba(10, 14, 22, 0.74)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  footerBarText: { flex: 1, color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  signOutButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 115, 0.3)',
    backgroundColor: 'rgba(27, 10, 15, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  signOutButtonText: { color: COLORS.danger, fontSize: 14, fontWeight: '800' },
});
