import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART } from '../assets';
import { useGame } from '../game/store';

const CREDITS: { role: string; name: string }[] = [
  { role: 'THE AEGIS ARK', name: 'STEEL ARK XYZ' },
  { role: 'VALSTRAY X-1', name: 'Ray Ardent' },
  { role: 'ARIELIS X-2', name: 'Mira Sollen' },
  { role: 'GRUNBORG Y-1', name: 'Gara Ironfist' },
  { role: 'ZEPHYRA Z-1', name: 'Orin Vale' },
  { role: 'RAXDEN CRIMSON', name: 'Raxden Volkov' },
  { role: 'VEXIA CUSTOM', name: 'Vexia Kornel' },
  { role: 'COMMAND', name: 'Capt. Serah Vale' },
  { role: 'ENGINEERING', name: 'Bram Okoye' },
  { role: 'QUARTERMASTER', name: 'Mira Volkoff' },
  { role: '', name: '' },
  { role: 'THE IMPERIAL THRONE', name: '' },
  { role: 'KARGAN REX', name: 'Col. Karg Draven' },
  { role: 'MOORIN ANVIL', name: 'General Moorin' },
  { role: 'SERKA VANTA', name: 'Void Empress' },
  { role: 'GATE WARDEN', name: 'Warden Kargan' },
  { role: 'THRONE OF VAEL', name: 'Emperor Kargan' },
  { role: '', name: '' },
  { role: 'ART & STORY', name: 'Generated with AI — Recraft' },
  { role: 'VOICE & MUSIC', name: 'ElevenLabs' },
  { role: 'ENGINE', name: 'React Native · Expo' },
  { role: '', name: '' },
  { role: '', name: 'Every pilot who flew with you' },
  { role: '', name: 'thank you.' },
  { role: '', name: 'STEEL ARK XYZ' },
];

/** Rolling credits — plays after clearing the final chapter, tap anywhere to return to HQ. */
export function CreditsScreen() {
  const { height } = useWindowDimensions();
  const gotoHq = useGame((s) => s.gotoHq);
  const scroll = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scroll, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true }).start();
  }, []);

  return (
    <Pressable style={styles.root} onPress={gotoHq}>
      <Image cachePolicy="memory" source={ART.story[4]} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.92)', 'rgba(3,5,14,0.6)', 'rgba(3,5,14,0.95)']} style={StyleSheet.absoluteFill} />
      <View style={styles.head}>
        <Text style={styles.headTxt}>CAMPAIGN COMPLETE</Text>
      </View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          alignItems: 'center',
          transform: [{ translateY: scroll.interpolate({ inputRange: [0, 1], outputRange: [height, -CREDITS.length * 58] }) }],
        }}
      >
        {CREDITS.map((c, i) => (
          <View key={i} style={styles.line}>
            {!!c.role && <Text style={styles.role}>{c.role}</Text>}
            {!!c.name && <Text style={styles.name}>{c.name}</Text>}
          </View>
        ))}
      </Animated.View>
      <Text style={styles.skip}>TAP TO CONTINUE ▸▸</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#03050e', overflow: 'hidden' },
  head: { position: 'absolute', top: 20, left: 0, right: 0, alignItems: 'center' },
  headTxt: { color: '#ffd34d', fontSize: 15, fontWeight: '900', letterSpacing: 6 },
  line: { alignItems: 'center', marginBottom: 26 },
  role: { color: '#7ea0e0', fontSize: 11, fontWeight: '900', letterSpacing: 4, marginBottom: 3 },
  name: { color: '#eef2ff', fontSize: 17, fontWeight: '700' },
  skip: { position: 'absolute', bottom: 18, alignSelf: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 3 },
});
