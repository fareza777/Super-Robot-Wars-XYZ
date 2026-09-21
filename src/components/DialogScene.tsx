import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ImageSourcePropType, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AudioKey, NPC_ART, PILOT_ART } from '../assets';
import { play } from '../audio';
import { ALL_UNITS } from '../game/campaign';

export interface DialogLine {
  speaker: string; // unit defId or npc_* key
  voice: AudioKey;
  text: string;
}

const NPC_INFO: Record<string, { name: string; color: string; accent: string }> = {
  npc_captain: { name: 'Capt. Serah Vale · Ark Raider', color: '#233860', accent: '#8fb8ff' },
  npc_merchant: { name: 'Mira Volkoff · Quartermaster', color: '#3d2b52', accent: '#d0a0ff' },
  npc_mechanic: { name: 'Bram Okoye · Chief Engineer', color: '#4a3018', accent: '#ffb84d' },
};

const PLAYER_IDS = ['valstray', 'arielis', 'gruntborg', 'zephyra'];

function speakerInfo(id: string): { img: ImageSourcePropType; name: string; color: string; accent: string; left: boolean } {
  const npc = NPC_INFO[id];
  if (npc) return { img: NPC_ART[id.replace('npc_', '')], name: npc.name, color: npc.color, accent: npc.accent, left: true };
  const def = ALL_UNITS[id];
  return {
    img: PILOT_ART[id],
    name: `${def.pilot.name} · ${def.name}`,
    color: def.color,
    accent: def.accent,
    left: PLAYER_IDS.includes(id),
  };
}

/** VN-style dialogue scene — portraits slide in per speaker, typewriter text, per-line VO. */
export function DialogScene({ lines, tag, bg, onDone }: { lines: DialogLine[]; tag: string; bg: ImageSourcePropType; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const boxIn = useRef(new Animated.Value(0)).current;
  const portIn = useRef(new Animated.Value(0)).current;
  const bgZoom = useRef(new Animated.Value(0)).current;

  const line = lines[Math.min(idx, lines.length - 1)];
  const sp = speakerInfo(line.speaker);
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
    // elapsed-time driven so starved timers on slow devices still finish on schedule
    const t0 = Date.now();
    const t = setInterval(() => {
      setChars(Math.floor((Date.now() - t0) / 15));
    }, 32);
    return () => clearInterval(t);
  }, [idx]);

  const next = () => {
    if (!done) {
      setChars(line.text.length);
      return;
    }
    if (idx >= lines.length - 1) {
      onDone();
      return;
    }
    setIdx((i) => i + 1);
  };

  const PW = Math.min(200, width * 0.24);
  const ch = Math.min(chars, line.text.length);
  const right = !sp.left;

  return (
    <Pressable style={styles.root} onPress={next}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: bgZoom.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.16] }) }] }]}>
        <Image source={bg} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,5,14,0.5)' }]} />
      <LinearGradient colors={['rgba(3,5,14,0.65)', 'transparent', 'rgba(3,5,14,0.9)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.chapterTag}>
        <Text style={styles.chapterTxt}>{tag}</Text>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.portrait,
          right ? { right: width * 0.05, bottom: height * 0.3 } : { left: width * 0.05, bottom: height * 0.3 },
          {
            opacity: portIn,
            transform: [
              { translateX: portIn.interpolate({ inputRange: [0, 1], outputRange: [right ? PW : -PW, 0] }) },
              { scale: portIn.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
            width: PW,
            height: PW,
            borderColor: sp.accent,
          },
        ]}
      >
        <Image source={sp.img} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>

      <Animated.View
        style={[
          styles.box,
          {
            width: Math.min(width * 0.8, 780),
            opacity: boxIn,
            transform: [{ translateY: boxIn.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            borderColor: sp.accent,
          },
        ]}
      >
        <View style={[styles.nameTag, { backgroundColor: sp.color, borderColor: sp.accent }]}>
          <Text style={styles.nameTxt}>{sp.name}</Text>
        </View>
        <Text style={styles.lineTxt} numberOfLines={4}>
          {line.text.slice(0, ch)}
          {!done && <Text style={styles.cursor}>▌</Text>}
        </Text>
        <Text style={styles.next}>{done ? 'TAP ▸' : ' '}</Text>
      </Animated.View>

      <Pressable style={styles.skip} onPress={onDone} hitSlop={14}>
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
