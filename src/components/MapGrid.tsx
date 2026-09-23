import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { MECH_ART, TERRAIN_ART } from '../assets';
import { key, same } from '../game/engine';
import { useGame } from '../game/store';
import { Pos, UnitState } from '../game/types';

const COLS = 14;
const ROWS = 10;
const PANEL_W = 237;
const ZOOM = 1.5; // board rendered larger than viewport so it can be panned by finger

/** One board tile — memoized so the 140-cell grid doesn't re-render on every unit/walk update. */
const Tile = React.memo(function Tile({
  p,
  tw,
  th,
  terrain,
  inMove,
  inAtk,
  inThreat,
  inDanger,
  crate,
  beacon,
  reach,
  onTap,
}: {
  p: Pos;
  tw: number;
  th: number;
  terrain: keyof typeof TERRAIN_ART;
  inMove: boolean;
  inAtk: boolean;
  inThreat: boolean;
  inDanger: boolean;
  crate: boolean;
  beacon: boolean;
  reach: boolean;
  onTap: (p: Pos) => void;
}) {
  return (
    <Pressable onPress={() => onTap(p)} style={[styles.tile, { left: p.x * tw, top: p.y * th, width: tw, height: th }]}>
      <Image cachePolicy="memory" source={TERRAIN_ART[terrain]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.gridLine} pointerEvents="none" />
      {crate && <Text style={styles.crateTag} pointerEvents="none">▣</Text>}
      {beacon && (
        <View style={styles.beaconOv} pointerEvents="none">
          <Text style={styles.beaconTag}>⌖</Text>
        </View>
      )}
      {reach && (
        <View style={[styles.beaconOv, { backgroundColor: 'rgba(60,220,255,0.16)', borderColor: 'rgba(90,230,255,0.8)' }]} pointerEvents="none">
          <Text style={[styles.beaconTag, { color: '#4de3ff', textShadowColor: 'rgba(60,220,255,0.9)' }]}>➤</Text>
        </View>
      )}
      {inThreat && !inMove && !inAtk && <View style={[styles.overlay, styles.threatOv]} pointerEvents="none" />}
      {inDanger && !inMove && !inAtk && !inThreat && <View style={[styles.overlay, styles.dangerOv]} pointerEvents="none" />}
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
            borderColor: u.phase2 ? '#ff3030' : u.def.boss || u.elite ? '#ffd34d' : u.side === 'player' ? (u.npc ? '#7dff9d' : '#6db4ff') : '#ff6b6b',
            borderWidth: u.phase2 ? 2.5 : 1.5,
            opacity: u.acted || ghosting ? 0.45 : 1,
          },
        ]}
      >
        <Image cachePolicy="memory" source={MECH_ART[u.def.id]} style={[StyleSheet.absoluteFill, u.side === 'enemy' && { transform: [{ scaleX: -1 }] }]} contentFit="cover" />
        {u.phase2 && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,40,40,0.18)' }]} />}
      </View>
      <View style={[styles.hpBarBg, { width: chip * 0.9 }]}>
        <View style={[styles.hpBar, { width: `${(u.hp / u.def.maxHp) * 100}%`, backgroundColor: u.side === 'player' ? '#4dff7a' : '#ff5a5a' }]} />
      </View>
      <View style={[styles.lvTag, { borderColor: u.side === 'player' ? '#6db4ff' : '#ff6b6b' }]}>
        <Text style={styles.lvTxt}>Lv{u.level}</Text>
      </View>
      {u.def.boss ? <Text style={[styles.bossTag, u.phase2 && { color: '#ff5050' }]}>{u.phase2 ? 'Ω ACE' : 'ACE'}</Text> : u.elite ? <Text style={[styles.bossTag, { color: '#ffd34d' }]}>★ELITE</Text> : u.npc ? <Text style={[styles.bossTag, { color: '#7dff9d' }]}>🛡ALLY</Text> : u.aceMastery ? <Text style={[styles.bossTag, { color: '#6fe0ff' }]}>★ACE</Text> : null}
      {spiritBadges(u).length > 0 && <Text style={styles.spiritTag}>{spiritBadges(u)}</Text>}
      {(u.statuses?.length ?? 0) > 0 && <Text style={styles.statusTag}>{u.statuses!.map((fx) => (fx.id === 'burn' ? '🔥' : fx.id === 'stun' ? '⚡' : '⬇')).join('')}</Text>}
      {u.will > 100 && (
        <View style={[styles.willTag, u.will >= 130 && { borderColor: '#ffd34d' }]}>
          <Text style={[styles.willTxt, u.will >= 130 && { color: '#ffd34d' }]}>◈{u.will}</Text>
        </View>
      )}
    </>
  );
});

/** Tiny glyphs over a unit chip for spirits currently active on it. */
function spiritBadges(u: UnitState): string {
  let b = '';
  if (u.flashUntilEndOfEnemyPhase) b += '✦';
  if (u.gritUntilEndOfEnemyPhase || u.guardUntilEndOfEnemyPhase) b += '⛨';
  if (u.focusUntilEndOfEnemyPhase) b += '◎';
  if (u.strikeForNextAttack || u.valorForNextAttack || u.soulForNextAttack) b += '⚔';
  if (u.snipeForNextAttack) b += '⌖';
  if (u.fortuneForNextAttack) b += '✧';
  if (u.accelThisTurn) b += '»';
  return b;
}

export function MapGrid() {
  const units = useGame((s) => s.units);
  const map = useGame((s) => s.map);
  const missionCh = useGame((s) => s.missionCh);
  const moveTiles = useGame((s) => s.moveTiles);
  const attackTiles = useGame((s) => s.attackTiles);
  const threatTiles = useGame((s) => s.threatTiles);
  const dangerTiles = useGame((s) => s.dangerTiles);
  const crates = useGame((s) => s.crates);
  const selectedUid = useGame((s) => s.selectedUid);
  const pendingMove = useGame((s) => s.pendingMove);
  const walk = useGame((s) => s.walk);
  const tapTile = useGame((s) => s.tapTile);
  const { width, height } = useWindowDimensions();

  // viewport is the left area; the board renders ZOOM× bigger and pans on drag
  const vw = width - PANEL_W;
  const vh = height;
  const tw = (vw / COLS) * ZOOM;
  const th = (vh / ROWS) * ZOOM;
  const bw = tw * COLS;
  const bh = th * ROWS;
  const chip = Math.min(tw, th) * 0.9;
  const maxX = Math.max(0, bw - vw);
  const maxY = Math.max(0, bh - vh);

  const pan = useRef(new Animated.ValueXY({ x: -maxX / 2, y: -maxY / 2 })).current;
  const last = useRef({ x: -maxX / 2, y: -maxY / 2 });
  // re-center when the board/viewport size changes (rotation, resize)
  useEffect(() => {
    const c = { x: -maxX / 2, y: -maxY / 2 };
    last.current = c;
    pan.setValue(c);
  }, [maxX, maxY, pan]);

  const clamp = (v: number, m: number) => Math.max(-m, Math.min(0, v));
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
      onPanResponderMove: (_, g) => {
        pan.setValue({ x: clamp(last.current.x + g.dx, maxX), y: clamp(last.current.y + g.dy, maxY) });
      },
      onPanResponderRelease: (_, g) => {
        last.current = { x: clamp(last.current.x + g.dx, maxX), y: clamp(last.current.y + g.dy, maxY) };
        pan.setValue(last.current);
      },
    }),
  ).current;

  const tiles = useMemo(() => {
    const t: Pos[] = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) t.push({ x, y });
    return t;
  }, []);

  const ghost = pendingMove && selectedUid ? units.find((u) => u.uid === selectedUid) : undefined;

  return (
    <View style={[styles.viewPort, { width: vw, height: vh }]} {...responder.panHandlers}>
      <Animated.View style={{ width: bw, height: bh, transform: pan.getTranslateTransform() }}>
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
            inDanger={dangerTiles.has(key(p))}
            crate={crates.some((c) => c.pos.x === p.x && c.pos.y === p.y)}
            beacon={!!missionCh.seizePos && missionCh.seizePos.x === p.x && missionCh.seizePos.y === p.y}
            reach={!!missionCh.reachPos && missionCh.reachPos.x === p.x && missionCh.reachPos.y === p.y}
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
              <Image cachePolicy="memory" source={MECH_ART[ghost.def.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          </View>
        )}
      </Animated.View>
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
  viewPort: { backgroundColor: '#0a0e1a', overflow: 'hidden', alignSelf: 'stretch' },
  tile: { position: 'absolute', overflow: 'hidden' },
  gridLine: { ...StyleSheet.absoluteFill, borderWidth: 0.5, borderColor: 'rgba(8,12,24,0.45)' },
  overlay: { ...StyleSheet.absoluteFill },
  moveOv: { backgroundColor: 'rgba(70,140,255,0.4)' },
  atkOv: { backgroundColor: 'rgba(255,60,60,0.45)' },
  threatOv: { backgroundColor: 'rgba(255,150,40,0.26)', borderWidth: 1, borderColor: 'rgba(255,150,40,0.35)' },
  dangerOv: { backgroundColor: 'rgba(255,50,50,0.16)' },
  crateTag: { position: 'absolute', top: 3, right: 3, color: '#ffd34d', fontSize: 15, fontWeight: '900', textShadowColor: 'rgba(255,190,40,0.9)', textShadowRadius: 5 },
  beaconOv: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,210,60,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,220,90,0.7)', alignItems: 'center', justifyContent: 'center' },
  beaconTag: { color: '#ffd34d', fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(255,210,60,0.9)', textShadowRadius: 8 },
  spiritTag: { position: 'absolute', bottom: 3, right: 2, color: '#9fe8ff', fontSize: 8, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3 },
  statusTag: { position: 'absolute', bottom: 3, left: 2, color: '#ffb44d', fontSize: 9, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3 },
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
  willTag: { position: 'absolute', top: 1, right: 1, paddingHorizontal: 2, borderRadius: 3, borderWidth: 1, borderColor: '#ff7a9d', backgroundColor: 'rgba(20,8,16,0.85)' },
  willTxt: { color: '#ff7a9d', fontSize: 7, fontWeight: '800' },
});
