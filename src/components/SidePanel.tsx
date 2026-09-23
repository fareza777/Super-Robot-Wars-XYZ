import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { PILOT_ART } from '../assets';
import { ITEMS, PARTS } from '../game/campaign';
import { SPIRITS } from '../game/data';
import { bondMods } from '../game/bonds';
import { bestCounterWeapon, critChance, damageOf, dist, hitChance, key, terrainDesc, weaponsAgainst } from '../game/engine';
import { aliveEnemies, alivePlayers, useGame } from '../game/store';
import { SpiritId } from '../game/types';

function Bar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(0, (val / max) * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barVal}>
        {val}/{max}
      </Text>
    </View>
  );
}

function Btn({ label, sub, onPress, disabled, accent }: { label: string; sub?: string; onPress: () => void; disabled?: boolean; accent?: string }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.btn, disabled && styles.btnOff, accent ? { borderColor: accent } : null]}>
      <Text style={[styles.btnText, disabled && styles.btnTextOff]}>{label}</Text>
      {!!sub && <Text style={styles.btnSub}>{sub}</Text>}
    </TouchableOpacity>
  );
}

export function SidePanel() {
  const s = useGame();
  const unit = s.menuForUid ? s.units.find((u) => u.uid === s.menuForUid) : s.selectedUid ? s.units.find((u) => u.uid === s.selectedUid) : undefined;
  const spiritUnit = s.spiritForUid ? s.units.find((u) => u.uid === s.spiritForUid) : undefined;
  const inspect = s.inspectUid ? s.units.find((u) => u.uid === s.inspectUid) : undefined;
  const allActed = s.units.length > 0 && s.units.every((u) => u.side !== 'player' || !u.alive || u.acted);

  return (
    <View style={styles.panel}>
      <View style={styles.topBar}>
        <Text style={styles.phaseTxt}>{s.phase === 'enemy' ? 'ENEMY PHASE' : 'PLAYER PHASE'}</Text>
        <Text style={styles.turnTxt}>T{s.turn}</Text>
      </View>
      <Text style={styles.counts}>
        Ally {alivePlayers(s).length} · Enemy {aliveEnemies(s).length}
      </Text>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 6 }}>
        {unit && (
          <View style={styles.unitCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Image cachePolicy="memory" source={PILOT_ART[unit.def.id]} style={styles.face} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.unitName} numberOfLines={1}>
                  {unit.def.name}{unit.phase2 ? ' Ω' : ''}
                </Text>
                <Text style={styles.pilotName} numberOfLines={1}>
                  {unit.def.pilot.name} · Lv{unit.level}
                </Text>
              </View>
            </View>
            <Bar label="HP" val={unit.hp} max={unit.def.maxHp} color="#4dff7a" />
            <Bar label="EN" val={unit.en} max={unit.def.maxEn} color="#4db4ff" />
            <Bar label="SP" val={unit.sp} max={unit.def.pilot.maxSp} color="#ffb84d" />
            <Bar label="WILL" val={unit.will} max={150} color="#ff7a9d" />
            <Bar label="EXP" val={unit.exp} max={100} color="#c9a0ff" />
            <Text style={styles.killsLine}>KILLS {unit.kills} · WILL {unit.will > 100 ? `+${unit.will - 100}% spirit` : 'calm'}</Text>
            {!!unit.parts?.length && (
              <Text style={styles.killsLine} numberOfLines={1}>
                PARTS {unit.parts.map((p) => PARTS[p]?.name ?? p).join(' + ')}
              </Text>
            )}
            <Text style={styles.terrainLine}>{terrainDesc(s.map, unit.pos)}</Text>
          </View>
        )}

        {/* weapon pick while menu open — hidden while the spirit submenu is up */}
        {s.menuForUid && !s.pendingWeapon && !spiritUnit && unit && (
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>ACTION</Text>
            {unit.def.weapons.map((w) => {
              const ammoLeft = w.ammo != null ? unit.ammo[w.id] ?? 0 : null;
              const noEn = unit.en < w.enCost;
              const noAmmo = ammoLeft != null && ammoLeft <= 0;
              const noPost = !w.postMove && s.pendingMovedFlag;
              const noWill = (w.willReq ?? 0) > unit.will;
              const partner = w.comboPartner ? s.units.find((p) => p.def.id === w.comboPartner && p.side === 'player' && p.alive) : undefined;
              const partnerHere = w.comboPartner ? partner && dist(partner.pos, unit.pos) === 1 && !partner.acted : true;
              const hitsAny =
                w.mapRange != null
                  ? true // any tile in range is aim-able; the blast may still catch foes
                  : s.units.some((e) => e.alive && e.side === 'enemy' && weaponsAgainst(unit, s.pendingMove!, e, s.pendingMovedFlag).some((x) => x.id === w.id));
              const disabled = noEn || noAmmo || noPost || noWill || !hitsAny || !partnerHere;
              const reason =
                noEn
                  ? 'NEED EN'
                  : noAmmo
                    ? 'NO AMMO'
                    : noPost
                      ? 'CAN\'T AFTER MOVE'
                      : noWill
                        ? `NEED WILL ${w.willReq}`
                        : !hitsAny
                          ? 'NO TARGET'
                          : w.comboPartner
                            ? !partner
                              ? 'PARTNER MISSING'
                              : partner.acted
                                ? 'PARTNER ACTED'
                                : 'PARTNER NOT ADJACENT'
                            : null;
              const stat = `POW ${w.power} · R${w.rangeMin}-${w.rangeMax}${w.mapRange != null ? ` · AREA ${w.mapRange}` : ''}${w.willReq ? ` · W${w.willReq}` : ''}${w.ammo != null ? ` · ×${ammoLeft}` : ` · EN ${w.enCost}`}`;
              return (
                <Btn
                  key={w.id}
                  label={`⚔ ${w.name}${reason ? ` · ${reason}` : ''}`}
                  sub={stat}
                  accent={hitsAny && !disabled ? '#ff6b6b' : undefined}
                  disabled={disabled}
                  onPress={() => s.chooseWeapon(w)}
                />
              );
            })}
            {unit.def.repairer &&
              s.units.some((t) => t.alive && t.side === 'player' && t.uid !== unit.uid && dist(t.pos, unit.pos) <= 2 && (t.hp < t.def.maxHp || t.en < t.def.maxEn)) && (
                <>
                  <Text style={styles.menuTitle}>REPAIR</Text>
                  {s.units
                    .filter((t) => t.alive && t.side === 'player' && t.uid !== unit.uid && dist(t.pos, unit.pos) <= 2 && (t.hp < t.def.maxHp || t.en < t.def.maxEn))
                    .map((t) => (
                      <Btn key={t.uid} label={`✚ ${t.def.name}`} sub={`HP ${t.hp}/${t.def.maxHp} · EN ${t.en}/${t.def.maxEn} — heal 40% HP +30 EN`} onPress={() => s.repairUnit(unit.uid, t.uid)} accent="#4dff9d" />
                    ))}
                </>
              )}
            {unit.def.pilot.spirits.length > 0 && <Btn label="✦ SPIRIT COMMANDS" sub={`SP ${unit.sp}`} onPress={() => s.openSpirits(unit.uid)} accent="#c9a0ff" />}
            {Object.values(ITEMS).some((it) => (s.inventory[it.id] ?? 0) > 0) && (
              <>
                <Text style={styles.menuTitle}>ITEMS</Text>
                {Object.values(ITEMS).map((it) => {
                  const n = s.inventory[it.id] ?? 0;
                  return <Btn key={it.id} label={`▣ ${it.name} ×${n}`} sub={it.desc} disabled={n <= 0} onPress={() => s.useItem(unit.uid, it.id)} accent="#7ee0a0" />;
                })}
              </>
            )}
            <Btn label="WAIT" onPress={s.waitUnit} />
            <Btn label="CANCEL" onPress={s.cancel} accent="#666" />
          </View>
        )}

        {s.pendingWeapon && unit && s.pendingMove && (
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>
              {s.pendingWeapon.name} · POW {s.pendingWeapon.power}
            </Text>
            {s.pendingWeapon.mapRange != null ? (
              <Text style={styles.hint}>AREA WEAPON — tap a highlighted tile to drop the blast (hits every unit in radius {s.pendingWeapon.mapRange}, allies included!)</Text>
            ) : (
              <>
                <Text style={styles.hint}>Pick a target — or tap one on the map</Text>
                {s.units
                  .filter((e) => e.alive && e.side === 'enemy' && s.attackTiles.has(key(e.pos)))
                  .map((e) => {
                    const bm = bondMods(s.bonds, s.units, unit);
                    const hc = hitChance(unit, e, s.pendingWeapon!, s.map, bm.hitBonus);
                    const dmg = damageOf(unit, e, s.pendingWeapon!, s.map, false, bm.dmgMult);
                    const kill = e.hp - dmg <= 0;
                    const cw = bestCounterWeapon(e, s.pendingMove!);
                    const cDmg = cw ? damageOf(e, unit, cw, s.map, false) : 0;
                    const cHc = cw ? hitChance(e, unit, cw, s.map) : 0;
                    return (
                      <TouchableOpacity key={e.uid} onPress={() => s.chooseTarget(e.uid)} style={[styles.tgtRow, kill && styles.tgtRowKill]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tgtName} numberOfLines={1}>
                            {e.def.name} {e.def.boss ? (e.phase2 ? 'Ω★' : '★') : ''}
                          </Text>
                          <Text style={styles.tgtHp}>
                            HP {e.hp}/{e.def.maxHp} · WILL {e.will}
                          </Text>
                          {/* SRW damage preview — green = HP remaining after the hit */}
                          <View style={styles.tgtBar}>
                            <View style={[styles.tgtBarFill, { width: `${(e.hp / e.def.maxHp) * 100}%`, backgroundColor: '#ff5a5a' }]} />
                            <View style={[styles.tgtBarFill, { width: `${(Math.max(0, e.hp - dmg) / e.def.maxHp) * 100}%`, backgroundColor: '#4dff7a' }]} />
                          </View>
                          <Text style={styles.tgtCnt} numberOfLines={1}>
                            {cw ? `↩ CNT ~${cDmg} (${cHc}%)` : '↩ no counter in range'} · CRIT {critChance(unit, e)}%
                          </Text>
                        </View>
                        <View style={styles.tgtHitBox}>
                          <Text style={[styles.tgtHit, hc >= 80 ? { color: '#4dff7a' } : hc >= 55 ? { color: '#ffd34d' } : { color: '#ff8a5a' }]}>{hc}%</Text>
                          <Text style={styles.tgtDmg}>{kill ? 'DESTROY' : `~${dmg}`}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </>
            )}
            <Btn label="BACK" onPress={() => useGame.setState({ pendingWeapon: null, attackTiles: new Set() })} accent="#666" />
          </View>
        )}

        {spiritUnit && (
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>SPIRIT · SP {spiritUnit.sp}</Text>
            {spiritUnit.def.pilot.spirits.map((id: SpiritId) => {
              const sp = SPIRITS[id];
              return (
                <Btn key={id} label={`✦ ${sp.name} · ${sp.cost} SP`} sub={sp.desc} disabled={spiritUnit.sp < sp.cost} onPress={() => s.castSpirit(spiritUnit.uid, id)} accent="#c9a0ff" />
              );
            })}
            <Btn label="BACK" onPress={() => useGame.setState({ spiritForUid: null })} accent="#666" />
          </View>
        )}

        {/* enemy inspect card — shown after tapping a foe */}
        {inspect && !s.menuForUid && !s.pendingWeapon && (
          <View style={[styles.unitCard, styles.inspectCard]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Image cachePolicy="memory" source={PILOT_ART[inspect.def.id]} style={[styles.face, { borderColor: '#ff6b6b' }]} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.unitName} numberOfLines={1}>
                  {inspect.def.name} {inspect.def.boss ? (inspect.phase2 ? 'Ω★' : '★') : ''}
                </Text>
                <Text style={styles.pilotName} numberOfLines={1}>
                  {inspect.def.pilot.name} · Lv{inspect.level}
                </Text>
              </View>
            </View>
            <Bar label="HP" val={inspect.hp} max={inspect.def.maxHp} color="#ff5a5a" />
            <Bar label="EN" val={inspect.en} max={inspect.def.maxEn} color="#4db4ff" />
            <Bar label="WILL" val={inspect.will} max={150} color="#ff7a9d" />
            <View style={styles.statRow}>
              <Text style={styles.statTxt}>ARM {inspect.def.armor}</Text>
              <Text style={styles.statTxt}>MOB {inspect.def.mobility}</Text>
              <Text style={styles.statTxt}>MOV {inspect.def.moveRange}</Text>
            </View>
            {inspect.def.weapons.map((w) => (
              <Text key={w.id} style={styles.weapLine} numberOfLines={1}>
                ⚔ {w.name} · POW {w.power} · R{w.rangeMin}-{w.rangeMax}
                {w.mapRange != null ? ` · AREA ${w.mapRange}` : ''}
                {w.willReq ? ` · W${w.willReq}` : ''}
                {w.ammo != null ? ` · ×${inspect.ammo[w.id] ?? 0}` : ` · EN ${w.enCost}`}
              </Text>
            ))}
            <Text style={styles.terrainLine}>{terrainDesc(s.map, inspect.pos)}</Text>
            <Text style={styles.threatNote}>Orange = its move + weapon range</Text>
            <Btn label="CLOSE" onPress={s.clearInspect} accent="#666" />
          </View>
        )}

        {!s.menuForUid && !s.pendingWeapon && !s.spiritForUid && !inspect && (
          <View style={styles.logBox}>
            {s.log.map((l, i) => (
              <Text key={i} style={styles.logLine}>
                {l}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {s.phase === 'player' && !s.enemyBusy && (
        <View>
          <TouchableOpacity onPress={s.endTurn} style={[styles.endTurn, allActed && styles.endTurnReady]}>
            <Text style={styles.endTurnTxt}>{allActed ? 'END TURN ▸ ALL UNITS ACTED' : 'END TURN ▸'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={s.retreatMission} style={styles.retreat}>
            <Text style={styles.retreatTxt}>◂ RETREAT MISSION</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 236, backgroundColor: '#12141c', borderLeftWidth: 1, borderLeftColor: '#2a2f42', padding: 7, paddingBottom: 30 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  phaseTxt: { color: '#ffd34d', fontWeight: '800', fontSize: 11.5, letterSpacing: 1 },
  turnTxt: { color: '#9fb0d0', fontWeight: '700', fontSize: 11.5 },
  counts: { color: '#6b7694', fontSize: 9.5, marginTop: 1 },
  body: { flex: 1, marginTop: 6 },
  unitCard: { backgroundColor: '#1a1e2c', borderRadius: 8, padding: 7 },
  face: { width: 40, height: 40, borderRadius: 7, borderWidth: 1, borderColor: '#3a4160' },
  unitName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  pilotName: { color: '#8fa1c7', fontSize: 9.5 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 5 },
  barLabel: { color: '#9fb0d0', fontSize: 8.5, width: 22, fontWeight: '700' },
  barTrack: { flex: 1, height: 5, backgroundColor: '#0a0c12', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  barVal: { color: '#9fb0d0', fontSize: 8.5, width: 58, textAlign: 'right' },
  menu: { marginTop: 7, gap: 5 },
  menuTitle: { color: '#ffd34d', fontSize: 10.5, fontWeight: '800', letterSpacing: 1, marginBottom: 1 },
  hint: { color: '#8fa1c7', fontSize: 9.5 },
  btn: { borderWidth: 1, borderColor: '#3a4160', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 7, backgroundColor: '#1c2133' },
  btnOff: { opacity: 0.38 },
  btnText: { color: '#e6ecff', fontSize: 10.5, fontWeight: '700' },
  btnTextOff: { color: '#666f8c' },
  btnSub: { color: '#7f8db0', fontSize: 8.5, marginTop: 1 },
  tgtRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ff6b6b', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 7, backgroundColor: '#221622', gap: 6 },
  tgtRowKill: { borderColor: '#ffd34d', backgroundColor: '#2a2214' },
  tgtName: { color: '#ffe2e2', fontSize: 10.5, fontWeight: '800' },
  tgtHp: { color: '#8fa1c7', fontSize: 8.5, marginTop: 1 },
  tgtBar: { height: 5, borderRadius: 3, backgroundColor: '#1a2036', marginTop: 4, overflow: 'hidden', position: 'relative' },
  tgtBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  tgtHitBox: { alignItems: 'flex-end' },
  tgtHit: { fontSize: 15, fontWeight: '900' },
  tgtDmg: { color: '#9fb0d0', fontSize: 8.5, fontWeight: '700' },
  logBox: { marginTop: 7, backgroundColor: '#0c0e16', borderRadius: 6, padding: 6, minHeight: 60 },
  logLine: { color: '#9fb0d0', fontSize: 9, marginBottom: 2 },
  endTurn: { marginTop: 6, borderWidth: 1, borderColor: '#ffd34d', borderRadius: 6, paddingVertical: 7, alignItems: 'center', backgroundColor: '#26251a' },
  endTurnReady: { borderWidth: 2, backgroundColor: 'rgba(255,211,77,0.22)' },
  endTurnTxt: { color: '#ffd34d', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  retreat: { marginTop: 4, borderWidth: 1, borderColor: '#3a4160', borderRadius: 6, paddingVertical: 4, alignItems: 'center', backgroundColor: '#14171f' },
  retreatTxt: { color: '#8fa1c7', fontWeight: '800', fontSize: 9, letterSpacing: 1 },
  terrainLine: { color: '#7fd4a8', fontSize: 8.5, marginTop: 4, fontWeight: '700' },
  killsLine: { color: '#ff9dbb', fontSize: 8.5, marginTop: 3, fontWeight: '700' },
  tgtCnt: { color: '#ff9d8a', fontSize: 8.5, marginTop: 1, fontWeight: '700' },
  inspectCard: { borderWidth: 1, borderColor: '#ff6b6b' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  statTxt: { color: '#c9a0ff', fontSize: 9, fontWeight: '700' },
  weapLine: { color: '#b8c4e0', fontSize: 9, marginTop: 3 },
  threatNote: { color: '#ff9632', fontSize: 8.5, marginTop: 6, marginBottom: 4 },
});
