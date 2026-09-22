import React, { useRef, useEffect } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART } from '../assets';
import { play } from '../audio';
import { useGame } from '../game/store';
import { BattleMode } from '../game/types';

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLbl}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {children}
    </View>
  );
}

function Seg<T extends string | number>({ options, value, onPick, accent = '#6fe0ff' }: { options: { v: T; label: string }[]; value: T; onPick: (v: T) => void; accent?: string }) {
  return (
    <View style={styles.segRow}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Pressable
            key={String(o.v)}
            style={[styles.seg, on && { borderColor: accent, backgroundColor: 'rgba(20,40,60,0.85)' }]}
            onPress={() => {
              play('ui_select');
              onPick(o.v);
            }}
          >
            <Text style={[styles.segTxt, on && { color: accent }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsScreen() {
  const s = useGame();
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);
  const st = s.settings;
  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      <Image source={ART.hangarBg} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.7)', 'rgba(3,5,14,0.92)']} style={StyleSheet.absoluteFill} />

      <View style={styles.card}>
        <Text style={styles.title}>SETTINGS</Text>

        <Row label="BATTLE ANIMATION" sub="Full cut-in / short / skip to result">
          <Seg<BattleMode>
            value={st.battleMode}
            onPick={(v) => s.setSetting('battleMode', v)}
            options={[
              { v: 'full', label: 'FULL' },
              { v: 'short', label: 'SHORT' },
              { v: 'off', label: 'OFF' },
            ]}
          />
        </Row>

        <Row label="ANIMATION SPEED" sub="Scene pacing (full/short mode)">
          <Seg<1 | 2>
            value={st.animSpeed}
            onPick={(v) => s.setSetting('animSpeed', v)}
            options={[
              { v: 1, label: '×1' },
              { v: 2, label: '×2' },
            ]}
          />
        </Row>

        <Row label="SOUND FX + VOICE" sub="Weapon SFX, pilot voices, UI">
          <Seg<'on' | 'off'>
            value={st.sound ? 'on' : 'off'}
            onPick={(v) => s.setSetting('sound', v === 'on')}
            options={[
              { v: 'on', label: 'ON' },
              { v: 'off', label: 'OFF' },
            ]}
          />
        </Row>

        <Row label="MUSIC" sub="Looping BGM on all screens">
          <Seg<'on' | 'off'>
            value={st.music ? 'on' : 'off'}
            onPick={(v) => s.setSetting('music', v === 'on')}
            options={[
              { v: 'on', label: 'ON' },
              { v: 'off', label: 'OFF' },
            ]}
          />
        </Row>

        <Row label="SAVE DATA" sub="Erase campaign progress (settings kept)">
          <Pressable
            style={styles.danger}
            onPress={() => {
              play('ui_back');
              void s.resetSave();
            }}
          >
            <Text style={styles.dangerTxt}>RESET SAVE</Text>
          </Pressable>
        </Row>
      </View>

      <Pressable style={styles.back} onPress={() => useGame.setState({ phase: 'home' })}>
        <Text style={styles.backTxt}>◂ BACK</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#04060f', zIndex: 40 },
  card: {
    alignSelf: 'center',
    marginTop: '6%',
    width: '58%',
    maxWidth: 640,
    backgroundColor: 'rgba(10,14,30,0.92)',
    borderWidth: 1,
    borderColor: '#3a4160',
    borderRadius: 14,
    padding: 18,
  },
  title: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 4, marginBottom: 10, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1c2440' },
  rowLbl: { color: '#e6ecff', fontWeight: '800', fontSize: 12.5, letterSpacing: 1.5 },
  rowSub: { color: '#8fa0c8', fontSize: 10, marginTop: 2 },
  segRow: { flexDirection: 'row', gap: 6 },
  seg: { borderWidth: 1, borderColor: '#3a4160', borderRadius: 7, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#0a0e1e' },
  segTxt: { color: '#8fa0c8', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  danger: { borderWidth: 1.5, borderColor: '#ff5a5a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(60,10,14,0.6)' },
  dangerTxt: { color: '#ff8a8a', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
  back: { position: 'absolute', bottom: 34, left: 18, borderWidth: 1, borderColor: '#3a4160', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(8,12,26,0.9)' },
  backTxt: { color: '#9fd0ff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
});
