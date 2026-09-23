import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART, AudioKey, MECH_ART, NPC_ART, PILOT_ART } from '../assets';
import { play } from '../audio';
import { ALL_UNITS, CHAPTERS, CHAPTERS_COUNT, HONORS, ITEMS, MAX_PART_SLOTS, MAX_PILOT_SKILL, MAX_WEAPON_UPG, MILESTONE_SPIRITS, PARTS, PILOT_STATS, PLAYER_DEF_IDS, SIDE_MISSIONS, UPGRADE_STATS, WEAPON_UPG_POWER, honorDone, missionOf, rosterFor, weaponUpgCost } from '../game/campaign';
import { BOND_EVENTS, MAX_BOND, bondLevel } from '../game/bonds';
import { SPIRITS, TRAITS } from '../game/data';
import { useGame } from '../game/store';

type Tab = 'main' | 'merchant' | 'workshop' | 'chat' | 'mess' | 'codex';

const NPCS = {
  merchant: { name: 'Mira Volkoff', role: 'MERCHANT', art: NPC_ART.merchant, accent: '#ffd34d', voices: ['hq_merch_1', 'hq_merch_2', 'hq_merch_3'] },
  mechanic: { name: 'Bram Okoye', role: 'CHIEF TECHNICIAN', art: NPC_ART.mechanic, accent: '#6fe0ff', voices: ['hq_mech_1', 'hq_mech_2', 'hq_mech_3'] },
  captain: { name: 'Capt. Serah Vale', role: 'COMMANDER', art: NPC_ART.captain, accent: '#9fd0ff', voices: ['hq_cap_1', 'hq_cap_2', 'hq_cap_3'] },
} as const;

const CHAT_LINES = [
  { npc: 'captain' as const, voice: 'hq_cap_1', text: 'Squad, listen up. The Imperial fleet is regrouping — this next sortie decides the front line.' },
  { npc: 'captain' as const, voice: 'hq_cap_2', text: 'Ray, keep your Valstray close to formation. Arielis, your X-2 is our lynchpin — do not overextend.' },
  { npc: 'captain' as const, voice: 'hq_cap_3', text: 'We fight for everyone still on the ground. Show them what the Ark can do. Dismissed.' },
];

function useIdle(delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), delay, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return v;
}

export function HQScreen() {
  const { width, height } = useWindowDimensions();
  const s = useGame();
  const [tab, setTab] = useState<Tab>('main');
  const [wsTab, setWsTab] = useState<'frame' | 'weap' | 'parts' | 'pilots'>('frame');
  const [selUnit, setSelUnit] = useState<string>(PLAYER_DEF_IDS[0]);
  const [chatIdx, setChatIdx] = useState(0);
  const [chatLine, setChatLine] = useState(0);
  const npcBob = useIdle(300);
  const fade = useRef(new Animated.Value(0)).current;
  const ch = missionOf(s.chapter, s.route);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const goChat = () => {
    setTab('chat');
    setChatLine(0);
    play(CHAT_LINES[0].voice as AudioKey);
  };

  const npc = NPCS.merchant;
  const npcImgH = height * 0.62;

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      <Image source={tab === 'workshop' ? ART.hangarBg : ART.hqBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(3,5,14,0.55)', 'rgba(3,5,14,0.35)', 'rgba(3,5,14,0.85)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      {/* header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hqTitle}>AEGIS ARK — HEADQUARTERS</Text>
          <Text style={styles.hqSub}>{s.chapter >= CHAPTERS_COUNT ? 'CAMPAIGN COMPLETE' : `NEXT: CHAPTER ${ch.id} · ${ch.name}`}</Text>
        </View>
        <View style={styles.credBox}>
          <Text style={styles.credTxt}>◆ {s.credits} CR</Text>
        </View>
      </View>

      {/* nav tiles (main view) */}
      {tab === 'main' && (
        <View style={styles.mainRow}>
          <HqCard title="MERCHANT" sub="Buy battle items" art={NPC_ART.merchant} accent="#ffd34d" onPress={() => setTab('merchant')} />
          <HqCard title="WORKSHOP" sub="Upgrade your mechs" art={NPC_ART.mechanic} accent="#6fe0ff" onPress={() => setTab('workshop')} />
          <HqCard title="BRIEF ROOM" sub="Talk with the crew" art={NPC_ART.captain} accent="#9fd0ff" onPress={goChat} />
          <HqCard title="MESS HALL" sub="Bonds & stories" art={PILOT_ART.valstray} accent="#ff9fd0" onPress={() => setTab('mess')} />
          <HqCard title="CODEX" sub="Frame & pilot archive" art={MECH_ART.valstray} accent="#b8a0ff" onPress={() => setTab('codex')} />
          <Pressable style={styles.deployBtn} onPress={() => s.gotoMissions()}>
            <Text style={styles.deployTxt}>▶ MISSIONS</Text>
            <Text style={styles.deploySub}>CH.{ch.id} · {s.sideCleared.length} side cleared</Text>
          </Pressable>
        </View>
      )}

      {/* MERCHANT */}
      {tab === 'merchant' && (
        <HqPanel npc={NPCS.merchant} onBack={() => setTab('main')} npcImgH={npcImgH} bob={npcBob}>
          <Text style={styles.panelTitle}>MERCHANT — SUPPLY DEPOT</Text>
          {Object.values(ITEMS).map((it) => {
            const owned = s.inventory[it.id] ?? 0;
            const afford = s.credits >= it.price;
            return (
              <View key={it.id} style={styles.shopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName}>
                    {it.name} <Text style={styles.shopOwned}>×{owned}</Text>
                  </Text>
                  <Text style={styles.shopDesc}>{it.desc}</Text>
                </View>
                <Pressable style={[styles.buyBtn, !afford && { opacity: 0.35 }]} onPress={() => s.buyItem(it.id)} disabled={!afford}>
                  <Text style={styles.buyTxt}>{it.price} CR</Text>
                </Pressable>
              </View>
            );
          })}
        </HqPanel>
      )}

      {/* WORKSHOP */}
      {tab === 'workshop' && (
        <HqPanel npc={NPCS.mechanic} onBack={() => setTab('main')} npcImgH={npcImgH} bob={npcBob}>
          <Text style={styles.panelTitle}>WORKSHOP — BENGKEL TEKNISI</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
            <View style={styles.unitRow}>
            {rosterFor(ch).map((id) => (
              <Pressable key={id} style={[styles.unitChip, selUnit === id && { borderColor: '#6fe0ff' }]} onPress={() => setSelUnit(id)}>
                <Image source={MECH_ART[id]} style={{ width: 34, height: 34, borderRadius: 6 }} />
                <Text style={styles.unitChipTxt} numberOfLines={1}>
                  {ALL_UNITS[id].name}
                </Text>
              </Pressable>
            ))}
            </View>
          </ScrollView>
          <View style={styles.wsTabs}>
            {(['frame', 'weap', 'parts', 'pilots'] as const).map((t) => (
              <Pressable key={t} style={[styles.wsTab, wsTab === t && styles.wsTabOn]} onPress={() => setWsTab(t)}>
                <Text style={[styles.wsTabTxt, wsTab === t && { color: '#6fe0ff' }]}>{t === 'frame' ? 'FRAME' : t === 'weap' ? 'WEAPONS' : t === 'parts' ? 'PARTS' : 'PILOT'}</Text>
              </Pressable>
            ))}
          </View>
          {wsTab === 'frame' &&
            UPGRADE_STATS.map((stat) => {
              const lvl = s.upgrades[selUnit]?.[stat.id] ?? 0;
              const maxed = lvl >= 8;
              const cost = maxed ? 0 : stat.cost(lvl);
              const afford = s.credits >= cost;
              return (
                <View key={stat.id} style={styles.shopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>
                      {stat.name} <Text style={styles.shopOwned}>Lv {lvl}/8</Text>
                    </Text>
                    <View style={styles.lvlBarTrack}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <View key={i} style={[styles.lvlSeg, i < lvl && { backgroundColor: '#6fe0ff' }]} />
                      ))}
                    </View>
                  </View>
                  <Pressable style={[styles.buyBtn, (!afford || maxed) && { opacity: 0.35 }]} onPress={() => s.upgradeStat(selUnit, stat.id)} disabled={!afford || maxed}>
                    <Text style={styles.buyTxt}>{maxed ? 'MAX' : `${cost} CR`}</Text>
                  </Pressable>
                </View>
              );
            })}
          {wsTab === 'parts' && (
            <>
              <View style={styles.slotRow}>
                <Text style={styles.slotLbl}>SLOTS:</Text>
                {Array.from({ length: MAX_PART_SLOTS }).map((_, i) => {
                  const pid = (s.parts[selUnit] ?? [])[i];
                  return (
                    <Pressable key={i} style={[styles.slotChip, pid ? { borderColor: '#ffd34d' } : null]} onPress={() => pid && s.equipPart(selUnit, pid)}>
                      <Text style={styles.slotTxt} numberOfLines={1}>
                        {pid ? PARTS[pid].name : '— empty —'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {Object.values(PARTS).map((p) => {
                const owned = s.partsOwned.includes(p.id);
                const equipped = (s.parts[selUnit] ?? []).includes(p.id);
                const afford = s.credits >= p.price;
                return (
                  <View key={p.id} style={styles.shopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shopName}>
                        {p.name} {equipped && <Text style={styles.shopOwned}>· EQUIPPED</Text>}
                      </Text>
                      <Text style={styles.shopDesc}>{p.desc}</Text>
                    </View>
                    {owned ? (
                      <Pressable style={[styles.buyBtn, equipped && { borderColor: '#ffd34d' }]} onPress={() => s.equipPart(selUnit, p.id)}>
                        <Text style={styles.buyTxt}>{equipped ? 'REMOVE' : 'EQUIP'}</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={[styles.buyBtn, !afford && { opacity: 0.35 }]} onPress={() => s.buyPart(p.id)} disabled={!afford}>
                        <Text style={styles.buyTxt}>{p.price} CR</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </>
          )}
          {wsTab === 'pilots' && (
            <>
              {/* pilot dossier — face, level, career kills, spirits, bonds */}
              <View style={styles.pilotCard}>
                <ExpoImage cachePolicy="memory" source={PILOT_ART[selUnit]} style={styles.pilotCardFace} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pilotCardName}>{ALL_UNITS[selUnit].pilot.name}</Text>
                  <Text style={styles.pilotCardSub}>
                    {ALL_UNITS[selUnit].pilot.callsign} · Lv {s.pilotProg[selUnit]?.level ?? ALL_UNITS[selUnit].level ?? 1} · EXP {s.pilotProg[selUnit]?.exp ?? 0}/100
                  </Text>
                  <Text style={styles.pilotCardSub}>
                    Career kills {s.pilotProg[selUnit]?.kills ?? 0}
                    {(s.pilotProg[selUnit]?.kills ?? 0) >= 50 ? ' · ★ACE' : (s.pilotProg[selUnit]?.kills ?? 0) >= 25 ? ' · ACE' : ''} · PP {s.pilotProg[selUnit]?.pp ?? 0}
                  </Text>
                  {ALL_UNITS[selUnit].pilot.trait && (
                    <Text style={[styles.pilotCardSub, { color: '#b8a0ff' }]} numberOfLines={1}>
                      ◆ {TRAITS[ALL_UNITS[selUnit].pilot.trait!].name} — {TRAITS[ALL_UNITS[selUnit].pilot.trait!].desc}
                    </Text>
                  )}
                  <Text style={styles.pilotCardSub} numberOfLines={1}>
                    Spirits: {ALL_UNITS[selUnit].pilot.spirits.map((id) => SPIRITS[id].name).join(' · ')}
                    {(MILESTONE_SPIRITS[selUnit] ?? []).filter((m) => (s.pilotProg[selUnit]?.kills ?? 0) >= m.kills).map((m) => ` · ★${SPIRITS[m.spirit].name}`).join('')}
                  </Text>
                  {(MILESTONE_SPIRITS[selUnit] ?? []).some((m) => (s.pilotProg[selUnit]?.kills ?? 0) < m.kills) && (
                    <Text style={[styles.pilotCardSub, { color: '#8a94b8' }]} numberOfLines={1}>
                      Next milestone: {(MILESTONE_SPIRITS[selUnit] ?? []).filter((m) => (s.pilotProg[selUnit]?.kills ?? 0) < m.kills).map((m) => `${SPIRITS[m.spirit].name} @ ${m.kills} kills`).join(' · ')}
                    </Text>
                  )}
                  <Text style={styles.pilotCardSub} numberOfLines={1}>
                    Bonds: {[...new Set(BOND_EVENTS.filter((ev) => ev.a === selUnit || ev.b === selUnit).map((ev) => (ev.a === selUnit ? ev.b : ev.a)))].map((pid) => `${ALL_UNITS[pid]?.pilot.callsign ?? '?'} Lv${bondLevel(s.bonds, selUnit, pid)}`).join(' · ') || '—'}
                  </Text>
                </View>
              </View>
              <Text style={styles.pilotLine}>
                PILOT SKILLS · PP {s.pilotProg[selUnit]?.pp ?? 0}
              </Text>
              {PILOT_STATS.map((st) => {
                const lvl = s.pilotProg[selUnit]?.skills?.[st.id] ?? 0;
                const pp = s.pilotProg[selUnit]?.pp ?? 0;
                const maxed = lvl >= MAX_PILOT_SKILL;
                return (
                  <View key={st.id} style={styles.shopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shopName}>
                        {st.name} <Text style={styles.shopOwned}>Lv {lvl}/{MAX_PILOT_SKILL}</Text>
                      </Text>
                      <Text style={styles.shopDesc}>{st.desc}</Text>
                      <View style={styles.lvlBarTrack}>
                        {Array.from({ length: MAX_PILOT_SKILL }).map((_, i) => (
                          <View key={i} style={[styles.lvlSeg, i < lvl && { backgroundColor: '#ff9fd0' }]} />
                        ))}
                      </View>
                    </View>
                    <Pressable style={[styles.buyBtn, (pp < 1 || maxed) && { opacity: 0.35 }]} onPress={() => s.allocPP(selUnit, st.id)} disabled={pp < 1 || maxed}>
                      <Text style={styles.buyTxt}>{maxed ? 'MAX' : '+1 (1PP)'}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </>
          )}
          {wsTab === 'weap' &&
            ALL_UNITS[selUnit].weapons.map((w) => {
              const lvl = s.weaponUpg[selUnit]?.[w.id] ?? 0;
              const maxed = lvl >= MAX_WEAPON_UPG;
              const cost = weaponUpgCost(lvl);
              const afford = s.credits >= cost;
              const pow = Math.round(w.power * (1 + WEAPON_UPG_POWER * lvl));
              return (
                <View key={w.id} style={styles.shopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>
                      {w.name} <Text style={styles.shopOwned}>Lv {lvl}/{MAX_WEAPON_UPG}</Text>
                    </Text>
                    <Text style={styles.shopDesc}>
                      POW {pow} (+{Math.round(WEAPON_UPG_POWER * 100)}%/lv) · R{w.rangeMin}-{w.rangeMax}
                      {w.ammo != null ? ` · ×${w.ammo}` : ` · EN ${w.enCost}`}
                    </Text>
                    <View style={styles.lvlBarTrack}>
                      {Array.from({ length: MAX_WEAPON_UPG }).map((_, i) => (
                        <View key={i} style={[styles.lvlSeg, i < lvl && { backgroundColor: '#ffb84d' }]} />
                      ))}
                    </View>
                  </View>
                  <Pressable style={[styles.buyBtn, (!afford || maxed) && { opacity: 0.35 }]} onPress={() => s.upgradeWeapon(selUnit, w.id)} disabled={!afford || maxed}>
                    <Text style={styles.buyTxt}>{maxed ? 'MAX' : `${cost} CR`}</Text>
                  </Pressable>
                </View>
              );
            })}
        </HqPanel>
      )}

      {/* MESS HALL — bond events */}
      {tab === 'mess' && (
        <View style={styles.panelWrap}>
          <View style={styles.panelLeft}>
            <Animated.Image source={PILOT_ART.arielis} style={{ width: '100%', height: npcImgH, transform: [{ translateY: npcBob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }} resizeMode="contain" />
            <Text style={[styles.npcName, { color: '#ff9fd0' }]}>MESS HALL</Text>
            <Text style={styles.npcRole}>PILOT BONDS</Text>
          </View>
          <View style={styles.panelRight}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={styles.panelTitle}>BOND EVENTS — hearts grow beside you</Text>
              <Text style={styles.bondHint}>Bonded pilots within 2 tiles in battle: +4% hit & +6% damage per level.</Text>
              {[...BOND_EVENTS].sort((a, b) => a.chapter - b.chapter).map((ev) => {
                const lvl = bondLevel(s.bonds, ev.a, ev.b);
                const seen = s.bondSeen.includes(ev.id);
                const locked = s.chapter < ev.chapter;
                return (
                  <View key={ev.id} style={styles.bondRow}>
                    <View style={styles.bondFaces}>
                      <ExpoImage cachePolicy="memory" source={PILOT_ART[ev.a]} style={styles.bondFace} contentFit="cover" />
                      <Text style={styles.bondHeart}>{ev.romance ? '♥' : '✦'}</Text>
                      <ExpoImage cachePolicy="memory" source={PILOT_ART[ev.b]} style={styles.bondFace} contentFit="cover" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shopName}>{locked ? '???' : ev.title}</Text>
                      <Text style={styles.shopDesc}>
                        {locked
                          ? `Unlocks after Chapter ${ev.chapter}`
                          : `${ALL_UNITS[ev.a].pilot.name.split(' ').pop()} & ${ALL_UNITS[ev.b].pilot.name.split(' ').pop()}${ev.romance ? ' · romance' : ''}`}
                      </Text>
                      <View style={styles.lvlBarTrack}>
                        {Array.from({ length: MAX_BOND }).map((_, i) => (
                          <View key={i} style={[styles.lvlSeg, i < lvl && { backgroundColor: ev.romance ? '#ff9fd0' : '#9fd0ff' }]} />
                        ))}
                      </View>
                    </View>
                    {!locked && (
                      <Pressable style={styles.buyBtn} onPress={() => s.openBondEvent(ev.id)}>
                        <Text style={styles.buyTxt}>{seen ? 'REPLAY' : 'WATCH ▸'}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <Pressable style={styles.backBtn} onPress={() => setTab('main')}>
              <Text style={styles.backTxt}>◂ BACK TO HQ</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* CODEX — archive of every frame met in the campaign */}
      {tab === 'codex' && (
        <View style={styles.panelWrap}>
          <View style={styles.panelLeft}>
            <Animated.Image source={PILOT_ART.zephyra} style={{ width: '100%', height: npcImgH, transform: [{ translateY: npcBob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }} resizeMode="contain" />
            <Text style={[styles.npcName, { color: '#b8a0ff' }]}>CODEX</Text>
            <Text style={styles.npcRole}>FRAME ARCHIVE</Text>
          </View>
          <View style={styles.panelRight}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={styles.panelTitle}>ARK SQUAD</Text>
              {rosterFor(ch).map((id) => (
                <CodexRow key={id} id={id} ally />
              ))}
              <Text style={[styles.panelTitle, { marginTop: 14 }]}>IMPERIAL REGISTRY</Text>
              {Object.keys(ALL_UNITS)
                .filter((id) => !CODEX_ALLY_IDS.includes(id))
                .map((id) => (
                  <CodexRow key={id} id={id} ally={false} />
                ))}
              <Text style={[styles.panelTitle, { marginTop: 14 }]}>SERVICE RECORD</Text>
              <View style={styles.recordBox}>
                <Text style={styles.recordRow}>CAMPAIGN — chapter {Math.min(s.chapter, CHAPTERS_COUNT)}/{CHAPTERS_COUNT} cleared{s.ngPlus > 0 ? ` · NG+ cycle ${s.ngPlus}` : ''}</Text>
                <Text style={styles.recordRow}>MASTERY — {s.masteryDone.length}/{CHAPTERS.filter((c) => c.mastery).length} ★ earned</Text>
                <Text style={styles.recordRow}>SIDE QUESTS — {s.sideCleared.length}/{SIDE_MISSIONS.length} cleared</Text>
                <Text style={styles.recordRow}>BOND EVENTS — {s.bondSeen.length}/{BOND_EVENTS.length} seen</Text>
                <Text style={styles.recordRow}>
                  TOTAL KILLS — {Object.values(s.pilotProg).reduce((n, p) => n + (p.kills ?? 0), 0)} ·{' '}
                  {Object.values(s.pilotProg).filter((p) => (p.kills ?? 0) >= 50).length} ace pilot(s)
                </Text>
                <Text style={styles.recordRow}>CREDITS ON HAND — ◆ {s.credits}</Text>
              </View>
              <Text style={[styles.panelTitle, { marginTop: 14 }]}>HONORS</Text>
              <View style={styles.recordBox}>
                {HONORS.map((h) => {
                  const claimed = s.honorsClaimed.includes(h.id);
                  const done = honorDone(h, s);
                  return (
                    <View key={h.id} style={styles.honorRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.honorName, !done && { color: '#5a6488' }]}>
                          {done ? '★' : '☆'} {h.name}
                        </Text>
                        <Text style={styles.honorDesc}>
                          {h.desc} · +{h.rewardCr} CR
                        </Text>
                      </View>
                      {claimed ? (
                        <Text style={styles.honorClaimed}>CLAIMED</Text>
                      ) : done ? (
                        <Pressable style={styles.honorBtn} onPress={() => s.claimHonor(h.id)}>
                          <Text style={styles.honorBtnTxt}>CLAIM</Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.honorLocked}>LOCKED</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable style={styles.backBtn} onPress={() => setTab('main')}>
              <Text style={styles.backTxt}>◂ BACK TO HQ</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* CHAT */}
      {tab === 'chat' && (
        <View style={styles.chatWrap}>
          <Animated.Image source={NPC_ART.captain} style={[styles.chatNpc, { height: npcImgH, transform: [{ translateY: npcBob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]} resizeMode="contain" />
          <View style={styles.chatBox}>
            <Text style={[styles.chatName, { color: NPCS.captain.accent }]}>
              {NPCS.captain.name} — {NPCS.captain.role}
            </Text>
            <Text style={styles.chatTxt}>{CHAT_LINES[chatLine].text}</Text>
            <Pressable
              style={styles.chatNext}
              onPress={() => {
                if (chatLine < CHAT_LINES.length - 1) {
                  const n = chatLine + 1;
                  setChatLine(n);
                  play(CHAT_LINES[n].voice as AudioKey);
                } else setTab('main');
              }}
            >
              <Text style={styles.chatNextTxt}>{chatLine < CHAT_LINES.length - 1 ? 'NEXT ▸' : 'DONE ▸'}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.backCorner} onPress={() => setTab('main')}>
            <Text style={styles.backTxt}>◂ HQ</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const CODEX_ALLY_IDS = [...PLAYER_DEF_IDS, 'raxdenR', 'vexiaX'];

/** Codex entry — one frame: art, stats, armament, pilot. */
function CodexRow({ id, ally }: { id: string; ally: boolean }) {
  const d = ALL_UNITS[id];
  const killsByDef = useGame((st) => st.killsByDef);
  const pilotProg = useGame((st) => st.pilotProg);
  const tally = killsByDef[id] ?? 0;
  return (
    <View style={styles.codexRow}>
      <ExpoImage cachePolicy="memory" source={MECH_ART[id]} style={styles.codexThumb} contentFit="cover" contentPosition="top center" />
      <View style={{ flex: 1 }}>
        <Text style={styles.shopName}>
          {d.name} <Text style={{ color: d.accent }}>· {d.title}</Text>
          {d.boss ? ' · ★ACE FRAME' : ''}
        </Text>
        <Text style={styles.shopDesc}>
          Pilot: {d.pilot.name} “{d.pilot.callsign}” · {d.moveType === 'air' ? 'AIR' : 'LAND'} · MV {d.moveRange}
        </Text>
        <Text style={styles.shopDesc}>
          HP {d.maxHp} · EN {d.maxEn} · ARM {d.armor} · MOB {d.mobility}
          {!ally && tally > 0 ? ` · ✕ ×${tally} destroyed` : ''}
        </Text>
        <Text style={styles.codexWep} numberOfLines={1}>
          {d.weapons.map((w) => w.name).join(' · ')}
        </Text>
        {ally && d.pilot.spirits.length > 0 && (
          <Text style={styles.codexSpirit} numberOfLines={1}>
            Spirits: {d.pilot.spirits.map((sp) => SPIRITS[sp].name).join(' · ')}
            {(MILESTONE_SPIRITS[d.id] ?? []).filter((m) => (pilotProg[d.id]?.kills ?? 0) >= m.kills).map((m) => ` · ★${SPIRITS[m.spirit].name}`).join('')}
          </Text>
        )}
        {ally && d.pilot.trait && (
          <Text style={[styles.codexSpirit, { color: '#b8a0ff' }]} numberOfLines={1}>
            ◆ {TRAITS[d.pilot.trait].name} — {TRAITS[d.pilot.trait].desc}
          </Text>
        )}
      </View>
      <View style={[styles.codexSide, { borderColor: ally ? '#6db4ff' : '#ff6b6b' }]}>
        <Text style={{ color: ally ? '#6db4ff' : '#ff6b6b', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>{ally ? 'ARK' : 'FOE'}</Text>
      </View>
    </View>
  );
}

function HqCard({ title, sub, art, accent, onPress }: { title: string; sub: string; art: number; accent: string; onPress: () => void }) {
  const bob = useIdle(Math.random() * 400);
  return (
    <Pressable style={styles.hqCard} onPress={onPress}>
      <Animated.View style={[styles.hqCardImg, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }]}>
        <ExpoImage cachePolicy="memory" source={art} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top center" />
      </Animated.View>
      <LinearGradient colors={['transparent', 'rgba(3,5,14,0.94)']} style={styles.cardGrad} pointerEvents="none" />
      <View style={styles.hqCardLabel}>
        <Text style={[styles.hqCardTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.hqCardSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function HqPanel({ npc, onBack, npcImgH, bob, children }: { npc: (typeof NPCS)[keyof typeof NPCS]; onBack: () => void; npcImgH: number; bob: Animated.Value; children: React.ReactNode }) {
  const { height } = useWindowDimensions();
  return (
    <View style={styles.panelWrap}>
      <View style={styles.panelLeft}>
        <Animated.Image source={npc.art} style={{ width: '100%', height: npcImgH, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }} resizeMode="contain" />
        <Text style={[styles.npcName, { color: npc.accent }]}>{npc.name}</Text>
        <Text style={styles.npcRole}>{npc.role}</Text>
      </View>
      <View style={styles.panelRight}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
          {children}
        </ScrollView>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backTxt}>◂ BACK TO HQ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#04060f' },
  header: { position: 'absolute', top: 10, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  hqTitle: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 2 },
  hqSub: { color: '#9fd0ff', fontSize: 11, letterSpacing: 1, marginTop: 2 },
  credBox: { backgroundColor: 'rgba(10,14,28,0.85)', borderWidth: 1, borderColor: '#ffd34d', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  credTxt: { color: '#ffd34d', fontWeight: '900', fontSize: 14 },
  mainRow: { position: 'absolute', left: 16, right: 16, bottom: 30, top: 60, flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  hqCard: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: '#3a4160', backgroundColor: '#0a0e1e' },
  hqCardImg: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  cardGrad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%' },
  hqCardLabel: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  hqCardTitle: { fontWeight: '900', fontSize: 15, letterSpacing: 2 },
  hqCardSub: { color: '#c8d4f0', fontSize: 10.5, marginTop: 2 },
  deployBtn: { flex: 1.1, borderRadius: 12, borderWidth: 2, borderColor: '#4dff7a', backgroundColor: 'rgba(10,30,18,0.9)', justifyContent: 'center', alignItems: 'center', padding: 10 },
  deployTxt: { color: '#4dff7a', fontWeight: '900', fontSize: 15, letterSpacing: 1.5, textAlign: 'center' },
  deploySub: { color: '#b8f0c8', fontSize: 10.5, marginTop: 6, textAlign: 'center' },
  panelWrap: { position: 'absolute', left: 16, right: 16, top: 60, bottom: 30, flexDirection: 'row', gap: 14 },
  panelLeft: { width: '26%', alignItems: 'center', justifyContent: 'flex-end' },
  npcName: { fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  npcRole: { color: '#8fa0c8', fontSize: 10, letterSpacing: 2, marginTop: 2 },
  panelRight: { flex: 1, backgroundColor: 'rgba(8,12,26,0.88)', borderWidth: 1, borderColor: '#3a4160', borderRadius: 12, padding: 12 },
  panelTitle: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 2, marginBottom: 10 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1c2440' },
  shopName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  shopOwned: { color: '#ffd34d', fontWeight: '800' },
  shopDesc: { color: '#8fa0c8', fontSize: 10.5, marginTop: 2 },
  buyBtn: { backgroundColor: '#16324a', borderWidth: 1, borderColor: '#6fe0ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  buyTxt: { color: '#6fe0ff', fontWeight: '900', fontSize: 12 },
  unitRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pilotCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(12,15,26,0.85)', borderWidth: 1, borderColor: '#2a2f42', borderRadius: 10, padding: 10, marginBottom: 10 },
  pilotCardFace: { width: 60, height: 60, borderRadius: 10, borderWidth: 1, borderColor: '#3a4160' },
  pilotCardName: { color: '#ffd34d', fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  pilotCardSub: { color: '#9fb0d0', fontSize: 10, marginTop: 2 },
  unitChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#3a4160', borderRadius: 8, padding: 5, backgroundColor: '#0a0e1e', maxWidth: 130 },
  unitChipTxt: { color: '#fff', fontWeight: '700', fontSize: 10.5, flexShrink: 1 },
  lvlBarTrack: { flexDirection: 'row', gap: 3, marginTop: 6, flexWrap: 'wrap' },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  slotLbl: { color: '#8fa0c8', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  slotChip: { flex: 1, borderWidth: 1.5, borderColor: '#3a4160', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 8, backgroundColor: '#0a0e1e' },
  slotTxt: { color: '#ffd34d', fontSize: 10.5, fontWeight: '800' },
  pilotLine: { color: '#ff9fd0', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  lvlSeg: { width: 18, height: 6, borderRadius: 2, backgroundColor: '#1c2440' },
  wsTabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  wsTab: { flex: 1, borderWidth: 1, borderColor: '#3a4160', borderRadius: 7, paddingVertical: 6, alignItems: 'center', backgroundColor: '#0a0e1e' },
  wsTabOn: { borderColor: '#6fe0ff', backgroundColor: '#10202e' },
  wsTabTxt: { color: '#8fa0c8', fontWeight: '900', fontSize: 10.5, letterSpacing: 1.5 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#3a4160', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginTop: 8 },
  backTxt: { color: '#9fd0ff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  chatWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  chatNpc: { position: 'absolute', left: '6%', bottom: 0, width: 320 },
  chatBox: { position: 'absolute', left: '34%', right: '4%', bottom: 44, backgroundColor: 'rgba(8,12,26,0.92)', borderWidth: 1.5, borderColor: '#3a4160', borderRadius: 12, padding: 14 },
  chatName: { fontWeight: '900', fontSize: 12, letterSpacing: 1.5, marginBottom: 6 },
  chatTxt: { color: '#e8ecff', fontSize: 13.5, lineHeight: 20 },
  chatNext: { alignSelf: 'flex-end', marginTop: 8, backgroundColor: '#16324a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  chatNextTxt: { color: '#6fe0ff', fontWeight: '900', fontSize: 12 },
  backCorner: { position: 'absolute', top: 60, right: 16, backgroundColor: 'rgba(8,12,26,0.85)', borderWidth: 1, borderColor: '#3a4160', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  bondHint: { color: '#8fa0c8', fontSize: 10.5, marginBottom: 8 },
  bondRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#1c2440' },
  bondFaces: { flexDirection: 'row', alignItems: 'center' },
  bondFace: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#3a4160' },
  bondHeart: { color: '#ff9fd0', fontSize: 13, fontWeight: '900', marginHorizontal: 4 },
  codexRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1c2440' },
  codexThumb: { width: 58, height: 58, borderRadius: 8, borderWidth: 1, borderColor: '#3a4160' },
  codexWep: { color: '#c8b060', fontSize: 10, marginTop: 3 },
  codexSpirit: { color: '#b09ae8', fontSize: 10, marginTop: 2 },
  codexSide: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  recordBox: { backgroundColor: 'rgba(12,15,26,0.85)', borderWidth: 1, borderColor: '#2a2f42', borderRadius: 10, padding: 12, gap: 6 },
  recordRow: { color: '#c8d4f0', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6 },
  honorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(42,47,66,0.6)' },
  honorName: { color: '#ffd34d', fontSize: 11.5, fontWeight: '900', letterSpacing: 1 },
  honorDesc: { color: '#8fa0c8', fontSize: 10, marginTop: 1 },
  honorClaimed: { color: '#4dff7a', fontWeight: '900', fontSize: 9.5, letterSpacing: 1.5 },
  honorLocked: { color: '#5a6488', fontWeight: '900', fontSize: 9.5, letterSpacing: 1.5 },
  honorBtn: { backgroundColor: '#2a3a12', borderWidth: 1.5, borderColor: '#ffd34d', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5 },
  honorBtnTxt: { color: '#ffd34d', fontWeight: '900', fontSize: 10.5, letterSpacing: 1.5 },
});
