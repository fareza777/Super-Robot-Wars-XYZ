import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AudioPlayer } from 'expo-audio';
import { ART, CAPTIONS, NARRATION } from '../assets';
import { playEx, stop as stopVo } from '../audio';
import { useGame } from '../game/store';

const PANEL_MS = 7200; // fallback when a panel has no narration
const MIN_MS = 2600;

export function StoryIntro() {
  const finish = useGame((s) => s.finishOnboarding);
  const { width, height } = useWindowDimensions();
  const [idx, setIdx] = useState(0);
  const [tapped, setTapped] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const kb = useRef(new Animated.Value(0)).current; // ken burns
  const capOp = useRef(new Animated.Value(0)).current;
  const voRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    kb.setValue(0);
    capOp.setValue(0);
    Animated.timing(kb, { toValue: 1, duration: PANEL_MS + 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.timing(capOp, { toValue: 1, duration: 900, delay: 400, useNativeDriver: true }).start();
    stopVo(voRef.current);
    voRef.current = playEx(NARRATION[idx]);
    const p = voRef.current;
    const t0 = Date.now();
    // advance when the narration ends (fallback: fixed panel time if no audio)
    const t = setInterval(() => {
      const el = Date.now() - t0;
      let hold = PANEL_MS;
      if (p && p.isLoaded && p.duration > 0) hold = Math.max(MIN_MS, (p.duration + 0.7) * 1000);
      if (el >= hold) {
        clearInterval(t);
        setTapped((v) => v + 1);
      }
    }, 200);
    return () => clearInterval(t);
  }, [idx]);

  useEffect(() => {
    if (tapped === 0) return;
    stopVo(voRef.current);
    if (idx >= ART.story.length - 1) {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => finish());
      return;
    }
    setIdx((i) => i + 1);
  }, [tapped]);

  const scale = kb.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.18] });
  const tx = kb.interpolate({ inputRange: [0, 1], outputRange: [0, idx % 2 ? -26 : 26] });

  return (
    <Pressable style={styles.root} onPress={() => setTapped((v) => v + 1)}>
      <Animated.View key={idx} style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }, { translateX: tx }] }]}>
          <Image source={ART.story[idx]} style={StyleSheet.absoluteFill} contentFit="cover" transition={600} />
        </Animated.View>
      </Animated.View>
      <LinearGradient colors={['transparent', 'rgba(3,5,14,0.92)']} style={styles.captionBg} pointerEvents="none" />
      <Animated.View style={[styles.captionWrap, { opacity: capOp, width: Math.min(width * 0.86, 760) }]}>
        <View style={styles.epBar} />
        <Text style={styles.caption}>{CAPTIONS[idx]}</Text>
      </Animated.View>
      <View style={styles.dots}>
        {ART.story.map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotOn]} />
        ))}
      </View>
      <Pressable style={styles.skip} onPress={() => finish()} hitSlop={14}>
        <Text style={styles.skipTxt}>SKIP ▸▸</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#03050e', zIndex: 45 },
  captionBg: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 190 },
  captionWrap: { position: 'absolute', bottom: 56, alignSelf: 'center' },
  epBar: { height: 3, width: 54, backgroundColor: '#ffd34d', marginBottom: 10 },
  caption: { color: '#eef2ff', fontSize: 17, lineHeight: 26, fontWeight: '600', letterSpacing: 0.4, textShadowColor: '#000', textShadowRadius: 6 },
  dots: { position: 'absolute', bottom: 34, alignSelf: 'center', flexDirection: 'row', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)' },
  dotOn: { backgroundColor: '#ffd34d' },
  skip: { position: 'absolute', top: 20, right: 24, padding: 8 },
  skipTxt: { color: 'rgba(255,255,255,0.75)', fontWeight: '800', letterSpacing: 2, fontSize: 13 },
});
