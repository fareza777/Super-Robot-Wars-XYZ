import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { MECH_ART, TERRAIN_ART } from '../assets';
import { MISSION_SSS } from '../game/data';
import { key, same } from '../game/engine';
import { useGame } from '../game/store';
import { Pos } from '../game/types';

const COLS = 14;
const ROWS = 10;
const PANEL_W = 237;

export function MapGrid() {
  const units = useGame((s) => s.units);
  const moveTiles = useGame((s) => s.moveTiles);
  const attackTiles = useGame((s) => s.attackTiles);
  const selectedUid = useGame((s) => s.selectedUid);
  const pendingMove = useGame((s) => s.pendingMove);
  const tapTile = useGame((s) => s.tapTile);
  const { width, height } = useWindowDimensions();

  // grid fills the board area edge-to-edge, no wallpaper behind it
  const tw = (width - PANEL_W) / COLS;
  const th = height / ROWS;
  const chip = Math.min(tw, th) * 0.9;

  const tiles = useMemo(() => {
    const t: Pos[] = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) t.push({ x, y });
    return t;
  }, []);

  const ghost = pendingMove && selectedUid ? units.find((u) => u.uid === selectedUid) : undefined;

  return (
    <View style={[styles.board, { width: width - PANEL_W, height }]}>
      {tiles.map((p) => {
        const inMove = moveTiles.has(key(p));
        const inAtk = attackTiles.has(key(p));
        return (
          <Pressable key={key(p)} onPress={() => tapTile(p)} style={[styles.tile, { left: p.x * tw, top: p.y * th, width: tw, height: th }]}>
            <Image source={TERRAIN_ART[T(p.y, p.x)]} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={styles.gridLine} pointerEvents="none" />
            {inMove && <View style={[styles.overlay, styles.moveOv]} pointerEvents="none" />}
            {inAtk && <View style={[styles.overlay, styles.atkOv]} pointerEvents="none" />}
          </Pressable>
        );
      })}
      {units
        .filter((u) => u.alive)
        .map((u) => {
          const ghosting = ghost && u.uid === ghost.uid;
          return (
            <View key={u.uid} pointerEvents="none" style={[styles.unitWrap, { left: u.pos.x * tw, top: u.pos.y * th, width: tw, height: th }]}>
              <View
                style={[
                  styles.chip,
                  {
                    width: chip,
                    height: chip,
                    borderColor: u.def.boss ? '#ffd34d' : u.side === 'player' ? '#6db4ff' : '#ff6b6b',
                    opacity: u.acted || ghosting ? 0.45 : 1,
                  },
                ]}
              >
                <Image source={MECH_ART[u.def.id]} style={[StyleSheet.absoluteFill, u.side === 'enemy' && { transform: [{ scaleX: -1 }] }]} contentFit="cover" />
              </View>
              <View style={[styles.hpBarBg, { width: chip * 0.9 }]}>
                <View style={[styles.hpBar, { width: `${(u.hp / u.def.maxHp) * 100}%`, backgroundColor: u.side === 'player' ? '#4dff7a' : '#ff5a5a' }]} />
              </View>
              <View style={[styles.lvTag, { borderColor: u.side === 'player' ? '#6db4ff' : '#ff6b6b' }]}>
                <Text style={styles.lvTxt}>Lv{u.level}</Text>
              </View>
              {u.def.boss && <Text style={styles.bossTag}>ACE</Text>}
            </View>
          );
        })}
      {ghost && pendingMove && !same(ghost.pos, pendingMove) && (
        <View pointerEvents="none" style={[styles.unitWrap, { left: pendingMove.x * tw, top: pendingMove.y * th, width: tw, height: th, opacity: 0.65 }]}>
          <View style={[styles.chip, { width: chip, height: chip, borderColor: '#6db4ff' }]}>
            <Image source={MECH_ART[ghost.def.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
        </View>
      )}
    </View>
  );
}

// fixed map in this mission
const T = (y: number, x: number) => MISSION_SSS.terrain[y][x];

const styles = StyleSheet.create({
  board: { backgroundColor: '#0a0e1a', alignSelf: 'stretch' },
  tile: { position: 'absolute', overflow: 'hidden' },
  gridLine: { ...StyleSheet.absoluteFill, borderWidth: 0.5, borderColor: 'rgba(8,12,24,0.45)' },
  overlay: { ...StyleSheet.absoluteFill },
  moveOv: { backgroundColor: 'rgba(70,140,255,0.4)' },
  atkOv: { backgroundColor: 'rgba(255,60,60,0.45)' },
  unitWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 6, overflow: 'hidden', borderWidth: 1.5, backgroundColor: '#0a0e1e' },
  hpBarBg: { position: 'absolute', bottom: 0, height: 3, backgroundColor: '#111', borderRadius: 1 },
  hpBar: { height: 3, borderRadius: 1 },
  lvTag: {
    position: 'absolute',
    top: 1,
    left: 1,
    paddingHorizontal: 3,
    paddingVertical: 0,
    borderRadius: 3,
    borderWidth: 1,
    backgroundColor: 'rgba(8,10,20,0.85)',
  },
  lvTxt: { color: '#fff', fontSize: 7, fontWeight: '800' },
  bossTag: { position: 'absolute', top: -6, fontSize: 8, color: '#ffd34d', fontWeight: '800' },
});
