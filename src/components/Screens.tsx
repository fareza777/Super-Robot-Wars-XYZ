import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MISSION_SSS } from '../game/data';
import { useGame } from '../game/store';
import { MechSprite } from './MechSprite';
import { UNITS } from '../game/data';

export function TitleScreen() {
  const start = useGame((s) => s.start);
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }), Animated.timing(glow, { toValue: 0, duration: 1200, useNativeDriver: true })])).start();
  }, []);
  return (
    <View style={styles.center}>
      <Animated.Text style={[styles.title, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }]}>SUPER ROBOT WARS</Animated.Text>
      <Text style={styles.titleXyz}>XYZ</Text>
      <View style={{ flexDirection: 'row', gap: 18, marginVertical: 22 }}>
        <MechSprite def={UNITS.valstray} size={74} />
        <MechSprite def={UNITS.gruntborg} size={74} />
        <MechSprite def={UNITS.zephyra} size={74} />
      </View>
      <TouchableOpacity style={styles.bigBtn} onPress={start}>
        <Text style={styles.bigBtnTxt}>LAUNCH MISSION</Text>
      </TouchableOpacity>
      <Text style={styles.small}>Original mecha tactics · Mission SSS</Text>
    </View>
  );
}

export function BriefingScreen() {
  const startMission = useGame((s) => s.startMission);
  return (
    <View style={styles.center}>
      <Text style={styles.briefTitle}>{MISSION_SSS.name}</Text>
      <Text style={styles.briefSub}>— {MISSION_SSS.subtitle} —</Text>
      <View style={styles.briefBox}>
        <Text style={styles.briefTxt}>{MISSION_SSS.objective}</Text>
        <Text style={styles.briefTxtSmall}>
          {'\n'}Tap a unit to see its move range · tap again for actions · red tiles are targets{'\n'}Terrain gives DEF/EVA bonuses · weapons with [No P] can't fire after moving
        </Text>
      </View>
      <TouchableOpacity style={styles.bigBtn} onPress={startMission}>
        <Text style={styles.bigBtnTxt}>DEPLOY ▸</Text>
      </TouchableOpacity>
    </View>
  );
}

export function EndScreen({ victory }: { victory: boolean }) {
  const restart = useGame((s) => s.restart);
  const turn = useGame((s) => s.turn);
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: victory ? '#ffd34d' : '#ff5a5a', fontSize: 40 }]}>{victory ? 'MISSION COMPLETE' : 'MISSION FAILED'}</Text>
      <Text style={styles.briefSub}>{victory ? `Cleared in ${turn} turns` : 'Your squad was wiped out'}</Text>
      <TouchableOpacity style={styles.bigBtn} onPress={restart}>
        <Text style={styles.bigBtnTxt}>{victory ? 'PLAY AGAIN' : 'RETRY'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, backgroundColor: '#05070f', alignItems: 'center', justifyContent: 'center', zIndex: 40 },
  title: { color: '#7ee7ff', fontSize: 30, fontWeight: '900', letterSpacing: 6, fontStyle: 'italic' },
  titleXyz: { color: '#ffd34d', fontSize: 52, fontWeight: '900', letterSpacing: 14, fontStyle: 'italic', marginTop: -4 },
  bigBtn: { borderWidth: 2, borderColor: '#ffd34d', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 34, backgroundColor: '#1a1430', marginTop: 14 },
  bigBtnTxt: { color: '#ffd34d', fontWeight: '900', fontSize: 16, letterSpacing: 3 },
  small: { color: '#6b7694', marginTop: 16, fontSize: 11, letterSpacing: 1 },
  briefTitle: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 4 },
  briefSub: { color: '#7ee7ff', fontSize: 15, fontWeight: '700', marginTop: 4, letterSpacing: 2 },
  briefBox: { backgroundColor: '#12141c', borderWidth: 1, borderColor: '#2a2f42', borderRadius: 10, padding: 18, margin: 20, maxWidth: 480 },
  briefTxt: { color: '#e6ecff', fontSize: 13, lineHeight: 20 },
  briefTxtSmall: { color: '#8fa1c7', fontSize: 11, lineHeight: 18 },
});
