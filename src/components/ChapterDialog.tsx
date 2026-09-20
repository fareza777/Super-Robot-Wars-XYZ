import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART, DIALOGUE, PILOT_ART } from '../assets';
import { play } from '../audio';
import { UNITS } from '../game/data';
import { useGame } from '../game/store';

/** Chapter 1 pre-mission dialogue — VN-style exchange over the battlefield. */
export function ChapterDialog() {
  const finish = useGame((s) => s.finishDialog);
  const { width, height } = useWindowDimensions();
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const boxIn = useRef(new Animated.Value(0)).current;
  const portIn = useRef(new Animated.Value(0)).current;
  const bgZoom = useRef(new Animated.Value(0)).current;

  const line = DIALOGUE[idx];
  const def = UNITS[line.speaker];
  const enemy = def.id === 'kargan';
  const done = chars >= line.text.length;

  useEffect(() => {
    Animated.timing(bgZoom, { toValue: 1, duration: 45000, easing: Easing.linear, useNativeDriver: true }).start();
    Animated.timing(boxIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    setChars(0);
    portIn.setValue(0);
    play(line.voice);
    Animated.spring(portIn, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    const t = setInterval(() => {
      setChars((c) => (c >= line.text.length ? c : c + 2));
    }, 24);
    return () => clearInterval(t);
  }, [idx]);

  const next = () => {
    if (!done) {
      setChars(line.text.length);
      return;
    }
    if (idx >= DIALOGUE.length - 1) {
      finish();
      return;
    }
    setIdx((i) => i + 1);
  };

  const PW = Math.min(200, width * 0.24);
  const ch = Math.min(chars, line.text.length);

  return (
    <Pressable style={styles.root} onPress={next}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: bgZoom.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.16] }) }] }]}>
        <Image source={ART.story[4]} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,5,14,0.5)' }]} />
      <LinearGradient colors={['rgba(3,5,14,0.65)', 'transparent', 'rgba(3,5,14,0.9)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.chapterTag}>
        <Text style={styles.chapterTxt}>CHAPTER 1 · STEEL SKY SIEGE</Text>
      </View>

      {/* active speaker portrait */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.portrait,
          enemy ? { right: width * 0.05, bottom: height * 0.3 } : { left: width * 0.05, bottom: height * 0.3 },
          {
            opacity: portIn,
            transform: [
              { translateX: portIn.interpolate({ inputRange: [0, 1], outputRange: [enemy ? PW : -PW, 0] }) },
              { scale: portIn.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
            width: PW,
            height: PW,
            borderColor: def.accent,
          },
        ]}
      >
        <Image source={PILOT_ART[def.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>

      {/* dialogue box */}
      <Animated.View
        style={[
          styles.box,
          {
            width: Math.min(width * 0.8, 780),
            opacity: boxIn,
            transform: [{ translateY: boxIn.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            borderColor: def.accent,
          },
        ]}
      >
        <View style={[styles.nameTag, { backgroundColor: def.color, borderColor: def.accent }]}>
          <Text style={styles.nameTxt}>
            {def.pilot.name} · {def.name}
          </Text>
        </View>
        <Text style={styles.lineTxt} numberOfLines={4}>
          {line.text.slice(0, ch)}
          {!done && <Text style={styles.cursor}>▌</Text>}
        </Text>
        <Text style={styles.next}>{done ? 'TAP ▸' : ' '}</Text>
      </Animated.View>

      <Pressable style={styles.skip} onPress={finish} hitSlop={14}>
        <Text style={styles.skipTxt}>SKIP ▸▸</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#03050e', zIndex: 44 },
  chapterTag: { position: 'absolute', top: 18, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(255,211,77,0.5)', paddingHorizontal: 14, paddingVertical: 4, backgroundColor: 'rgba(5,8,18,0.7)' },
  chapterTxt: { color: '#ffd34d', fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  portrait: { position: 'absolute', borderRadius: 12, overflow: 'hidden', borderWidth: 2, backgroundColor: '#0a0e1e' },
  box: { position: 'absolute', bottom: 26, alignSelf: 'center', backgroundColor: 'rgba(7,10,22,0.92)', borderWidth: 1.5, borderRadius: 12, padding: 16, paddingTop: 20, minHeight: 110 },
  nameTag: { position: 'absolute', top: -13, left: 14, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  nameTxt: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  lineTxt: { color: '#eef2ff', fontSize: 16.5, lineHeight: 25, fontWeight: '500' },
  cursor: { color: '#ffd34d' },
  next: { position: 'absolute', right: 12, bottom: 8, color: '#ffd34d', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  skip: { position: 'absolute', top: 20, right: 24, padding: 8 },
  skipTxt: { color: 'rgba(255,255,255,0.75)', fontWeight: '800', letterSpacing: 2, fontSize: 13 },
});
