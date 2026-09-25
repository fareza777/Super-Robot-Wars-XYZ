import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { MECH_ART, PILOT_ART, TERRAIN_ART } from '../assets';
import { TERRAIN_INFO } from '../game/data';
import { dist, isStealthHidden, key, moveRangeOf, same } from '../game/engine';
import { fogLit, useGame } from '../game/store';
import { MapDef, Pos, UnitState } from '../game/types';

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
  hazard,
  mine,
  inBlast,
  aimed,
  inFog,
  onTap,
  rp,
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
  hazard: boolean;
  /** minefield — detonates when a unit lands here */
  mine: boolean;
  /** inside the aimed MAP blast radius */
  inBlast: boolean;
  /** the MAP aim tile itself */
  aimed: boolean;
  /** fog-of-war dim — no player unit within sight range */
  inFog: boolean;
  onTap: (p: Pos) => void;
  /** shared range-overlay shimmer — one Animated.Value for the whole board */
  rp: Animated.Value;
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
      {hazard && (
        <View style={[styles.beaconOv, styles.hazardOv]} pointerEvents="none">
          <Text style={[styles.beaconTag, { color: '#ff9a4d', textShadowColor: 'rgba(255,140,40,0.9)' }]}>⚠</Text>
        </View>
      )}
      {mine && (
        <View style={styles.mineTag} pointerEvents="none">
          <Text style={styles.mineTagTxt}>✦</Text>
        </View>
      )}
      {inThreat && !inMove && !inAtk && <View style={[styles.overlay, styles.threatOv]} pointerEvents="none" />}
      {inDanger && !inMove && !inAtk && !inThreat && <View style={[styles.overlay, styles.dangerOv]} pointerEvents="none" />}
      {inMove && <Animated.View style={[styles.overlay, styles.moveOv, { opacity: rp.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.18] }) }]} pointerEvents="none" />}
      {inAtk && <Animated.View style={[styles.overlay, styles.atkOv, { opacity: rp.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.25] }) }]} pointerEvents="none" />}
      {inBlast && (
        <Animated.View style={[styles.overlay, styles.blastOv, { opacity: rp.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }]} pointerEvents="none">
          {aimed && <Text style={styles.aimTag}>◎</Text>}
        </Animated.View>
      )}
      {inFog && <View style={[styles.overlay, styles.fogOv]} pointerEvents="none" />}
    </Pressable>
  );
});

/** Unit chip (mech art + hp bar + level) — memoized; only re-renders when its own unit state changes. */
const UnitCell = React.memo(function UnitCell({ u, chip, ghosting, threat }: { u: UnitState; chip: number; ghosting: boolean; threat?: boolean }) {
  // gentle hover bob — each unit runs its own loop, staggered by uid so the
  // squadron doesn't bob in lockstep
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -2.2, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const t = setTimeout(() => loop.start(), (u.uid.charCodeAt(u.uid.length - 1) * 137) % 900);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: bob }] }}>
      <View
        style={[
          styles.chip,
          {
            width: chip,
            height: chip,
            borderColor: u.phase2 ? '#ff3030' : threat ? '#ff2020' : u.def.boss || u.elite ? '#ffd34d' : u.side === 'player' ? (u.npc ? '#7dff9d' : '#6db4ff') : '#ff6b6b',
            borderWidth: u.phase2 || threat ? 2.5 : 1.5,
            opacity: u.acted || ghosting ? 0.45 : 1,
          },
        ]}
      >
        <Image cachePolicy="memory" source={MECH_ART[u.def.id]} style={[StyleSheet.absoluteFill, u.side === 'enemy' && { transform: [{ scaleX: -1 }] }]} contentFit="cover" />
        {u.phase2 && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,40,40,0.18)' }]} />}
        {u.alive && !u.phase2 && u.hp <= u.def.maxHp * 0.25 && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,60,40,0.16)', borderWidth: 2, borderColor: 'rgba(255,110,70,0.85)', borderRadius: 8 }]} />}
        {u.side === 'player' && !u.npc && PILOT_ART[u.def.id] && (
          <View style={styles.faceBadge}>
            <Image cachePolicy="memory" source={PILOT_ART[u.def.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
        )}
      </View>
      <View style={[styles.hpBarBg, { width: chip * 0.9 }]}>
        <View style={[styles.hpBar, { width: `${(u.hp / u.def.maxHp) * 100}%`, backgroundColor: u.side === 'player' ? (u.hp / u.def.maxHp > 0.5 ? '#4dff7a' : u.hp / u.def.maxHp > 0.25 ? '#ffd34d' : '#ff8a5a') : (u.hp / u.def.maxHp > 0.5 ? '#ff5a5a' : u.hp / u.def.maxHp > 0.25 ? '#ff9d4d' : '#c92a2a') }]} />
      </View>
      <View style={[styles.enBarBg, { width: chip * 0.9 }]}>
        <View style={{ height: '100%', width: `${(u.en / u.def.maxEn) * 100}%`, backgroundColor: '#6fe0ff', borderRadius: 2 }} />
      </View>
      <View style={[styles.lvTag, { borderColor: u.side === 'player' ? '#6db4ff' : '#ff6b6b' }]}>
        <Text style={styles.lvTxt}>Lv{u.level}</Text>
      </View>
      {u.def.carrier ? <Text style={[styles.bossTag, { color: '#ffe8a0' }]}>💰LOOT</Text> : u.def.boss ? <Text style={[styles.bossTag, u.phase2 && { color: '#ff5050' }]}>{u.phase2 ? 'Ω ACE' : 'ACE'}</Text> : u.elite ? <Text style={[styles.bossTag, { color: '#ffd34d' }]}>★ELITE</Text> : u.npc ? <Text style={[styles.bossTag, { color: '#7dff9d' }]}>🛡ALLY</Text> : u.aceMastery ? <Text style={[styles.bossTag, { color: '#6fe0ff' }]}>★ACE</Text> : null}
      {spiritBadges(u).length > 0 && <Text style={styles.spiritTag}>{spiritBadges(u)}</Text>}
      {(u.statuses?.length ?? 0) > 0 && <Text style={styles.statusTag}>{u.statuses!.map((fx) => (fx.id === 'burn' ? '🔥' : fx.id === 'stun' ? '⚡' : fx.id === 'slow' ? '🕸' : fx.id === 'mark' ? '🎯' : fx.id === 'supp' ? '🔻' : '⬇')).join('')}</Text>}
      {u.will > 100 && (
        <View style={[styles.willTag, u.will >= 130 && { borderColor: '#ffd34d' }]}>
          <Text style={[styles.willTxt, u.will >= 130 && { color: '#ffd34d' }]}>◈{u.will}</Text>
        </View>
      )}
    </Animated.View>
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

/** Pulsing corner-bracket reticle over the selected unit — SRW cursor feel. */
function SelReticle({ tw, th }: { tw: number; th: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 560, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 560, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const op = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const sc = v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.03] });
  const c = 'rgba(255,222,110,0.95)';
  const B = Math.min(tw, th) * 0.16;
  const corners = [
    { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3 },
    { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3 },
    { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3 },
    { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3 },
  ];
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: op, transform: [{ scale: sc }] }]}>
      {corners.map((cst, i) => (
        <View key={i} style={[{ position: 'absolute', width: B, height: B, borderColor: c }, cst]} />
      ))}
    </Animated.View>
  );
}

export function MapGrid() {
  const units = useGame((s) => s.units);
  const inThreat = (u: UnitState) => u.side === 'enemy' && u.alive && units.some((p) => p.side === 'player' && p.alive && dist(u.pos, p.pos) <= moveRangeOf(u) + Math.max(0, ...u.def.weapons.map((w) => w.rangeMax)));
  const map = useGame((s) => s.map);
  const missionCh = useGame((s) => s.missionCh);
  const moveTiles = useGame((s) => s.moveTiles);
  const attackTiles = useGame((s) => s.attackTiles);
  const threatTiles = useGame((s) => s.threatTiles);
  const hazardWarn = useGame((s) => s.hazardWarn);
  const dangerTiles = useGame((s) => s.dangerTiles);
  const crates = useGame((s) => s.crates);
  const selectedUid = useGame((s) => s.selectedUid);
  const pendingMove = useGame((s) => s.pendingMove);
  const pendingWeapon = useGame((s) => s.pendingWeapon);
  const mapAim = useGame((s) => s.mapAim);
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
  // extra pan slack so the bottom board row clears the Android nav bar
  const maxY = Math.max(0, bh - vh) + 34;

  const pan = useRef(new Animated.ValueXY({ x: -maxX / 2, y: -maxY / 2 })).current;
  const last = useRef({ x: -maxX / 2, y: -maxY / 2 });
  // re-center when the board/viewport size changes (rotation, resize)
  useEffect(() => {
    const c = { x: -maxX / 2, y: -maxY / 2 };
    last.current = c;
    pan.setValue(c);
  }, [maxX, maxY, pan]);

  const clamp = (v: number, m: number) => Math.max(-m, Math.min(0, v));
  const [panPos, setPanPos] = useState({ x: -maxX / 2, y: -maxY / 2 });
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
      onPanResponderMove: (_, g) => {
        pan.setValue({ x: clamp(last.current.x + g.dx, maxX), y: clamp(last.current.y + g.dy, maxY) });
      },
      onPanResponderRelease: (_, g) => {
        last.current = { x: clamp(last.current.x + g.dx, maxX), y: clamp(last.current.y + g.dy, maxY) };
        pan.setValue(last.current);
        setPanPos(last.current);
      },
    }),
  ).current;

  const tiles = useMemo(() => {
    const t: Pos[] = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) t.push({ x, y });
    return t;
  }, []);

  const ghost = pendingMove && selectedUid ? units.find((u) => u.uid === selectedUid) : undefined;
  const selected = selectedUid ? units.find((u) => u.uid === selectedUid && u.alive) : undefined;

  // shared shimmer value driving every range overlay — one loop for the board
  const rp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rp, { toValue: 1, duration: 640, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(rp, { toValue: 0, duration: 640, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

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
            hazard={hazardWarn.some((h) => h.x === p.x && h.y === p.y)}
            mine={!!map.mines?.some((m) => m.x === p.x && m.y === p.y)}
            inBlast={!!(mapAim && pendingWeapon?.mapRange != null && dist(p, mapAim) <= pendingWeapon.mapRange)}
            aimed={!!mapAim && same(p, mapAim)}
            inFog={!!missionCh.fog && !fogLit(units, p)}
            onTap={tapTile}
            rp={rp}
          />
        ))}
        {selected && (
          <View pointerEvents="none" style={[styles.unitWrap, { left: selected.pos.x * tw, top: selected.pos.y * th, width: tw, height: th }]}>
            <SelReticle tw={tw} th={th} />
          </View>
        )}
        {units
          .filter((u) => u.alive && !(missionCh.fog && u.side === 'enemy' && !fogLit(units, u.pos)) && !isStealthHidden(u, units))
          .map((u) => {
            const walking = walk && walk.uid === u.uid && walk.path.length > 1;
            if (walking) return <WalkingChip key={u.uid} path={walk!.path} tw={tw} th={th} cell={<UnitCell u={u} chip={chip} ghosting={false} threat={inThreat(u)} />} />;
            return (
              <View key={u.uid} pointerEvents="none" style={[styles.unitWrap, { left: u.pos.x * tw, top: u.pos.y * th, width: tw, height: th }]}>
                <UnitCell u={u} chip={chip} ghosting={!!ghost && u.uid === ghost.uid} threat={inThreat(u)} />
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
      <MiniMap map={map} units={units} missionCh={missionCh} crates={crates} panX={panPos.x} panY={panPos.y} bw={bw} bh={bh} vw={vw} vh={vh} />
    </View>
  );
}

const MINI_TW = 8;
/** Corner overview — terrain tint, unit dots, objective & viewport markers. */
function MiniMap({ map, units, missionCh, crates, panX, panY, bw, bh, vw, vh }: { map: MapDef; units: UnitState[]; missionCh: { seizePos?: Pos; reachPos?: Pos; fog?: boolean }; crates: { pos: Pos; itemId: string }[]; panX: number; panY: number; bw: number; bh: number; vw: number; vh: number }) {
  const mw = map.cols * MINI_TW;
  const mh = map.rows * MINI_TW;
  const rectW = Math.min(mw, (vw / bw) * mw);
  const rectH = Math.min(mh, (vh / bh) * mh);
  const rectX = (-panX / bw) * mw;
  const rectY = (-panY / bh) * mh;
  return (
    <View pointerEvents="none" style={[styles.miniWrap, { width: mw + 8, height: mh + 18 }]}>
      <Text style={styles.miniLbl}>MAP</Text>
      <View style={{ width: mw, height: mh }}>
        {map.terrain.flatMap((row, y) =>
          row.map((t, x) => <View key={`${x},${y}`} style={{ position: 'absolute', left: x * MINI_TW, top: y * MINI_TW, width: MINI_TW, height: MINI_TW, backgroundColor: TERRAIN_INFO[t].color }} />),
        )}
        {(crates ?? []).map((c, i) => (
          <View key={`c${i}`} style={[styles.miniDot, { left: c.pos.x * MINI_TW + 1.5, top: c.pos.y * MINI_TW + 1.5, backgroundColor: '#ffd34d' }]} />
        ))}
        {missionCh.seizePos && <View style={[styles.miniDot, { left: missionCh.seizePos.x * MINI_TW + 1, top: missionCh.seizePos.y * MINI_TW + 1, width: 6, height: 6, backgroundColor: '#ffd34d', borderWidth: 1, borderColor: '#fff' }]} />}
        {missionCh.reachPos && <View style={[styles.miniDot, { left: missionCh.reachPos.x * MINI_TW + 1, top: missionCh.reachPos.y * MINI_TW + 1, width: 6, height: 6, backgroundColor: '#4de3ff', borderWidth: 1, borderColor: '#fff' }]} />}
        {units
          .filter((u) => u.alive && !(missionCh.fog && u.side === 'enemy' && !fogLit(units, u.pos)) && !isStealthHidden(u, units))
          .map((u) => (
            <View
              key={u.uid}
              style={[
                styles.miniDot,
                {
                  left: u.pos.x * MINI_TW + 1.5,
                  top: u.pos.y * MINI_TW + 1.5,
                  backgroundColor: u.side === 'player' ? (u.npc ? '#7dff9d' : '#4db8ff') : '#ff5a5a',
                  width: u.def.boss ? 7 : 5,
                  height: u.def.boss ? 7 : 5,
                  borderWidth: u.def.boss ? 1.5 : 0,
                },
              ]}
            />
          ))}
        <View style={[styles.miniView, { width: rectW, height: rectH, left: Math.max(0, Math.min(mw - rectW, rectX)), top: Math.max(0, Math.min(mh - rectH, rectY)) }]} />
      </View>
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
  blastOv: { backgroundColor: 'rgba(255,150,40,0.34)', borderWidth: 1, borderColor: 'rgba(255,180,70,0.9)', alignItems: 'center', justifyContent: 'center' },
  aimTag: { color: '#ffcf6a', fontSize: 16, fontWeight: '900', textShadowColor: 'rgba(255,160,40,1)', textShadowRadius: 8 },
  fogOv: { backgroundColor: 'rgba(4,7,14,0.58)' },
  threatOv: { backgroundColor: 'rgba(255,150,40,0.26)', borderWidth: 1, borderColor: 'rgba(255,150,40,0.35)' },
  hazardOv: { backgroundColor: 'rgba(255,90,30,0.22)', borderColor: 'rgba(255,140,60,0.9)', borderStyle: 'dashed' },
  dangerOv: { backgroundColor: 'rgba(255,50,50,0.16)' },
  crateTag: { position: 'absolute', top: 3, right: 3, color: '#ffd34d', fontSize: 15, fontWeight: '900', textShadowColor: 'rgba(255,190,40,0.9)', textShadowRadius: 5 },
  mineTag: { position: 'absolute', bottom: 3, right: 3, width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,60,60,0.9)', alignItems: 'center', justifyContent: 'center' },
  mineTagTxt: { color: '#ffe0e0', fontSize: 8, lineHeight: 8, fontWeight: '900' },
  beaconOv: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,210,60,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,220,90,0.7)', alignItems: 'center', justifyContent: 'center' },
  beaconTag: { color: '#ffd34d', fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(255,210,60,0.9)', textShadowRadius: 8 },
  spiritTag: { position: 'absolute', bottom: 3, right: 2, color: '#9fe8ff', fontSize: 8, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3 },
  statusTag: { position: 'absolute', bottom: 3, left: 2, color: '#ffb44d', fontSize: 9, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3 },
  unitWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 8, overflow: 'hidden', borderWidth: 1.5, backgroundColor: '#0a0e1e', shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  faceBadge: { position: 'absolute', bottom: 3, left: 2, width: '34%', aspectRatio: 1, borderRadius: 999, borderWidth: 1, borderColor: '#6db4ff', overflow: 'hidden', backgroundColor: '#0a0e1e' },
  hpBarBg: { position: 'absolute', bottom: 1, height: 5, backgroundColor: 'rgba(6,8,16,0.92)', borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  hpBar: { height: '100%', borderRadius: 2 },
  enBarBg: { position: 'absolute', bottom: -4, height: 3, backgroundColor: 'rgba(6,8,16,0.85)', borderRadius: 2, overflow: 'hidden' },
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
  miniWrap: { position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(5,8,16,0.82)', borderWidth: 1, borderColor: '#2a3a5a', borderRadius: 6, padding: 4, paddingTop: 14 },
  miniLbl: { position: 'absolute', top: 2, left: 6, color: '#7f95c0', fontSize: 7, fontWeight: '800', letterSpacing: 2 },
  miniDot: { position: 'absolute', width: 5, height: 5, borderRadius: 3, borderColor: '#fff' },
  miniView: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)' },
});
