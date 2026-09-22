import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART, PILOT_ART } from '../assets';
import { play } from '../audio';
import { CHAPTERS_COUNT, chapterOf, rosterFor, ALL_UNITS } from '../game/campaign';
import { useGame } from '../game/store';

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

export function BriefingScreen() {
  const startMission = useGame((s) => s.startMission);
  const gotoHq = useGame((s) => s.gotoHq);
  const chapter = useGame((s) => s.chapter);
  const pilotProg = useGame((s) => s.pilotProg);
  const deploySel = useGame((s) => s.deploySel);
  const toggleDeploy = useGame((s) => s.toggleDeploy);
  const ch = chapterOf(chapter);
  const roster = rosterFor(ch);
  return (
    <View style={styles.center}>
      <Image cachePolicy="memory" source={ART.story[4]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.5)', 'rgba(3,5,14,0.95)']} style={StyleSheet.absoluteFill} />

      <Text style={styles.briefTitle}>CHAPTER {ch.id}: {ch.name}{useGame.getState().ngPlus > 0 ? ` · NG+ ${useGame.getState().ngPlus}` : ''}</Text>
      <Text style={styles.briefSub}>— {ch.subtitle} —</Text>

      <View style={styles.briefBox}>
        <Text style={styles.briefTxt}>{ch.objective}</Text>
        <Text style={styles.deployLbl}>DEPLOY SQUAD — tap to toggle ({deploySel.length}/{roster.length})</Text>
        <View style={styles.squadRow}>
          {roster.map((id) => {
            const d = ALL_UNITS[id];
            const prog = pilotProg[id];
            const on = deploySel.includes(id);
            return (
              <Pressable key={id} style={[styles.squadCard, !on && { opacity: 0.35 }]} onPress={() => toggleDeploy(id)}>
                <Image cachePolicy="memory" source={PILOT_ART[id]} style={[styles.squadFace, on && { borderColor: '#4dff7a', borderWidth: 2 }]} contentFit="cover" />
                <Text style={[styles.squadName, !on && { color: '#667' }]}>{d.pilot.callsign} · Lv{prog?.level ?? d.level ?? 1}</Text>
                <Text style={styles.squadUnit} numberOfLines={1}>{d.name}</Text>
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
        <TouchableOpacity
          style={styles.bigBtn}
          onPress={() => {
            play('ui_confirm');
            startMission();
          }}
        >
          <Text style={styles.bigBtnTxt}>DEPLOY ▸</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bigBtn, { borderColor: '#3a4160' }]} onPress={gotoHq}>
          <Text style={[styles.bigBtnTxt, { color: '#9fd0ff' }]}>◂ HQ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function EndScreen({ victory }: { victory: boolean }) {
  const gotoHq = useGame((s) => s.gotoHq);
  const gotoBriefing = useGame((s) => s.gotoBriefing);
  const turn = useGame((s) => s.turn);
  const chapter = useGame((s) => s.chapter);
  const kills = useGame((s) => s.kills);
  const lastReward = useGame((s) => s.lastReward);
  const ngPlus = useGame((s) => s.ngPlus);
  const units = useGame((s) => s.units);
  // after the final chapter the save wraps to ch.0 — ngPlus>0 + chapter===0 means we just rolled NG+
  const justUnlockedNg = victory && ngPlus > 0 && chapter === 0;
  const aces = units.filter((u) => u.side === 'player' && u.kills >= 5).sort((a, b) => b.kills - a.kills);
  return (
    <View style={styles.center}>
      <Image cachePolicy="memory" source={victory ? ART.titleKey : ART.story[1]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.55)', 'rgba(3,5,14,0.94)']} style={StyleSheet.absoluteFill} />
      <Text style={[styles.title, { color: victory ? '#ffd34d' : '#ff5a5a', fontSize: 40 }]}>{justUnlockedNg ? 'CAMPAIGN COMPLETE' : victory ? 'MISSION COMPLETE' : 'MISSION FAILED'}</Text>
      <Text style={styles.briefSub}>
        {justUnlockedNg ? 'The Steel Throne has fallen — the skies are free.' : victory ? `Cleared in ${turn} turns` : 'Your squad was wiped out'}
      </Text>
      {victory && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultsRow}>TURNS  {turn}</Text>
          <Text style={styles.resultsRow}>ENEMY UNITS DESTROYED  {kills}</Text>
          <Text style={styles.resultsRow}>CREDITS EARNED  +{lastReward}</Text>
          {aces.slice(0, 3).map((u) => (
            <Text key={u.uid} style={styles.resultsAce}>
              ★ {u.def.pilot.name} — {u.kills} kills this mission
            </Text>
          ))}
          {justUnlockedNg && <Text style={styles.resultsNg}>NEW GAME+ {ngPlus} — restart at Ch.1, keep everything, enemies +{Math.round(18 * ngPlus)}% HP</Text>}
        </View>
      )}
      <TouchableOpacity
        style={styles.bigBtn}
        onPress={() => {
          play('ui_confirm');
          if (victory) gotoHq();
          else gotoBriefing();
        }}
      >
        <Text style={styles.bigBtnTxt}>{victory ? 'RETURN TO HQ ▸' : 'RETRY ▸'}</Text>
      </TouchableOpacity>
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
  bigBtn: { borderWidth: 2, borderColor: '#ffd34d', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 34, backgroundColor: 'rgba(26,20,48,0.9)', marginTop: 8 },
  bigBtnTxt: { color: '#ffd34d', fontWeight: '900', fontSize: 16, letterSpacing: 3 },
  briefTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 3, textShadowColor: '#000', textShadowRadius: 8 },
  briefSub: { color: '#7ee7ff', fontSize: 14, fontWeight: '700', marginTop: 2, letterSpacing: 2 },
  briefBox: { backgroundColor: 'rgba(14,17,28,0.88)', borderWidth: 1, borderColor: '#2a2f42', borderRadius: 12, padding: 12, margin: 8, maxWidth: 560 },
  briefTxt: { color: '#e6ecff', fontSize: 13, lineHeight: 20 },
  briefTxtSmall: { color: '#8fa1c7', fontSize: 10.5, lineHeight: 16, marginTop: 6 },
  squadRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  deployLbl: { color: '#9fd0ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  deployMark: { color: '#4dff7a', fontSize: 8.5, fontWeight: '800', marginTop: 2 },
  squadCard: { alignItems: 'center', width: 76 },
  squadFace: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: '#3a4160' },
  squadName: { color: '#ffd34d', fontSize: 11, fontWeight: '800', marginTop: 4 },
  squadUnit: { color: '#9fb0d0', fontSize: 9, marginTop: 1 },
  resultsBox: { backgroundColor: 'rgba(14,17,28,0.88)', borderWidth: 1, borderColor: '#ffd34d', borderRadius: 12, padding: 12, marginTop: 12, minWidth: 340 },
  resultsRow: { color: '#e6ecff', fontSize: 12.5, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 },
  resultsAce: { color: '#ff9dbb', fontSize: 11, fontWeight: '700', marginTop: 4 },
  resultsNg: { color: '#ffd34d', fontSize: 12, fontWeight: '900', marginTop: 8, letterSpacing: 1 },
});
