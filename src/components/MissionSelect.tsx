import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ART } from '../assets';
import { CHAPTERS_COUNT, SIDE_MISSIONS, chapterOf, sideAsChapter } from '../game/campaign';
import { useGame } from '../game/store';

/** Mission select — main campaign chapter + optional side quests. */
export function MissionSelect() {
  const s = useGame();
  const ch = chapterOf(s.chapter);
  const done = s.chapter >= CHAPTERS_COUNT;

  return (
    <View style={styles.root}>
      <Image source={ART.hqBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.6)', 'rgba(3,5,14,0.45)', 'rgba(3,5,14,0.92)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.header}>
        <Text style={styles.title}>MISSION SELECT</Text>
        <Text style={styles.sub}>AEGIS ARK · OPERATIONS BOARD</Text>
      </View>
      <Pressable style={styles.back} onPress={s.gotoHq}>
        <Text style={styles.backTxt}>◂ HQ</Text>
      </Pressable>

      <View style={styles.cols}>
        {/* main campaign */}
        <View style={styles.col}>
          <Text style={styles.colTitle}>MAIN CAMPAIGN</Text>
          <Pressable style={[styles.mainCard, done && { opacity: 0.55 }]} onPress={done ? undefined : s.gotoBriefing} disabled={done}>
            <LinearGradient colors={['rgba(20,40,24,0.95)', 'rgba(8,14,24,0.95)']} style={StyleSheet.absoluteFill} />
            <Text style={styles.mainCh}>{done ? 'CAMPAIGN COMPLETE' : `CHAPTER ${ch.id}`}</Text>
            <Text style={styles.mainName}>{ch.name.toUpperCase()}</Text>
            <Text style={styles.mainSub}>{ch.subtitle}</Text>
            <Text style={styles.mainObj}>◈ {ch.objective}</Text>
            <View style={styles.mainDeploy}>
              <Text style={styles.mainDeployTxt}>{done ? 'ALL CLEAR' : 'DEPLOY ▸'}</Text>
            </View>
          </Pressable>
        </View>

        {/* side quests */}
        <View style={[styles.col, { flex: 1.35 }]}>
          <Text style={styles.colTitle}>SIDE QUESTS</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 10 }}>
            {[...SIDE_MISSIONS].sort((a, b) => a.unlockCh - b.unlockCh).map((m) => {
              const cleared = s.sideCleared.includes(m.id);
              const locked = s.chapter < m.unlockCh;
              const sch = sideAsChapter(m);
              return (
                <Pressable key={m.id} style={[styles.sideCard, locked && { opacity: 0.45 }, cleared && { borderColor: '#4dff7a' }]} onPress={() => !locked && !cleared && s.startSideMission(m.id)} disabled={locked || cleared}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.sideTop}>
                      <Text style={styles.sideName}>{m.name.toUpperCase()}</Text>
                      {cleared && <Text style={styles.clearedTag}>CLEARED</Text>}
                      {locked && <Text style={styles.lockTag}>CLEAR CH.{m.unlockCh}</Text>}
                    </View>
                    <Text style={styles.sideDesc}>{locked ? '???' : m.desc}</Text>
                    {!locked && (
                      <Text style={styles.sideMeta}>
                        LV {m.lvl} · {m.count + (m.boss ? 1 : 0)} hostiles · Reward {m.rewardCr} CR{m.rewardItem ? ` + ${m.rewardItem === 'ammoBox' ? 'Ammo Box' : m.rewardItem === 'enCell' ? 'EN Cell' : m.rewardItem === 'megaKit' ? 'Mega Repair Kit' : 'Spirit Wing'}` : ''}
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

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#04060f' },
  header: { position: 'absolute', top: 12, left: 18, zIndex: 5 },
  title: { color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 2.5 },
  sub: { color: '#9fd0ff', fontSize: 10.5, letterSpacing: 1.5, marginTop: 2 },
  back: { position: 'absolute', top: 12, right: 18, zIndex: 5, borderWidth: 1, borderColor: '#3a4160', borderRadius: 8, backgroundColor: 'rgba(8,12,26,0.85)', paddingHorizontal: 12, paddingVertical: 7 },
  backTxt: { color: '#9fd0ff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  cols: { position: 'absolute', top: 56, left: 18, right: 18, bottom: 14, flexDirection: 'row', gap: 14 },
  col: { flex: 1 },
  colTitle: { color: '#8fa0c8', fontWeight: '900', fontSize: 11, letterSpacing: 2.5, marginBottom: 8 },
  mainCard: { borderRadius: 12, borderWidth: 2, borderColor: '#4dff7a', overflow: 'hidden', padding: 16, minHeight: 220 },
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
  sideMeta: { color: '#ffd34d', fontSize: 9.5, marginTop: 5, letterSpacing: 0.5 },
  goBtn: { backgroundColor: '#16324a', borderWidth: 1, borderColor: '#6fe0ff', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 8 },
  goTxt: { color: '#6fe0ff', fontWeight: '900', fontSize: 11.5 },
});
