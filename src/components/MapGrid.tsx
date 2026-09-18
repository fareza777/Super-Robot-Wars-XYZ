import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MISSION_SSS, TERRAIN_INFO } from '../game/data';
import { key, same } from '../game/engine';
import { useGame } from '../game/store';
import { Pos } from '../game/types';
import { MechSprite } from './MechSprite';

export function MapGrid() {
  const units = useGame((s) => s.units);
  const moveTiles = useGame((s) => s.moveTiles);
  const attackTiles = useGame((s) => s.attackTiles);
  const selectedUid = useGame((s) => s.selectedUid);
  const pendingMove = useGame((s) => s.pendingMove);
  const tapTile = useGame((s) => s.tapTile);
  const { width, height } = useWindowDimensions();

  const mapW = width - 240; // side panel
  const tile = Math.max(30, Math.min(46, Math.floor(Math.min(mapW / 14, (height - 8) / 10))));

  const tiles = useMemo(() => {
    const t: Pos[] = [];
    for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) t.push({ x, y });
    return t;
  }, []);

  const ghost = pendingMove && selectedUid ? units.find((u) => u.uid === selectedUid) : undefined;

  return (
    <ScrollView horizontal style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={{ width: tile * 14, height: tile * 10 }}>
          {tiles.map((p) => {
            const ter = TERRAIN_INFO[T(p.y, p.x)];
            const inMove = moveTiles.has(key(p));
            const inAtk = attackTiles.has(key(p));
            return (
              <Pressable
                key={key(p)}
                onPress={() => tapTile(p)}
                style={[
                  styles.tile,
                  {
                    left: p.x * tile,
                    top: p.y * tile,
                    width: tile,
                    height: tile,
                    backgroundColor: ter.color,
                  },
                ]}
              >
                {ter.glyph ? <Text style={[styles.glyph, { fontSize: tile * 0.45 }]}>{ter.glyph}</Text> : null}
                {inMove && <View style={[styles.overlay, styles.moveOv]} />}
                {inAtk && <View style={[styles.overlay, styles.atkOv]} />}
              </Pressable>
            );
          })}
          {units.filter((u) => u.alive).map((u) => {
            const ghosting = ghost && u.uid === ghost.uid;
            return (
              <View key={u.uid} pointerEvents="none" style={[styles.unitWrap, { left: u.pos.x * tile, top: u.pos.y * tile, width: tile, height: tile }]}>
                <MechSprite def={u.def} size={tile * 0.92} flip={u.side === 'enemy'} dimmed={u.acted || ghosting} />
                <View style={[styles.hpBarBg, { width: tile * 0.8 }]}>
                  <View style={[styles.hpBar, { width: `${(u.hp / u.def.maxHp) * 100}%`, backgroundColor: u.side === 'player' ? '#4dff7a' : '#ff5a5a' }]} />
                </View>
                {u.def.boss && <Text style={styles.bossTag}>ACE</Text>}
              </View>
            );
          })}
          {ghost && pendingMove && !same(ghost.pos, pendingMove) && (
            <View pointerEvents="none" style={[styles.unitWrap, { left: pendingMove.x * tile, top: pendingMove.y * tile, width: tile, height: tile, opacity: 0.65 }]}>
              <MechSprite def={ghost.def} size={tile * 0.92} />
            </View>
          )}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

// fixed map in this mission
const T = (y: number, x: number) => MISSION_SSS.terrain[y][x];

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', justifyContent: 'center' },
  tile: { position: 'absolute', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  glyph: { color: 'rgba(255,255,255,0.28)' },
  overlay: { ...StyleSheet.absoluteFill },
  moveOv: { backgroundColor: 'rgba(70,140,255,0.38)' },
  atkOv: { backgroundColor: 'rgba(255,60,60,0.45)' },
  unitWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  hpBarBg: { position: 'absolute', bottom: -2, height: 3, backgroundColor: '#111', borderRadius: 1 },
  hpBar: { height: 3, borderRadius: 1 },
  bossTag: { position: 'absolute', top: -6, fontSize: 8, color: '#ffd34d', fontWeight: '800' },
});
