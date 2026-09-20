import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART, PILOT_ART } from '../assets';
import { play } from '../audio';
import { CHAPTERS_COUNT, PLAYER_DEF_IDS, chapterOf, ALL_UNITS } from '../game/campaign';
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
        <Image source={ART.titleKey} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
      </Animated.View>
      <LinearGradient colors={['rgba(3,5,14,0.1)', 'rgba(3,5,14,0.35)', 'rgba(3,5,14,0.9)']} style={StyleSheet.absoluteFill} />

      <View style={styles.titleBlock}>
        <Animated.Text style={[styles.title, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
          SUPER ROBOT WARS
        </Animated.Text>
        <Animated.Text style={[styles.titleXyz, { opacity: rise }]}>X Y Z</Animated.Text>
      </View>

      <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), position: 'absolute', bottom: '12%' }}>
        <Text style={styles.touch}>— TOUCH TO START —</Text>
      </Animated.View>
      <Text style={styles.small}>original mecha tactics · Mission SSS</Text>
    </Pressable>
  );
}

export function BriefingScreen() {
  const startMission = useGame((s) => s.startMission);
  const gotoHq = useGame((s) => s.gotoHq);
  const chapter = useGame((s) => s.chapter);
  const pilotProg = useGame((s) => s.pilotProg);
  const ch = chapterOf(chapter);
  return (
    <View style={styles.center}>
      <Image source={ART.story[4]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.5)', 'rgba(3,5,14,0.95)']} style={StyleSheet.absoluteFill} />

      <Text style={styles.briefTitle}>CHAPTER {ch.id}: {ch.name}</Text>
      <Text style={styles.briefSub}>— {ch.subtitle} —</Text>

      <View style={styles.briefBox}>
        <Text style={styles.briefTxt}>{ch.objective}</Text>
        <View style={styles.squadRow}>
          {PLAYER_DEF_IDS.map((id) => {
            const d = ALL_UNITS[id];
            const prog = pilotProg[id];
            return (
              <View key={id} style={styles.squadCard}>
                <Image source={PILOT_ART[id]} style={styles.squadFace} contentFit="cover" />
                <Text style={styles.squadName}>{d.pilot.callsign} · Lv{prog?.level ?? 1}</Text>
                <Text style={styles.squadUnit} numberOfLines={1}>{d.name}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.briefTxtSmall}>
          Tap a unit for move range · tap again for actions · red tiles are targets{'\n'}Terrain gives DEF/EVA bonuses · weapons marked [No P] can't fire after moving · ITEMS consume the unit's turn
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
  const campaignDone = victory && chapter >= CHAPTERS_COUNT;
  return (
    <View style={styles.center}>
      <Image source={victory ? ART.titleKey : ART.story[1]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.55)', 'rgba(3,5,14,0.94)']} style={StyleSheet.absoluteFill} />
      <Text style={[styles.title, { color: victory ? '#ffd34d' : '#ff5a5a', fontSize: 40 }]}>{campaignDone ? 'CAMPAIGN COMPLETE' : victory ? 'MISSION COMPLETE' : 'MISSION FAILED'}</Text>
      <Text style={styles.briefSub}>
        {campaignDone ? 'The Steel Throne has fallen — the skies are free. (All 30 chapters cleared!)' : victory ? `Cleared in ${turn} turns` : 'Your squad was wiped out'}
      </Text>
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
  center: { ...StyleSheet.absoluteFill, backgroundColor: '#05070f', alignItems: 'center', justifyContent: 'center', zIndex: 40, overflow: 'hidden' },
  titleBlock: { position: 'absolute', top: '9%', alignItems: 'center' },
  title: { color: '#dbe8ff', fontSize: 32, fontWeight: '900', letterSpacing: 8, fontStyle: 'italic', textShadowColor: '#4d7cff', textShadowRadius: 16 },
  titleXyz: { color: '#ffd34d', fontSize: 58, fontWeight: '900', letterSpacing: 20, fontStyle: 'italic', marginTop: -4, textShadowColor: '#8a5c00', textShadowRadius: 18 },
  touch: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 6 },
  small: { color: '#8fa1c7', position: 'absolute', bottom: 14, fontSize: 11, letterSpacing: 1.5 },
  bigBtn: { borderWidth: 2, borderColor: '#ffd34d', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 34, backgroundColor: 'rgba(26,20,48,0.9)', marginTop: 14 },
  bigBtnTxt: { color: '#ffd34d', fontWeight: '900', fontSize: 16, letterSpacing: 3 },
  briefTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 4, textShadowColor: '#000', textShadowRadius: 8 },
  briefSub: { color: '#7ee7ff', fontSize: 15, fontWeight: '700', marginTop: 4, letterSpacing: 2 },
  briefBox: { backgroundColor: 'rgba(14,17,28,0.88)', borderWidth: 1, borderColor: '#2a2f42', borderRadius: 12, padding: 18, margin: 18, maxWidth: 560 },
  briefTxt: { color: '#e6ecff', fontSize: 13, lineHeight: 20 },
  briefTxtSmall: { color: '#8fa1c7', fontSize: 11, lineHeight: 18, marginTop: 10 },
  squadRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  squadCard: { alignItems: 'center', width: 76 },
  squadFace: { width: 64, height: 64, borderRadius: 10, borderWidth: 1, borderColor: '#3a4160' },
  squadName: { color: '#ffd34d', fontSize: 11, fontWeight: '800', marginTop: 4 },
  squadUnit: { color: '#9fb0d0', fontSize: 9, marginTop: 1 },
});
