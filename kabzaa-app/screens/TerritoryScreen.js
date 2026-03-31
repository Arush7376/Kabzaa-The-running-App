import React, { useCallback, useMemo, useState } from 'react';
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
};

function SummaryTile({ label, value }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export default function TerritoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const loadData = useCallback(async () => {
    const response = await api.fetchTerritory();
    setData(response);
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

  const hotspotLeader = useMemo(() => data?.hotspots?.[0] || null, [data]);

  if (loading && !data) {
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
          <Text style={styles.kicker}>TERRITORY MATRIX</Text>
          <Text style={styles.title}>{data.owned_tiles_count} active captures</Text>
          <Text style={styles.subtitle}>
            Claimed sectors are now easier to scan, with a clearer ledger and hotspot summary.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryTile label="Owned tiles" value={`${data.owned_tiles_count}`} />
          <SummaryTile
            label="Top rival"
            value={hotspotLeader ? hotspotLeader.username : 'Unknown'}
          />
          <SummaryTile
            label="Hotspot total"
            value={hotspotLeader ? `${hotspotLeader.tile_count}` : '--'}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Tile ledger</Text>
          <Text style={styles.panelSubtitle}>
            Compact view of recently secured tiles. Green cells are controlled sectors.
          </Text>
          <View style={styles.tileGrid}>
            {data.tiles.map((tile) => (
              <View key={`${tile.lat_index}-${tile.lng_index}`} style={styles.tileCell}>
                <View style={styles.tileMarker} />
                <Text style={styles.tileCellPrimary}>{tile.lat_index}</Text>
                <Text style={styles.tileCellSecondary}>{tile.lng_index}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Hotspot standings</Text>
          {data.hotspots.map((item, index) => (
            <View key={`${item.username}-${index}`} style={styles.hotspotRow}>
              <View style={styles.hotspotRankWrap}>
                <Text style={styles.hotspotRank}>#{index + 1}</Text>
              </View>
              <View style={styles.hotspotText}>
                <Text style={styles.hotspotName}>{item.username}</Text>
                <Text style={styles.hotspotTiles}>{item.tile_count} controlled tiles</Text>
              </View>
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
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryTile: {
    minWidth: 150,
    flexGrow: 1,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  summaryLabel: { color: COLORS.secondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  summaryValue: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 8 },
  panel: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  panelTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  panelSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileCell: {
    width: 82,
    minHeight: 82,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 249, 141, 0.2)',
    backgroundColor: 'rgba(99, 249, 141, 0.12)',
    padding: 10,
    justifyContent: 'space-between',
  },
  tileMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  tileCellPrimary: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginTop: 8 },
  tileCellSecondary: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  hotspotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.panelMuted,
    borderRadius: 18,
    padding: 14,
  },
  hotspotRankWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 249, 141, 0.12)',
  },
  hotspotRank: { color: COLORS.accent, fontSize: 16, fontWeight: '900' },
  hotspotText: { flex: 1 },
  hotspotName: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  hotspotTiles: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
});
