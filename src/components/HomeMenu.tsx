import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART } from '../assets';
import { play } from '../audio';
import { CHAPTERS_COUNT, chapterOf } from '../game/campaign';
import { useGame } from '../game/store';

function MenuItem({ label, sub, accent, onPress, delay }: { label: string; sub?: string; accent: string; onPress: () => void; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const [hot, setHot] = useState(false);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-36, 0] }) }] }}>
      <Pressable
        style={({ pressed }) => [styles.item, hot && { borderColor: accent, backgroundColor: 'rgba(20,26,48,0.85)' }, pressed && { opacity: 0.7, transform: [{ scale: 0.985 }] }]}
        onPress={() => {
          play('ui_confirm');
          onPress();
        }}
        onHoverIn={() => setHot(true)}
        onHoverOut={() => setHot(false)}
      >
        <View style={[styles.itemBar, { backgroundColor: accent }]} />
        <View>
          <Text style={styles.itemTxt}>{label}</Text>
          {!!sub && <Text style={styles.itemSub}>{sub}</Text>}
        </View>
        <Text style={[styles.itemArrow, { color: accent }]}>▸</Text>
      </Pressable>
    </Animated.View>
  );
}

export function HomeMenu() {
  const gotoHq = useGame((s) => s.gotoHq);
  const newCampaign = useGame((s) => s.newCampaign);
  const replayStory = useGame((s) => s.replayStory);
  const hasSave = useGame((s) => s.hasSave);
  const chapter = useGame((s) => s.chapter);
  const ngPlus = useGame((s) => s.ngPlus);
  const nextCh = chapterOf(chapter);
  const { width, height } = useWindowDimensions();

  const titleFs = Math.round(Math.min(30, height * 0.07));
  const xyzFs = Math.round(Math.min(64, height * 0.115));
  const xyzLs = Math.round(Math.min(22, height * 0.05));
  const menuW = Math.round(Math.min(380, width * 0.46));
  const glow = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(glow, { toValue: 1, duration: 1600, useNativeDriver: true }), Animated.timing(glow, { toValue: 0, duration: 1600, useNativeDriver: true })])).start();
    Animated.loop(Animated.sequence([Animated.timing(drift, { toValue: 1, duration: 16000, useNativeDriver: true }), Animated.timing(drift, { toValue: 0, duration: 16000, useNativeDriver: true })])).start();
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.12 }, { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) }] }]}>
        <Image cachePolicy="memory" source={ART.homeBg} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      <LinearGradient colors={['rgba(3,5,14,0.25)', 'rgba(3,5,14,0.55)', 'rgba(3,5,14,0.94)']} style={StyleSheet.absoluteFill} />

      <View style={styles.brand}>
        <Animated.Text style={[styles.brandTitle, { fontSize: titleFs, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }]}>STEEL ARK</Animated.Text>
        <Text style={[styles.brandXyz, { fontSize: xyzFs, letterSpacing: xyzLs }]}>X Y Z</Text>
        <View style={styles.brandRule} />
      </View>

      <View style={[styles.menu, { width: menuW }]}>
        {hasSave ? (
          <>
            <MenuItem label="CONTINUE CAMPAIGN" sub={chapter >= CHAPTERS_COUNT ? 'Campaign complete' : `Chapter ${nextCh.id} — ${nextCh.name}${ngPlus ? ` · NG+ ${ngPlus}` : ''}`} accent="#4dff7a" delay={150} onPress={gotoHq} />
            <MenuItem label="NEW CAMPAIGN" sub="Restart from Chapter 1 (erases save)" accent="#ff8a5c" delay={200} onPress={newCampaign} />
          </>
        ) : (
          <MenuItem label="STORY CAMPAIGN" sub="30 chapters — the Squadron XYZ war begins" accent="#ffd34d" delay={150} onPress={newCampaign} />
        )}
        <MenuItem label="REPLAY STORY" sub="Watch the intro again" accent="#7ee7ff" delay={280} onPress={replayStory} />
        <MenuItem label="SETTINGS" sub="Battle animation · speed · sound · music" accent="#9dffa0" delay={410} onPress={useGame.getState().gotoSettings} />
      </View>

      <Text style={styles.foot}>v26.7.0 · original mecha tactics · not affiliated with Bandai Namco</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#03050e', zIndex: 40 },
  brand: { position: 'absolute', top: '4%', left: 40 },
  brandTitle: { color: '#dbe8ff', fontSize: 30, fontWeight: '900', letterSpacing: 8, fontStyle: 'italic', textShadowColor: '#4d7cff', textShadowRadius: 14 },
  brandXyz: { color: '#ffd34d', fontSize: 64, fontWeight: '900', letterSpacing: 22, fontStyle: 'italic', marginTop: -6, textShadowColor: '#8a5c00', textShadowRadius: 16 },
  brandRule: { height: 2, width: 240, backgroundColor: '#ffd34d', marginTop: 10, opacity: 0.8 },
  menu: { position: 'absolute', left: 40, bottom: 42, gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#3a4160', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(12,16,32,0.72)' },
  itemBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  itemTxt: { color: '#eef2ff', fontWeight: '900', fontSize: 16, letterSpacing: 2.5 },
  itemSub: { color: '#8fa1c7', fontSize: 11, marginTop: 2, letterSpacing: 0.6 },
  itemArrow: { marginLeft: 'auto', fontSize: 18, fontWeight: '900' },
  foot: { position: 'absolute', bottom: 32, alignSelf: 'center', color: '#55618a', fontSize: 10, letterSpacing: 1.5 },
});
