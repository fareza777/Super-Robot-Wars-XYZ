import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BattleScene } from './src/components/BattleScene';
import { BondDialog } from './src/components/BondDialog';
import { ChapterDialog } from './src/components/ChapterDialog';
import { HomeMenu } from './src/components/HomeMenu';
import { MissionSelect } from './src/components/MissionSelect';
import { HQScreen } from './src/components/HQScreen';
import { MapGrid } from './src/components/MapGrid';
import { PrologueScreen } from './src/components/PrologueScreen';
import { BriefingScreen, EndScreen, RouteScreen, TitleScreen } from './src/components/Screens';
import { SettingsScreen } from './src/components/SettingsScreen';
import { CreditsScreen } from './src/components/CreditsScreen';
import { DialogScene } from './src/components/DialogScene';
import { SidePanel } from './src/components/SidePanel';
import { StoryIntro } from './src/components/StoryIntro';
import { bgm } from './src/audio';
import { ART } from './src/assets';
import { useGame } from './src/game/store';

function EnemyBanner() {
  const v = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.enemyBanner, { opacity: v, transform: [{ translateX: slide }] }]}>
      <Text style={styles.enemyBannerTxt}>ENEMY PHASE</Text>
    </Animated.View>
  );
}

/** Deploy-phase bottom bar — reposition units, then launch into the chapter dialog. */
function DeployBar() {
  const begin = useGame((s) => s.beginMission);
  const missionCh = useGame((s) => s.missionCh);
  // swallow stray/queued taps for a beat after mount — the DEPLOY tap on the
  // briefing screen can otherwise land on LAUNCH when the layout flips
  const armedAt = useRef(Date.now() + 500);
  const launch = () => {
    if (Date.now() < armedAt.current) return;
    begin();
  };
  return (
    <View style={styles.deployBar}>
      <View style={{ flex: 1 }}>
        <Text style={styles.deployTitle}>DEPLOY FORMATION</Text>
        <Text style={styles.deployHint}>
          {missionCh.name} — tap a unit, then tap a blue tile to reposition it
        </Text>
      </View>
      <Pressable style={styles.launchBtn} onPress={launch}>
        <Text style={styles.launchTxt}>LAUNCH ▸</Text>
      </Pressable>
    </View>
  );
}

/** Mid-battle story beat — plays over the map at its trigger turn, then returns control. */
function MidDialog() {
  const lines = useGame((s) => s.midDialog);
  const finish = useGame((s) => s.finishMidDialog);
  const missionCh = useGame((s) => s.missionCh);
  if (!lines?.length) return null;
  return <DialogScene lines={lines.map((l) => ({ speaker: l.speaker, text: l.text, voice: l.voice as never }))} tag={`${missionCh.name.toUpperCase()} · ONGOING BATTLE`} bg={ART.story[4]} onDone={finish} />;
}

/** Post-mission debrief — plays over HQ right after a story chapter is cleared. */
function Debrief() {
  const lines = useGame((s) => s.debrief);
  const clear = useGame((s) => s.clearDebrief);
  const phase = useGame((s) => s.phase);
  if (!lines?.length || phase !== 'hq') return null;
  return <DialogScene lines={lines.map((l) => ({ speaker: l.speaker, text: l.text, voice: l.voice as never }))} tag="POST-MISSION DEBRIEF" bg={ART.hqBg} onDone={clear} />;
}

export default function App() {
  const phase = useGame((s) => s.phase);
  const battle = useGame((s) => s.battle);
  const notice = useGame((s) => s.notice);
  const loadSave = useGame((s) => s.loadSave);

  useEffect(() => {
    void loadSave();
  }, []);

  // BGM follows the current phase
  const missionCh = useGame((s) => s.missionCh);
  const units = useGame((s) => s.units);
  const music = useGame((s) => s.settings.music);
  useEffect(() => {
    if (!music) return;
    if (phase === 'battle') return bgm('bgm_battle');
    if (phase === 'player' || phase === 'enemy') return bgm(missionCh.boss ? 'bgm_boss' : 'bgm_map');
    if (phase === 'victory' || phase === 'defeat') return bgm('bgm_title');
    if (phase === 'title' || phase === 'onboarding' || phase === 'prologue') return bgm('bgm_title');
    return bgm('bgm_hq');
  }, [phase, music, missionCh, units]);

  return (
    <View style={styles.root}>
      {phase === 'title' && <TitleScreen />}
      {phase === 'onboarding' && <StoryIntro />}
      {phase === 'home' && <HomeMenu />}
      {phase === 'briefing' && <BriefingScreen />}
      {phase === 'prologue' && <PrologueScreen />}
      {phase === 'hq' && <HQScreen />}
      {phase === 'missions' && <MissionSelect />}
      {phase === 'bond' && <BondDialog />}
      {phase === 'settings' && <SettingsScreen />}
      {phase === 'dialog' && <ChapterDialog />}
      {phase === 'credits' && <CreditsScreen />}
      {(phase === 'player' || phase === 'enemy' || phase === 'battle' || phase === 'deploy') && (
        <View style={styles.gameRow}>
          <MapGrid />
          {phase === 'deploy' ? <DeployBar /> : <SidePanel />}
          {phase === 'enemy' && <EnemyBanner />}
          {!!notice && <NoticeBanner text={notice} />}
          <HintCard />
        </View>
      )}
      {phase === 'route' && <RouteScreen />}
      {phase === 'victory' && <EndScreen victory />}
      {phase === 'defeat' && <EndScreen victory={false} />}
      <MidDialog />
      <Debrief />
      {battle && <BattleScene key={`${battle.attacker.uid}-${battle.defender.uid}-${battle.weapon.id}`} />}
      <StatusBar style="light" hidden />
    </View>
  );
}

/** One-time tutorial card — dismisses itself permanently once tapped. */
function HintCard() {
  const hint = useGame((s) => s.hint);
  const dismissHint = useGame((s) => s.dismissHint);
  if (!hint) return null;
  return (
    <View style={styles.hintCard} pointerEvents="box-none">
      <Text style={styles.hintTitle}>GUIDE</Text>
      <Text style={styles.hintTxt}>{hint.text}</Text>
      <Pressable style={styles.hintBtn} onPress={dismissHint}>
        <Text style={styles.hintBtnTxt}>GOT IT ▸</Text>
      </Pressable>
    </View>
  );
}

/** Transient map banner — phase changes, reinforcement arrivals, other events. */
function NoticeBanner({ text }: { text: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(-40)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 1900, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }).start();
  }, []);
  // player phase banners cool blue, hostiles/events warm, VR wave banners violet
  const playerPhase = text.startsWith('PLAYER PHASE');
  const vr = text.startsWith('▲');
  const bg = vr ? 'rgba(70,30,140,0.78)' : playerPhase ? 'rgba(18,60,140,0.75)' : 'rgba(150,50,10,0.72)';
  const border = vr ? '#b78bff' : playerPhase ? '#6db4ff' : '#ff8a3a';
  const txt = vr ? '#e4d0ff' : playerPhase ? '#c8e4ff' : '#ffd8b0';
  return (
    <Animated.View style={[styles.noticeBanner, { backgroundColor: bg, borderColor: border, opacity: v, transform: [{ translateX: slide }] }]}>
      <Text style={[styles.noticeTxt, { color: txt }]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noticeBanner: { position: 'absolute', top: '12%', left: 0, right: 240, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10, zIndex: 45 },
  noticeTxt: { color: '#ffd8b0', fontSize: 20, fontWeight: '900', letterSpacing: 5, fontStyle: 'italic' },
  hintCard: { position: 'absolute', bottom: '14%', left: 40, right: 280, maxWidth: 560, alignSelf: 'center', backgroundColor: 'rgba(8,14,30,0.94)', borderWidth: 1.5, borderColor: '#6db4ff', borderRadius: 12, padding: 16, zIndex: 46 },
  hintTitle: { color: '#6db4ff', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  hintTxt: { color: '#dce8ff', fontSize: 13, lineHeight: 19, marginBottom: 10 },
  hintBtn: { alignSelf: 'flex-end', borderWidth: 1, borderColor: '#6db4ff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(109,180,255,0.12)' },
  hintBtnTxt: { color: '#9fd0ff', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  root: { flex: 1, backgroundColor: '#05070f' },
  gameRow: { flex: 1, flexDirection: 'row' },
  enemyBanner: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 240,
    alignItems: 'center',
    backgroundColor: 'rgba(140,20,20,0.55)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ff5a5a',
    paddingVertical: 12,
  },
  deployBar: { width: 237, backgroundColor: '#0a0e1a', borderLeftWidth: 1, borderLeftColor: '#2a3450', padding: 14, justifyContent: 'space-between' },
  deployTitle: { color: '#ffd34d', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  deployHint: { color: '#9fb0d8', fontSize: 11, lineHeight: 17 },
  launchBtn: { borderWidth: 1.5, borderColor: '#ffd34d', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,211,77,0.08)' },
  launchTxt: { color: '#ffd34d', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  enemyBannerTxt: { color: '#ffd0d0', fontSize: 26, fontWeight: '900', letterSpacing: 8, fontStyle: 'italic' },
});
