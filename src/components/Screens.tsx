import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART, PILOT_ART } from '../assets';
import { play } from '../audio';
import { CHAPTERS_COUNT, ChapterDef, chapterOf, missionOf, rosterFor, ALL_UNITS, ROUTE_INFO, genMap, HONORS, honorDone } from '../game/campaign';
import { TERRAIN_INFO, TRAITS } from '../game/data';
import { useGame } from '../game/store';
import { BOND_EVENTS, bondLevel } from '../game/bonds';

export function TitleScreen() {
  const start = useGame((s) => s.start);
  const pulse = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true })])).start();
    Animated.timing(rise, { toValue: 1, duration: 1400, useNativeDriver: true }).start();
    play('ui_confirm');
  }, []);
  return (
    <Pressable
      style={styles.center}
      onPress={() => {
        play('ui_confirm');
        start();
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: rise, transform: [{ scale: rise.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1] }) }] }]}>
        <Image cachePolicy="memory" source={ART.titleKey} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
      </Animated.View>
      <LinearGradient colors={['rgba(3,5,14,0.1)', 'rgba(3,5,14,0.35)', 'rgba(3,5,14,0.9)']} style={StyleSheet.absoluteFill} />

      <View style={styles.titleBlock}>
        <Animated.Text style={[styles.title, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
          STEEL ARK
        </Animated.Text>
        <Animated.Text style={[styles.titleXyz, { opacity: rise }]}>X Y Z</Animated.Text>
      </View>

      <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), position: 'absolute', bottom: '12%' }}>
        <Text style={styles.touch}>— TOUCH TO START —</Text>
      </Animated.View>
      <Text style={styles.small}>original mecha tactics · Squadron XYZ</Text>
    </Pressable>
  );
}

/** Tiny tactical map preview in the briefing — terrain, spawns, objective markers. genMap is seeded per chapter so this matches the real field. */
function BriefingMap({ ch }: { ch: ChapterDef }) {
  const map = useMemo(() => genMap(ch), [ch]);
  const CW = 8;
  const dot = (x: number, y: number, color: string, i: number | string) => (
    <View key={`d${i}`} style={{ position: 'absolute', left: x * CW - 1, top: y * CW - 1, width: CW + 2, height: CW + 2, borderRadius: 99, backgroundColor: color, borderWidth: 1, borderColor: '#fff' }} />
  );
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: map.cols * CW, height: map.rows * CW, borderWidth: 1, borderColor: '#2a3a5a', borderRadius: 4, overflow: 'hidden' }}>
        {map.terrain.map((row, y) => (
          <View key={y} style={{ flexDirection: 'row' }}>
            {row.map((t, x) => (
              <View key={x} style={{ width: CW, height: CW, backgroundColor: TERRAIN_INFO[t].color }} />
            ))}
          </View>
        ))}
        {map.playerSpawns.map((s, i) => dot(s.pos.x, s.pos.y, '#4d9dff', `p${i}`))}
        {(map.allySpawns ?? []).map((s, i) => dot(s.pos.x, s.pos.y, '#7dff9d', `a${i}`))}
        {map.enemySpawns.map((s, i) => dot(s.pos.x, s.pos.y, ALL_UNITS[s.defId]?.boss ? '#ffd34d' : s.elite ? '#ffb84d' : '#ff5a5a', `e${i}`))}
        {(map.crates ?? []).map((s, i) => dot(s.pos.x, s.pos.y, '#ffe14d', `c${i}`))}
        {map.beaconPos && dot(map.beaconPos.x, map.beaconPos.y, '#ffd34d', 'b')}
        {map.reachPos && dot(map.reachPos.x, map.reachPos.y, '#6fe0ff', 'r')}
      </View>
      <Text style={{ color: '#7f95c0', fontSize: 7.5, fontWeight: '800', letterSpacing: 1.5, marginTop: 3 }}>FIELD MAP · blue=you red=hostile</Text>
      <Text style={{ color: '#ff9d8a', fontSize: 8.5, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 }}>
        {`⌖ HOSTILES ${map.enemySpawns.length}${map.enemySpawns.some((s) => s.elite) ? ` · ★${map.enemySpawns.filter((s) => s.elite).length} ELITE` : ''}${map.enemySpawns.some((s) => ALL_UNITS[s.defId]?.boss) ? ' · Ω BOSS' : ''}${map.reinforce ? ` · ⧗ T${map.reinforce.turn} WAVE` : ''} · ⏱ PAR ≤${ch.surviveTurns ?? Math.max(6, Math.ceil(((ch.count ?? map.enemySpawns.length) + (ch.boss ? 1 : 0)) * 1.1))}`}
      </Text>
    </View>
  );
}

export function BriefingScreen() {
  const startMission = useGame((s) => s.startMission);
  const gotoHq = useGame((s) => s.gotoHq);
  const chapter = useGame((s) => s.chapter);
  const pilotProg = useGame((s) => s.pilotProg);
  const deploySel = useGame((s) => s.deploySel);
  const woundedPilots = useGame((s) => s.wounded);
  const toggleDeploy = useGame((s) => s.toggleDeploy);
  const hard = useGame((s) => (s.settings.difficulty ?? 'normal') === 'hard');
  const route = useGame((s) => s.route);
  const ch = missionOf(chapter, route);
  const roster = rosterFor(ch);
  return (
    <View style={styles.center}>
      <Image cachePolicy="memory" source={ART.story[4]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.5)', 'rgba(3,5,14,0.95)']} style={StyleSheet.absoluteFill} />

      <Text style={styles.briefTitle}>CHAPTER {ch.id}: {ch.name}{useGame.getState().ngPlus > 0 ? ` · NG+ ${useGame.getState().ngPlus}` : ''}</Text>
      <Text style={styles.briefSub}>— {ch.subtitle} —</Text>
      {ch.routeTag && <Text style={{ color: '#9fd8ff', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 2 }}>{ch.routeTag}</Text>}

      <View style={styles.briefBox}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: '#ffd34d', paddingLeft: 10 }}>
            <Text style={{ color: '#ffd34d', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 3 }}>MISSION OBJECTIVE</Text>
            <Text style={styles.briefTxt}>{ch.objective}</Text>
            {ch.mastery && (
              <Text style={{ color: '#ffd34d', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 }}>
                ★ MASTERY: {ch.mastery.desc} — +{ch.mastery.rewardCr}cr{useGame.getState().masteryDone.includes(ch.id) ? ' ✓ DONE' : ''}
              </Text>
            )}
            {hard && <Text style={{ color: '#ff8a5c', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 }}>▲ HARD MODE — enemies +15% · mission rewards +25%</Text>}
            {ch.fog && <Text style={{ color: '#b6a8ff', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 }}>◈ FOG OF WAR — hostiles hidden beyond 4 tiles</Text>}
            {ch.requiredDefId && (
              <Text style={{ color: '#ff5a4a', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 }}>
                ⚠ {ALL_UNITS[ch.requiredDefId]?.name.toUpperCase()} MUST SURVIVE — losing it ends the mission
              </Text>
            )}
          </View>
          <BriefingMap ch={ch} />
        </View>
        <Text style={{ color: '#ff9d9d', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 }}>
          {(() => {
            const sp = genMap(ch).enemySpawns;
            const by: Record<string, number> = {};
            for (const e of sp) by[e.defId] = (by[e.defId] ?? 0) + 1;
            const names = Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([id, n]) => `${ALL_UNITS[id]?.name ?? id} ×${n}`);
            return `⚠ HOSTILES ${sp.length} — ${names.join(' · ')}${ch.turnLimit ? ` · ⏱ LIMIT ${ch.turnLimit}` : ''}`;
          })()}
        </Text>
        <Text style={{ color: '#9fe8a9', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 3 }}>
          {`▸ ALLIES ${roster.length} · ΣLV ${roster.reduce((n, id) => n + (pilotProg[id]?.level ?? ALL_UNITS[id]?.level ?? 1), 0)} — ${roster.map((id) => ALL_UNITS[id]?.name ?? id).join(' · ')}`}
        </Text>
        <Text style={styles.deployLbl}>DEPLOY SQUAD — tap to toggle ({deploySel.length}/{roster.length}) · ΣPWR {deploySel.reduce((n, id2) => n + Math.max(0, ...(ALL_UNITS[id2]?.weapons ?? []).map((w) => w.power)), 0)}</Text>
        <View style={styles.squadRow}>
          {roster.map((id) => {
            const d = ALL_UNITS[id];
            const prog = pilotProg[id];
            const on = deploySel.includes(id);
            return (
              <Pressable key={id} style={({ pressed }) => [styles.squadCard, !on && { opacity: 0.35 }, on && { borderColor: '#4dff7a', shadowColor: '#4dff7a', shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 }, pressed && { opacity: 0.6, transform: [{ scale: 0.94 }] }]} onPress={() => toggleDeploy(id)}>
                <Image cachePolicy="memory" source={PILOT_ART[id]} style={[styles.squadFace, on && { borderColor: '#4dff7a', borderWidth: 2 }]} contentFit="cover" />
                <Text style={[styles.squadName, !on && { color: '#667' }]}>{d.pilot.callsign} · Lv{prog?.level ?? d.level ?? 1}</Text>
                <Text style={styles.squadUnit} numberOfLines={1}>{d.name}</Text>
                <Text style={{ color: '#6b7694', fontSize: 8 }} numberOfLines={1}>MOV {d.moveRange} {d.moveType === 'air' ? '✈' : '⬢'} · ✦{d.pilot.maxSp} SP · ARMX{d.weapons.length} · ⚡{Math.max(0, ...d.weapons.map((w) => w.power))} · RNG {Math.min(...d.weapons.map((w) => w.rangeMin))}-{Math.max(...d.weapons.map((w) => w.rangeMax))}</Text>
                {d.pilot.trait && <Text style={{ color: d.pilot.faceColor ?? '#9fd0ff', fontSize: 8, fontWeight: '700', letterSpacing: 0.5 }} numberOfLines={1}>◆ {TRAITS[d.pilot.trait].name}</Text>}
                <Text style={{ color: '#ffd34d', fontSize: 8, fontWeight: '700' }}>{prog?.kills ?? 0} career kills</Text>
                {(prog?.pp ?? 0) > 0 && <Text style={{ color: '#c9a0ff', fontSize: 8, fontWeight: '700' }}>⬆ {prog.pp} PP unspent</Text>}
                {(prog?.kills ?? 0) > 0 && <Text style={{ color: '#ffb347', fontSize: 8, fontWeight: '700' }}>☠ {prog.kills} KILLS</Text>}
                {(() => { const nb = BOND_EVENTS.filter((ev) => ev.a === id || ev.b === id).map((ev) => (ev.a === id ? ev.b : ev.a)).filter((pid) => bondLevel(useGame.getState().bonds, id, pid) > 0 && deploySel.includes(pid)).length; return nb > 0 ? <Text style={{ color: '#8af0ff', fontSize: 8, fontWeight: '700' }}>⚭ {nb} BONDED</Text> : null; })()}
                {(useGame.getState().parts[id]?.length ?? 0) > 0 && <Text style={{ color: '#8af0ff', fontSize: 8, fontWeight: '700' }}>◈{useGame.getState().parts[id].length} PARTS</Text>}
                <Text style={{ color: '#c9a0ff', fontSize: 8, fontWeight: '700' }}>✦ {d.pilot.spirits.length} SPIRITS</Text>
                {woundedPilots.includes(id) && <Text style={{ color: '#ff9d9d', fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>🩹 WOUNDED</Text>}
                <Text style={styles.deployMark}>{on ? '▣ IN' : '▢ OUT'}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.briefTxtSmall}>
          Tap a unit for move range · tap again for actions · red tiles are targets{'\n'}Tap an enemy for intel + its threat range · base/city tiles heal each turn · ITEMS consume the unit's turn
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Pressable
          style={({ pressed }) => [styles.bigBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
          onPress={() => {
            play('ui_confirm');
            startMission();
          }}
        >
          <Text style={styles.bigBtnTxt}>DEPLOY ▸</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.bigBtn, { borderColor: '#3a4160' }, pressed && { opacity: 0.7 }]} onPress={gotoHq}>
          <Text style={[styles.bigBtnTxt, { color: '#9fd0ff' }]}>◂ HQ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const WIN_QUIPS: Record<string, string> = {
  'X-1': 'Ray: "Sky\'s clear. Next fight."',
  'X-2': 'Mira: "Targets down. Clean sweep."',
  'Y-1': 'Gara: "Siege complete. Nothing left standing."',
  'Z-1': 'Orin: "Everyone came home. That\'s a win."',
  RED: 'Rax: "HAH! Who\'s next? Line \'em up!"',
  FALCON: 'Vee: "Fast, sharp, done. As planned."',
};

const RANK_COLOR: Record<string, string> = { S: '#ffd34d', A: '#6fe0ff', B: '#b8c4dc', C: '#8a8fa8' };

export function EndScreen({ victory }: { victory: boolean }) {
  const gotoHq = useGame((s) => s.gotoHq);
  const gotoCredits = useGame((s) => s.gotoCredits);
  const gotoBriefing = useGame((s) => s.gotoBriefing);
  const turn = useGame((s) => s.turn);
  const chapter = useGame((s) => s.chapter);
  const kills = useGame((s) => s.kills);
  const lastReward = useGame((s) => s.lastReward);
  const lastSalvage = useGame((s) => s.lastSalvage);
  const lastLoot = useGame((s) => s.lastLoot);
  const lastMastery = useGame((s) => s.lastMastery);
  const lastRank = useGame((s) => s.lastRank);
  const ngPlus = useGame((s) => s.ngPlus);
  const units = useGame((s) => s.units);
  const missionCh = useGame((s) => s.missionCh);
  const simWave = useGame((s) => s.simWave);
  const simBest = useGame((s) => s.simBest);
  const finishSim = useGame((s) => s.finishSim);
  const sim = !!missionCh.sim && !victory;
  const simScore = kills * 50 + (simWave - 1) * 150;
  React.useEffect(() => {
    if (sim) finishSim();
  }, [sim]);
  // after the final chapter the save wraps to ch.0 — ngPlus>0 + chapter===0 means we just rolled NG+
  const justUnlockedNg = victory && ngPlus > 0 && chapter === 0;
  const aces = units.filter((u) => u.side === 'player' && u.kills >= 5).sort((a, b) => b.kills - a.kills);
  const mvp = units.filter((u) => u.side === 'player' && !u.npc).sort((a, b) => (b.dmgDealt ?? 0) - (a.dmgDealt ?? 0))[0];
  return (
    <View style={styles.center}>
      <Image cachePolicy="memory" source={victory ? ART.titleKey : ART.story[1]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.55)', 'rgba(3,5,14,0.94)']} style={StyleSheet.absoluteFill} />
      <Text style={[styles.title, { color: victory ? '#ffd34d' : sim ? '#c8a8ff' : '#ff5a5a', fontSize: 40 }]}>{justUnlockedNg ? 'CAMPAIGN COMPLETE' : victory ? 'MISSION COMPLETE' : sim ? 'SIMULATION OVER' : 'MISSION FAILED'}</Text>
      <Text style={styles.briefSub}>
        {justUnlockedNg ? 'The Steel Throne has fallen — the skies are free.' : victory ? `Cleared in ${turn} turns` : sim ? `The squad held through ${simWave} wave${simWave === 1 ? '' : 's'}` : 'Your squad was wiped out'}
      </Text>
      {sim && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultsRow}>WAVES CLEARED  {simWave - 1}</Text>
          <Text style={styles.resultsRow}>UNITS DESTROYED  {kills}</Text>
          <Text style={styles.resultsRow}>SCORE  {simScore} PTS</Text>
          <Text style={styles.resultsRow}>CREDITS EARNED  +{Math.round(simScore / 4)}</Text>
          <Text style={[styles.resultsAce, { color: '#c8a8ff' }]}>{simScore > 0 && simScore >= simBest ? '★ NEW RECORD' : `BEST ${simBest} PTS`}</Text>
          {mvp && (mvp.dmgDealt ?? 0) > 0 && (
            <Text style={[styles.resultsAce, { color: '#ffd34d' }]}>
              ♛ MVP — {mvp.def.pilot.name} · {mvp.dmgDealt} dmg · {mvp.kills ?? 0} kills
            </Text>
          )}
        </View>
      )}
      {victory && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultsRow}>TURNS  {turn}</Text>
          <Text style={styles.resultsRow}>ENEMY UNITS DESTROYED  {kills}</Text>
          <Text style={styles.resultsRow}>CREDITS EARNED  +{lastReward}</Text>
          {lastSalvage > 0 && <Text style={styles.resultsRow}>SECTOR INCOME  +{lastSalvage}</Text>}
          {lastLoot.length > 0 && <Text style={styles.resultsRow}>LOOT  {lastLoot.join(' · ')}</Text>}
          {lastRank && (
            <View style={styles.rankRow}>
              <Text style={styles.rankLbl}>BATTLE RANK</Text>
              <View style={[styles.rankBadge, { borderColor: RANK_COLOR[lastRank], shadowColor: RANK_COLOR[lastRank] }]}>
                <Text style={[styles.rankLetter, { color: RANK_COLOR[lastRank] }]}>{lastRank}</Text>
              </View>
              <Text style={styles.rankHint}>{lastRank === 'S' ? 'FLAWLESS' : lastRank === 'A' ? 'EXCELLENT' : lastRank === 'B' ? 'CLEARED' : 'GRINDING'}</Text>
            </View>
          )}
          {lastMastery && <Text style={styles.resultsMastery}>★ MASTERY — {lastMastery}</Text>}
          {!useGame.getState().lostAlly && <Text style={[styles.resultsAce, { color: '#8af0ff' }]}>◆ FLAWLESS — no frames lost</Text>}
          {aces.slice(0, 3).map((u) => (
            <Text key={u.uid} style={styles.resultsAce}>
              ★ {u.def.pilot.name} — {u.kills} kills this mission
            </Text>
          ))}
          {mvp && (mvp.dmgDealt ?? 0) > 0 && (
            <Text style={[styles.resultsAce, { color: '#ffd34d' }]}>
              ♛ MVP — {mvp.def.pilot.name} · {mvp.dmgDealt} dmg · {mvp.kills ?? 0} kills
            </Text>
          )}
          {(() => {
            const st = useGame.getState();
            const ready = HONORS.filter((h) => honorDone(h, st) && !st.honorsClaimed.includes(h.id));
            return ready.length > 0 ? <Text style={[styles.resultsAce, { color: '#ffd34d' }]}>🏅 {ready.slice(0, 3).map((h) => h.name).join(' · ')}{ready.length > 3 ? ` +${ready.length - 3}` : ''} READY — claim in HQ</Text> : null;
          })()}
          {mvp && WIN_QUIPS[mvp.def.pilot.callsign] && (
            <Text style={[styles.resultsAce, { color: '#9fd0ff', fontStyle: 'italic' }]}>{WIN_QUIPS[mvp.def.pilot.callsign]}</Text>
          )}
          {justUnlockedNg && <Text style={styles.resultsNg}>NEW GAME+ {ngPlus} — restart at Ch.1, keep everything, enemies +{Math.round(18 * ngPlus)}% HP</Text>}
        </View>
      )}
      {justUnlockedNg && (
        <Pressable
          style={({ pressed }) => [styles.bigBtn, { borderColor: '#c9a0ff', marginBottom: 12 }, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
          onPress={() => {
            play('ui_confirm');
            gotoCredits();
          }}
        >
          <Text style={[styles.bigBtnTxt, { color: '#c9a0ff' }]}>ROLL CREDITS ★</Text>
        </Pressable>
      )}
      <Pressable
        style={({ pressed }) => [styles.bigBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
        onPress={() => {
          play('ui_confirm');
          if (victory || sim) gotoHq();
          else gotoBriefing();
        }}
      >
        <Text style={styles.bigBtnTxt}>{victory || sim ? 'RETURN TO HQ ▸' : 'RETRY ▸'}</Text>
      </Pressable>
    </View>
  );
}

/** Route split — shown once after ch.15; the choice reshapes chapters 16-18. */
export function RouteScreen() {
  const chooseRoute = useGame((s) => s.chooseRoute);
  return (
    <View style={styles.center}>
      <Image cachePolicy="memory" source={ART.story[3]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.5)', 'rgba(3,5,14,0.94)']} style={StyleSheet.absoluteFill} />
      <Text style={styles.briefTitle}>TWO PATHS TO THE THRONE</Text>
      <Text style={styles.briefSub}>— the Void Empress has fallen; the approach to the Steel Throne forks —</Text>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 14 }}>
        {(['a', 'b'] as const).map((r) => (
          <Pressable
            key={r}
            style={({ pressed }) => [styles.routeCard, { borderColor: r === 'a' ? '#ff9d5c' : '#9fd8ff' }, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            onPress={() => {
              play('ui_confirm');
              chooseRoute(r);
            }}
          >
            <Text style={[styles.routeName, { color: r === 'a' ? '#ffb37e' : '#a5e1ff' }]}>{ROUTE_INFO[r].name}</Text>
            <Text style={styles.routeTag}>{ROUTE_INFO[r].tagline}</Text>
            <Text style={styles.routeDesc}>{ROUTE_INFO[r].desc}</Text>
            <Text style={[styles.bigBtnTxt, { fontSize: 13, marginTop: 10 }]}>TAKE THIS PATH ▸</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: '#667', fontSize: 10, marginTop: 12, letterSpacing: 1 }}>The choice is permanent for this campaign cycle — it reshapes Chapters 16–18.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, backgroundColor: '#05070f', alignItems: 'center', justifyContent: 'center', zIndex: 40, overflow: 'hidden', paddingBottom: 30 },
  titleBlock: { position: 'absolute', top: '9%', alignItems: 'center' },
  title: { color: '#dbe8ff', fontSize: 32, fontWeight: '900', letterSpacing: 8, fontStyle: 'italic', textShadowColor: '#4d7cff', textShadowRadius: 16 },
  titleXyz: { color: '#ffd34d', fontSize: 58, fontWeight: '900', letterSpacing: 20, fontStyle: 'italic', marginTop: -4, textShadowColor: '#8a5c00', textShadowRadius: 18 },
  touch: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 6 },
  small: { color: '#8fa1c7', position: 'absolute', bottom: 30, fontSize: 11, letterSpacing: 1.5 },
  bigBtn: { borderWidth: 2, borderColor: '#ffd34d', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 38, backgroundColor: 'rgba(30,24,56,0.92)', marginTop: 8, shadowColor: '#ffd34d', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  bigBtnTxt: { color: '#ffd34d', fontWeight: '900', fontSize: 16, letterSpacing: 3 },
  briefTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 3, textShadowColor: '#000', textShadowRadius: 8 },
  briefSub: { color: '#7ee7ff', fontSize: 14, fontWeight: '700', marginTop: 2, letterSpacing: 2 },
  briefBox: { backgroundColor: 'rgba(14,17,28,0.9)', borderWidth: 1.5, borderColor: '#3d4a72', borderRadius: 14, padding: 14, margin: 8, maxWidth: 560, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  briefTxt: { color: '#e6ecff', fontSize: 13, lineHeight: 20 },
    briefTxtSmall: { color: '#8fa1c7', fontSize: 10.5, lineHeight: 16, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#3a6a8a', paddingLeft: 8 },
  squadRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  deployLbl: { color: '#9fd0ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  deployMark: { color: '#4dff7a', fontSize: 8.5, fontWeight: '800', marginTop: 2 },
  squadCard: { alignItems: 'center', width: 78, backgroundColor: 'rgba(22,27,44,0.6)', borderRadius: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#2c3350' },
  squadFace: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: '#3a4160' },
  squadName: { color: '#ffd34d', fontSize: 11, fontWeight: '800', marginTop: 4 },
  squadUnit: { color: '#9fb0d0', fontSize: 9, marginTop: 1 },
  resultsBox: { backgroundColor: 'rgba(14,17,28,0.92)', borderWidth: 1.5, borderColor: '#ffd34d', borderRadius: 14, padding: 16, marginTop: 12, minWidth: 340, shadowColor: '#ffd34d', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
  resultsRow: { color: '#e6ecff', fontSize: 12.5, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  rankLbl: { color: '#9fb0d0', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  rankBadge: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,10,22,0.85)', shadowOpacity: 0.9, shadowRadius: 12, elevation: 6 },
  rankLetter: { fontSize: 30, fontWeight: '900', fontStyle: 'italic' },
  rankHint: { color: '#7f95c0', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  resultsMastery: { color: '#ffd34d', fontSize: 13, fontWeight: '800', letterSpacing: 1.5, marginTop: 8, textAlign: 'center' },
  resultsAce: { color: '#ff9dbb', fontSize: 11, fontWeight: '700', marginTop: 4 },
  resultsNg: { color: '#ffd34d', fontSize: 12, fontWeight: '900', marginTop: 8, letterSpacing: 1 },
  routeCard: { width: 300, backgroundColor: 'rgba(14,17,28,0.9)', borderWidth: 2, borderRadius: 14, padding: 14, alignItems: 'center' },
  routeName: { fontSize: 14, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  routeTag: { color: '#8fa1c7', fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  routeDesc: { color: '#c9d4f0', fontSize: 11.5, lineHeight: 17, marginTop: 8, textAlign: 'center' },
});
