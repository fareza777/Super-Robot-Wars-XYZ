import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ART } from '../assets';
import { ALL_SIDE_MISSIONS, CHAPTERS_COUNT, ITEMS, missionOf, sideAsChapter } from '../game/campaign';
import { useGame } from '../game/store';

/** Mission select — main campaign chapter + optional side quests. */
export function MissionSelect() {
  const s = useGame();
  const ch = missionOf(s.chapter, s.route);
  const done = s.chapter >= CHAPTERS_COUNT;

  return (
    <View style={styles.root}>
      <Image source={ART.hqBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.6)', 'rgba(3,5,14,0.45)', 'rgba(3,5,14,0.92)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.header}>
        <Text style={styles.title}>MISSION SELECT</Text>
        <Text style={styles.sub}>AEGIS ARK · OPERATIONS BOARD</Text>
      </View>
      <Pressable style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]} onPress={s.gotoHq}>
        <Text style={styles.backTxt}>◂ HQ</Text>
      </Pressable>

      <View style={styles.cols}>
        {/* main campaign */}
        <View style={styles.col}>
          <Text style={styles.colTitle}>MAIN CAMPAIGN</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 10 }}>
          {s.savedBattle && (
            <Pressable style={({ pressed }) => [styles.resumeCard, pressed && { opacity: 0.7, transform: [{ scale: 0.985 }] }]} onPress={s.resumeBattle}>
              <LinearGradient colors={['rgba(58,32,8,0.95)', 'rgba(20,12,4,0.95)']} style={StyleSheet.absoluteFill} />
              <Text style={styles.resumeTitle}>⚔ BATTLE IN PROGRESS</Text>
              <Text style={styles.resumeName}>{s.savedBattle.missionCh.name.toUpperCase()}</Text>
              <Text style={styles.resumeMeta}>
                Turn {s.savedBattle.turn} · {s.savedBattle.units.filter((u) => u.side === 'player' && u.alive).length} allies · {s.savedBattle.units.filter((u) => u.side === 'enemy' && u.alive).length} hostiles
              </Text>
              <View style={styles.resumeBtn}>
                <Text style={styles.resumeBtnTxt}>RESUME ▸</Text>
              </View>
            </Pressable>
          )}
          <Pressable style={({ pressed }) => [styles.mainCard, done && { opacity: 0.55 }, pressed && !done && { opacity: 0.7, transform: [{ scale: 0.985 }] }]} onPress={done ? undefined : s.gotoBriefing} disabled={done}>
            <LinearGradient colors={['rgba(20,40,24,0.95)', 'rgba(8,14,24,0.95)']} style={StyleSheet.absoluteFill} />
            <Text style={styles.mainCh}>{done ? 'CAMPAIGN COMPLETE' : `CHAPTER ${ch.id}`}</Text>
            <Text style={styles.mainName}>{ch.name.toUpperCase()}</Text>
            <Text style={styles.mainSub}>{ch.subtitle}</Text>
            <Text style={[styles.themeTag, { color: THEME_ACCENT[ch.theme] ?? '#9fd8ff' }]}>◈ THEATRE — {ch.theme.toUpperCase()}</Text>
            <Text style={styles.mainObj}>◈ {ch.objective}</Text>
            {ch.mastery && (
              <Text style={styles.masteryLine}>{s.masteryDone.includes(ch.id) ? '★' : '☆'} MASTERY: {ch.mastery.desc}{s.masteryDone.includes(ch.id) ? ' ✓' : ''}</Text>
            )}
            {s.missionRank[ch.id] && <Text style={[styles.rankTag, { color: RANK_ACCENT[s.missionRank[ch.id]] ?? '#c8d4f0', borderColor: RANK_ACCENT[s.missionRank[ch.id]] ?? '#c8d4f0' }]}>RANK {s.missionRank[ch.id]}</Text>}
            <View style={styles.mainDeploy}>
              <Text style={styles.mainDeployTxt}>{done ? 'ALL CLEAR' : 'DEPLOY ▸'}</Text>
            </View>
          </Pressable>

          {/* VR simulator — endless-wave score run, unlocks after the first arc */}
          {(() => {
            const locked = s.chapter < 5;
            return (
              <Pressable style={({ pressed }) => [styles.simCard, locked && { opacity: 0.45 }, pressed && !locked && { opacity: 0.7, transform: [{ scale: 0.985 }] }]} onPress={locked ? undefined : s.startSim} disabled={locked}>
                <LinearGradient colors={['rgba(28,14,48,0.95)', 'rgba(10,10,30,0.95)']} style={StyleSheet.absoluteFill} />
                <View style={styles.sideTop}>
                  <Text style={styles.simName}>VR SIMULATOR</Text>
                  {locked && <Text style={styles.lockTag}>CLEAR CH.5</Text>}
                </View>
                <Text style={styles.sideDesc}>{locked ? '???' : 'Endless combat drill — waves escalate until the squad falls.'}</Text>
                {!locked && (
                  <Text style={styles.sideMeta}>
                    SCALES TO LV {Math.max(6, s.chapter)} · PAYOUT = SCORE/4{s.simBest > 0 ? ` · BEST ${s.simBest}` : ''}
                  </Text>
                )}
                {!locked && (
                  <View style={[styles.goBtn, { alignSelf: 'flex-start', marginTop: 8 }]}>
                    <Text style={styles.goTxt}>JACK IN ▸</Text>
                  </View>
                )}
              </Pressable>
            );
          })()}
          </ScrollView>
        </View>

        {/* side quests */}
        <View style={[styles.col, { flex: 1.35 }]}>
          <Text style={styles.colTitle}>SIDE QUESTS</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 10 }}>
            {[...ALL_SIDE_MISSIONS].sort((a, b) => a.unlockCh - b.unlockCh).map((m) => {
              const cleared = !m.repeatable && s.sideCleared.includes(m.id);
              const locked = s.chapter < m.unlockCh;
              const rank = s.missionRank[sideAsChapter({ ...m, lvl: m.lvl }).id];
              return (
                <Pressable key={m.id} onPress={() => !locked && !cleared && s.startSideMission(m.id)} disabled={locked || cleared} style={({ pressed }) => [styles.sideCard, locked && { opacity: 0.45 }, cleared && { borderColor: '#4dff7a' }, m.repeatable && { borderColor: '#6fe0ff' }, pressed && !locked && !cleared && { opacity: 0.65, transform: [{ scale: 0.985 }] }]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.sideTop}>
                      <Text style={styles.sideName}>{m.name.toUpperCase()}</Text>
                      {rank && <Text style={[styles.rankTag, { color: RANK_ACCENT[rank] ?? '#c8d4f0', borderColor: RANK_ACCENT[rank] ?? '#c8d4f0' }]}>RANK {rank}</Text>}
                      {m.repeatable && <Text style={styles.repTag}>⟳ REPLAYABLE</Text>}
                      {cleared && <Text style={styles.clearedTag}>CLEARED</Text>}
                      {locked && <Text style={styles.lockTag}>CLEAR CH.{m.unlockCh}</Text>}
                    </View>
                    <Text style={styles.sideDesc}>{locked ? '???' : m.desc}</Text>
                    {!locked && (
                      <Text style={styles.sideMeta}>
                        {m.objectiveType === 'seize' ? '⌖' : m.objectiveType === 'hunt' ? '☠' : m.objectiveType === 'survive' ? '🛡' : m.boss ? '◆' : '⚔'} LV {m.repeatable ? `${Math.max(m.lvl, s.chapter)} (scales)` : m.lvl} · {m.count + (m.boss ? 1 : 0)} hostiles{m.turnLimit ? ` · ⌛${m.turnLimit}T` : ''} · Reward {m.rewardCr} CR{m.rewardItem ? ` + ${ITEMS[m.rewardItem].name}` : ''}
                      </Text>
                    )}
                  </View>
                  {!locked && !cleared && (
                    <View style={styles.goBtn}>
                      <Text style={styles.goTxt}>GO ▸</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const RANK_ACCENT: Record<string, string> = { S: '#ffd34d', A: '#8affc0', B: '#9fd8ff', C: '#c8d4f0' };

const THEME_ACCENT: Record<string, string> = {
  void: '#b48aff', desert: '#e8c06a', fortress: '#8fb0d8', moon: '#c8d0e0', ruins: '#7ad88a',
  lava: '#ff8a5a', colony: '#5ad8e8', ice: '#9fd8ff', snow: '#cfe8ff', mountain: '#a8987a',
  sea: '#5aa8e8', volcano: '#ff7a4d',
};

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#04060f' },
  header: { position: 'absolute', top: 12, left: 18, zIndex: 5 },
  title: { color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 2.5 },
  sub: { color: '#9fd0ff', fontSize: 10.5, letterSpacing: 1.5, marginTop: 2 },
  back: { position: 'absolute', top: 12, right: 18, zIndex: 5, borderWidth: 1, borderColor: '#3a4160', borderRadius: 8, backgroundColor: 'rgba(8,12,26,0.85)', paddingHorizontal: 12, paddingVertical: 7 },
  backTxt: { color: '#9fd0ff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  cols: { position: 'absolute', top: 56, left: 18, right: 18, bottom: 30, flexDirection: 'row', gap: 14 },
  col: { flex: 1 },
  colTitle: { color: '#8fa0c8', fontWeight: '900', fontSize: 11, letterSpacing: 2.5, marginBottom: 8 },
  mainCard: { borderRadius: 14, borderWidth: 2, borderColor: '#4dff7a', overflow: 'hidden', padding: 16, minHeight: 190, shadowColor: '#4dff7a', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  mainCh: { color: '#4dff7a', fontWeight: '900', fontSize: 12, letterSpacing: 2.5 },
  mainName: { color: '#fff', fontWeight: '900', fontSize: 19, letterSpacing: 1, marginTop: 6 },
  mainSub: { color: '#b8c8e8', fontSize: 11.5, marginTop: 4 },
  mainObj: { color: '#ffd34d', fontSize: 11.5, marginTop: 10 },
  mainDeploy: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: '#123a1e', borderWidth: 1.5, borderColor: '#4dff7a', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  mainDeployTxt: { color: '#4dff7a', fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  sideCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#3a4160', backgroundColor: 'rgba(10,14,30,0.9)', padding: 12, marginBottom: 8 },
  sideTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sideName: { color: '#fff', fontWeight: '800', fontSize: 12.5, letterSpacing: 0.5 },
  clearedTag: { color: '#4dff7a', fontWeight: '900', fontSize: 9, letterSpacing: 1.5, borderWidth: 1, borderColor: '#4dff7a', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  lockTag: { color: '#8fa0c8', fontWeight: '900', fontSize: 9, letterSpacing: 1, borderWidth: 1, borderColor: '#3a4160', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  sideDesc: { color: '#9fb0d8', fontSize: 10.5, marginTop: 4 },
  repTag: { color: '#6fe0ff', fontWeight: '900', fontSize: 9, letterSpacing: 1, borderWidth: 1, borderColor: '#6fe0ff', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  rankTag: { color: '#ffd34d', fontWeight: '900', fontSize: 9, letterSpacing: 1, borderWidth: 1, borderColor: '#ffd34d', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  sideMeta: { color: '#ffd34d', fontSize: 9.5, marginTop: 5, letterSpacing: 0.5 },
  goBtn: { backgroundColor: '#16324a', borderWidth: 1, borderColor: '#6fe0ff', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 8 },
  goTxt: { color: '#6fe0ff', fontWeight: '900', fontSize: 11.5 },
  resumeCard: { borderRadius: 12, borderWidth: 2, borderColor: '#ffaa2f', overflow: 'hidden', padding: 14, marginBottom: 10 },
  resumeTitle: { color: '#ffaa2f', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  resumeName: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5, marginTop: 4 },
  resumeMeta: { color: '#d8c8a8', fontSize: 10.5, marginTop: 4 },
  resumeBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#3a2408', borderWidth: 1.5, borderColor: '#ffaa2f', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  resumeBtnTxt: { color: '#ffaa2f', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  themeTag: { fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginTop: 4 },
  masteryLine: { color: '#ffd34d', fontSize: 10.5, marginTop: 6, fontWeight: '700', letterSpacing: 0.5 },
  simCard: { borderRadius: 12, borderWidth: 1.5, borderColor: '#a06fff', overflow: 'hidden', padding: 14, marginTop: 10 },
  simName: { color: '#c8a8ff', fontWeight: '900', fontSize: 12.5, letterSpacing: 2 },
});
