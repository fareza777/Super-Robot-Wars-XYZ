import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { MECH_ART, TERRAIN_ART } from '../assets';
import { key, same } from '../game/engine';
import { useGame } from '../game/store';
import { Pos, UnitState } from '../game/types';

const COLS = 14;
const ROWS = 10;
const PANEL_W = 237;

/** One board tile — memoized so the 140-cell grid doesn't re-render on every unit/walk update. */
const Tile = React.memo(function Tile({
  p,
  tw,
  th,
  terrain,
  inMove,
  inAtk,
  inThreat,
  onTap,
}: {
  p: Pos;
  tw: number;
  th: number;
  terrain: keyof typeof TERRAIN_ART;
  inMove: boolean;
  inAtk: boolean;
  inThreat: boolean;
  onTap: (p: Pos) => void;
}) {
  return (
    <Pressable onPress={() => onTap(p)} style={[styles.tile, { left: p.x * tw, top: p.y * th, width: tw, height: th }]}>
      <Image source={TERRAIN_ART[terrain]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.gridLine} pointerEvents="none" />
      {inThreat && !inMove && !inAtk && <View style={[styles.overlay, styles.threatOv]} pointerEvents="none" />}
      {inMove && <View style={[styles.overlay, styles.moveOv]} pointerEvents="none" />}
      {inAtk && <View style={[styles.overlay, styles.atkOv]} pointerEvents="none" />}
    </Pressable>
  );
});

/** Unit chip (mech art + hp bar + level) — memoized; only re-renders when its own unit state changes. */
const UnitCell = React.memo(function UnitCell({ u, chip, ghosting }: { u: UnitState; chip: number; ghosting: boolean }) {
  return (
    <>
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
    </>
  );
});

export function MapGrid() {
  const units = useGame((s) => s.units);
  const map = useGame((s) => s.map);
  const moveTiles = useGame((s) => s.moveTiles);
  const attackTiles = useGame((s) => s.attackTiles);
  const threatTiles = useGame((s) => s.threatTiles);
  const selectedUid = useGame((s) => s.selectedUid);
  const pendingMove = useGame((s) => s.pendingMove);
  const walk = useGame((s) => s.walk);
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
      {tiles.map((p) => (
        <Tile
          key={key(p)}
          p={p}
          tw={tw}
          th={th}
          terrain={map.terrain[p.y][p.x]}
          inMove={moveTiles.has(key(p))}
          inAtk={attackTiles.has(key(p))}
          inThreat={threatTiles.has(key(p))}
          onTap={tapTile}
        />
      ))}
      {units
        .filter((u) => u.alive)
        .map((u) => {
          const walking = walk && walk.uid === u.uid && walk.path.length > 1;
          if (walking) return <WalkingChip key={u.uid} path={walk!.path} tw={tw} th={th} cell={<UnitCell u={u} chip={chip} ghosting={false} />} />;
          return (
            <View key={u.uid} pointerEvents="none" style={[styles.unitWrap, { left: u.pos.x * tw, top: u.pos.y * th, width: tw, height: th }]}>
              <UnitCell u={u} chip={chip} ghosting={!!ghost && u.uid === ghost.uid} />
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

/** Animated unit chip walking tile-by-tile along `path` with a little hop per step. */
function WalkingChip({ path, tw, th, cell }: { path: Pos[]; tw: number; th: number; cell: React.ReactNode }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, { toValue: path.length - 1, duration: 190 * (path.length - 1), easing: Easing.linear, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const idx = path.map((_, i) => i);
  const tx = p.interpolate({ inputRange: idx, outputRange: path.map((wp) => wp.x * tw) });
  const ty = p.interpolate({ inputRange: idx, outputRange: path.map((wp) => wp.y * th) });
  const hopIn: number[] = [];
  const hopOut: number[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    hopIn.push(i, i + 0.5);
    hopOut.push(0, -th * 0.18);
  }
  hopIn.push(path.length - 1);
  hopOut.push(0);
  const hop = p.interpolate({ inputRange: hopIn, outputRange: hopOut });
  return (
    <Animated.View pointerEvents="none" style={[styles.unitWrap, { width: tw, height: th, transform: [{ translateX: tx }, { translateY: Animated.add(ty, hop) }] }]}>
      {cell}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#0a0e1a', alignSelf: 'stretch' },
  tile: { position: 'absolute', overflow: 'hidden' },
  gridLine: { ...StyleSheet.absoluteFill, borderWidth: 0.5, borderColor: 'rgba(8,12,24,0.45)' },
  overlay: { ...StyleSheet.absoluteFill },
  moveOv: { backgroundColor: 'rgba(70,140,255,0.4)' },
  atkOv: { backgroundColor: 'rgba(255,60,60,0.45)' },
  threatOv: { backgroundColor: 'rgba(255,150,40,0.26)', borderWidth: 1, borderColor: 'rgba(255,150,40,0.35)' },
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
