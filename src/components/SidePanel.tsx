import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { PILOT_ART } from '../assets';
import { ALL_UNITS, ITEMS, PARTS } from '../game/campaign';
import { SPIRITS, TERRAIN_INFO, TRAITS } from '../game/data';
import { bondMods } from '../game/bonds';
import { bestCounterWeapon, critChance, damageOf, dist, formationBonus, hasPincer, hitChance, key, rallyBonus, spiritCost, terrainAt, terrainDesc, weaponsAgainst } from '../game/engine';
import { aliveEnemies, alivePlayers, fogLit, useGame } from '../game/store';
import { SpiritId, UnitState } from '../game/types';

/** active spirit flags on a unit, as display names */
function buffNames(u: UnitState): string[] {
  const names: string[] = [];
  if (u.flashUntilEndOfEnemyPhase) names.push('FLASH');
  if (u.gritUntilEndOfEnemyPhase) names.push('GRIT');
  if (u.guardUntilEndOfEnemyPhase) names.push('GUARD');
  if (u.focusUntilEndOfEnemyPhase) names.push('FOCUS');
  if (u.strikeForNextAttack) names.push('STRIKE');
  if (u.valorForNextAttack) names.push('VALOR');
  if (u.soulForNextAttack) names.push('SOUL');
  if (u.empowerForNextAttack) names.push('EMPOWER');
  if (u.marksmanUntilEndOfEnemyPhase) names.push('MARKSMAN');
  if (u.wardenArmed) names.push('WARD');
  if (u.warsongUntilEndOfEnemyPhase) names.push('WARSONG');
  if (u.executeNext) names.push('EXEC');
  if (u.shatterNext) names.push('SHATTER');
  if (u.glacialNext) names.push('GLACIAL');
  if (u.soulburnNext) names.push('SOULBURN');
  if (u.snipeForNextAttack) names.push('SNIPE');
  if (u.deadshotForNextAttack) names.push('\u2620DEADSHOT');
  if (u.frenzyThisTurn) names.push('\U0001F525FRENZY');
  if (u.breachNextAttack) names.push('\u26CFBREACH');
  if (u.relentlessUntilEndOfEnemyPhase) names.push('\U0001FA78RELENT');
  if (u.charged) names.push('\u26A1CHRG');
  if (u.aimed) names.push('\u25CEAIM');
  if (u.enraged) names.push('\U0001F525ENRAGED');
  if (u.fortuneForNextAttack) names.push('FORTUNE');
  if (u.accelThisTurn) names.push('ACCEL');
  if (u.miracleArmed) names.push('MIRACLE');
  if (u.luckyForNextKill) names.push('☘LUCKY');
  if (u.againOnKill) names.push('⚡OVRDRV');
  if (u.mercyArmed) names.push('🕊MERCY');
  if (u.crippled) names.push('⛓CRIPPLED');
  if (u.wounded) names.push('🩹WOUNDED');
  if (u.sundered) names.push('⭗SUNDERED');
  if (u.hymnUntilEndOfEnemyPhase) names.push('\u266AHYMN');
  if (u.def.jammer) names.push('📡JAMMER');
  if (u.baseDefId && u.def.id !== u.baseDefId) names.push('⇄ALT-FORM');
  return names;
}

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
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.btn, disabled && styles.btnOff, accent ? { borderColor: accent, borderLeftWidth: 4 } : null, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}>
      <Text style={[styles.btnText, disabled && styles.btnTextOff]}>{label}</Text>
      {!!sub && <Text style={styles.btnSub}>{sub}</Text>}
    </Pressable>
  );
}

export function SidePanel() {
  const s = useGame();
  const unit = s.menuForUid ? s.units.find((u) => u.uid === s.menuForUid) : s.selectedUid ? s.units.find((u) => u.uid === s.selectedUid) : undefined;
  const spiritUnit = s.spiritForUid ? s.units.find((u) => u.uid === s.spiritForUid) : undefined;
  const inspect = s.inspectUid ? s.units.find((u) => u.uid === s.inspectUid) : undefined;
  const allActed = s.units.length > 0 && s.units.every((u) => u.side !== 'player' || !u.alive || u.acted || u.npc);
  const [showRoster, setShowRoster] = React.useState(false);
  const objType = s.missionCh.objectiveType ?? 'rout';
  const unitOnBeacon = !!s.missionCh.seizePos && s.units.some((u) => u.side === 'player' && u.alive && u.pos.x === s.missionCh.seizePos!.x && u.pos.y === s.missionCh.seizePos!.y);
  const unitOnReach = !!s.missionCh.reachPos && s.units.some((u) => u.side === 'player' && u.alive && u.pos.x === s.missionCh.reachPos!.x && u.pos.y === s.missionCh.reachPos!.y);
  const npcU = s.units.find((u) => u.escort && u.alive);
  const bossU = s.units.find((u) => u.side === 'enemy' && u.def.boss && u.alive);

  return (
    <View style={styles.panel}>
      <View style={styles.topBar}>
        <Text style={styles.phaseTxt}>{s.phase === 'enemy' ? 'ENEMY PHASE' : 'PLAYER PHASE'}</Text>
        <Text style={styles.turnTxt}>T{s.turn}</Text>
      </View>
      {s.blizzard ? <Text style={styles.blizzChip}>{s.missionCh.theme === 'desert' ? '🏜 SANDSTORM — ground units -15% hit' : s.missionCh.theme === 'ruins' ? '🌫 ASH STORM — ground units -15% hit' : '❄ BLIZZARD — ground units -15% hit'}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => setShowRoster((v) => !v)} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.7 }]}>
          <Text style={styles.counts}>
            Ally {alivePlayers(s).length} · Enemy {s.missionCh.fog ? `${aliveEnemies(s).filter((e) => fogLit(s.units, e.pos)).length}/${aliveEnemies(s).length}` : aliveEnemies(s).length} · ☠{s.kills}  {showRoster ? '▲' : '▼'}
          </Text>
        </Pressable>
        <Pressable onPress={s.toggleDanger} style={({ pressed }) => [styles.dangerBtn, s.dangerZone && styles.dangerBtnOn, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.dangerTxt, s.dangerZone && { color: '#ff8080' }]}>⚠ DANGER</Text>
        </Pressable>
      </View>
      {objType === 'protect' && npcU && (
        <View style={styles.objCard}>
          <Text style={styles.objTxt}>🛡 PROTECT CONVOY · T{s.turn}/{s.missionCh.protectTurns ?? 8}</Text>
          <Bar label="CVY" val={npcU.hp} max={npcU.def.maxHp} color="#7dff9d" />
        </View>
      )}
      {objType === 'survive' && (
        <View style={styles.objCard}>
          <Text style={styles.objTxt}>⏱ HOLD OUT · T{s.turn}/{s.missionCh.surviveTurns ?? 8}</Text>
        </View>
      )}
      {objType === 'boss' && bossU && (
        <View style={styles.objCard}>
          <Text style={styles.objTxt} numberOfLines={1}>★ DEFEAT {bossU.def.name}</Text>
          <Bar label="BOSS" val={bossU.hp} max={bossU.def.maxHp} color="#ff5a5a" />
        </View>
      )}
      {objType === 'seize' && (
        <View style={styles.objCard}>
          <Text style={styles.objTxt}>⌖ SEIZE THE BEACON{unitOnBeacon ? ' — SECURED!' : ` · (${s.missionCh.seizePos?.x},${s.missionCh.seizePos?.y})`}</Text>
        </View>
      )}
      {objType === 'hunt' && (
        <View style={styles.objCard}>
          {(() => {
            const prey = s.units.find((u) => u.def.id === s.missionCh.huntId);
            if (prey?.alive) return (
              <>
                <Text style={[styles.objTxt, { color: '#ffb060' }]}>☠ HUNT: {prey.def.name.toUpperCase()} · ({prey.pos.x},{prey.pos.y})</Text>
                <Bar label="TARGET" val={prey.hp} max={prey.def.maxHp} color="#ff8a5c" />
              </>
            );
            return <Text style={[styles.objTxt, { color: '#7dff9d' }]}>☠ TARGET ELIMINATED</Text>;
          })()}
        </View>
      )}
      {objType === 'reach' && (
        <View style={styles.objCard}>
          <Text style={styles.objTxt}>➤ REACH THE EXTRACTION POINT{unitOnReach ? ' — THERE!' : ` · (${s.missionCh.reachPos?.x},${s.missionCh.reachPos?.y})`}</Text>
        </View>
      )}
      {!!s.missionCh.carrier && (
        <View style={styles.objCard}>
          {(() => {
            const mule = s.units.find((u) => u.def.carrier);
            const escorting = s.missionCh.objectiveType === 'escort';
            if (mule?.alive) return (
              <>
                <Text style={[styles.objTxt, { color: escorting ? '#7dc9ff' : '#ffe8a0' }]}>
                  {escorting ? `🛡 ESCORT THE MULE EAST · (${mule.pos.x},${mule.pos.y}) — edge at x${s.map.cols - 1}` : `💰 HUNT THE SUPPLY MULE · (${mule.pos.x},${mule.pos.y})`}
                </Text>
                <Bar label="MULE" val={mule.hp} max={mule.def.maxHp} color={escorting ? '#7dc9ff' : '#ffe8a0'} />
              </>
            );
            const escaped = !!mule && mule.pos.x >= s.map.cols - 1;
            const delivered = escorting && !!mule && !mule.alive && mule.pos.x >= s.map.cols - 1;
            if (escorting) return <Text style={[styles.objTxt, { color: delivered ? '#7dff9d' : '#ff8a5c' }]}>{delivered ? '🛡 CARGO DELIVERED' : '💔 MULE LOST — the cargo is gone'}</Text>;
            return <Text style={[styles.objTxt, { color: escaped ? '#ff8a5c' : '#7dff9d' }]}>{escaped ? '🏃 CARRIER ESCAPED' : '💰 CARRIER DOWN — cargo secured'}</Text>;
          })()}
        </View>
      )}
      {!!s.missionCh.requiredDefId && s.units.some((u) => u.side === 'player' && u.def.id === s.missionCh.requiredDefId) && (
        <View style={styles.objCard}>
          <Text style={[styles.objTxt, { color: '#ff8a5c' }]}>⚠ {ALL_UNITS[s.missionCh.requiredDefId]?.name.toUpperCase() ?? 'HERO'} MUST SURVIVE</Text>
        </View>
      )}
      {s.missionCh.sim && (
        <View style={styles.objCard}>
          <Text style={[styles.objTxt, { color: '#c8a8ff' }]}>
            ▲ VR WAVE {s.simWave} · SCORE {s.kills * 50 + (s.simWave - 1) * 150} PTS
          </Text>
        </View>
      )}
      {!!s.missionCh.turnLimit && objType !== 'survive' && objType !== 'protect' && !s.missionCh.sim && (
        <View style={styles.objCard}>
          <Text style={[styles.objTxt, s.turn >= (s.missionCh.turnLimit ?? 99) - 1 && { color: '#ff8080' }]}>
            ⌛ {objType === 'escort' ? 'DELIVER' : 'ROUT'} BY TURN {s.missionCh.turnLimit} · {Math.max(0, (s.missionCh.turnLimit ?? 0) - s.turn + 1)} LEFT
          </Text>
        </View>
      )}

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
            {unit.def.pilot.trait && (
              <Text style={styles.traitLine} numberOfLines={1}>
                ◆ {TRAITS[unit.def.pilot.trait].name} — {TRAITS[unit.def.pilot.trait].desc}
              </Text>
            )}
            {buffNames(unit).length > 0 && (
              <Text style={[styles.traitLine, { color: '#7de0ff' }]} numberOfLines={1}>
                ✦ STATUS: {buffNames(unit).join(' · ')}
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
              const noAce = w.aceReq != null && unit.kills < w.aceReq;
              const partner = w.comboPartner ? s.units.find((p) => p.def.id === w.comboPartner && p.side === 'player' && p.alive) : undefined;
              const partnerHere = w.comboPartner ? partner && dist(partner.pos, unit.pos) === 1 && !partner.acted : true;
              const hitsAny =
                w.mapRange != null
                  ? true // any tile in range is aim-able; the blast may still catch foes
                  : s.units.some((e) => e.alive && e.side === 'enemy' && weaponsAgainst(unit, s.pendingMove!, e, s.pendingMovedFlag).some((x) => x.id === w.id));
              const disabled = noEn || noAmmo || noPost || noWill || noAce || !hitsAny || !partnerHere;
              const reason =
                noEn
                  ? 'NEED EN'
                  : noAmmo
                    ? 'NO AMMO'
                    : noPost
                      ? 'CAN\'T AFTER MOVE'
                      : noWill
                        ? `NEED WILL ${w.willReq}`
                        : noAce
                          ? `SEALED · ${w.aceReq} KILLS`
                        : !hitsAny
                          ? 'NO TARGET'
                          : w.comboPartner
                            ? !partner
                              ? 'PARTNER MISSING'
                              : partner.acted
                                ? 'PARTNER ACTED'
                                : 'PARTNER NOT ADJACENT'
                            : null;
              const stat = `POW ${w.power} · R${w.rangeMin}-${w.rangeMax}${w.mapRange != null ? ` · AREA ${w.mapRange}` : ''}${w.willReq ? ` · W${w.willReq}` : ''}${w.ammo != null ? ` · ×${ammoLeft}` : ` · EN ${w.enCost}`}${w.critMod ? ` · CRIT+${w.critMod}` : ''}${w.pierce ? ' · ◆PIERCE' : ''}${w.drain ? ' · ✚DRAIN' : ''}${w.antiAir ? ' · ☄AA' : ''}${w.sniper ? ' · ⌖SNIPER' : ''}{w.breaker ? ' · ⛏BREAK' : ''}${w.chain ? ' · ⚡CHAIN' : ''}${w.knockback ? ' \u00B7 \U0001F4A5PUSH' : ''}`;
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
            {unit.def.supplier &&
              s.units.some((t) => t.alive && t.side === 'player' && t.uid !== unit.uid && dist(t.pos, unit.pos) <= 3 && (t.en < t.def.maxEn || t.def.weapons.some((w) => w.ammo != null && (t.ammo[w.id] ?? 0) < w.ammo))) && (
                <>
                  <Text style={styles.menuTitle}>RESUPPLY</Text>
                  {s.units
                    .filter((t) => t.alive && t.side === 'player' && t.uid !== unit.uid && dist(t.pos, unit.pos) <= 3 && (t.en < t.def.maxEn || t.def.weapons.some((w) => w.ammo != null && (t.ammo[w.id] ?? 0) < w.ammo)))
                    .map((t) => (
                      <Btn key={t.uid} label={`▤ ${t.def.name}`} sub={`EN ${t.en}/${t.def.maxEn} — +50 EN & full ammo restock (range 3)`} onPress={() => s.supplyUnit(unit.uid, t.uid)} accent="#7ec8ff" />
                    ))}
                </>
              )}
            {s.units.some((t) => t.alive && t.side === 'enemy' && !t.def.boss && t.hp <= t.def.maxHp * 0.25 && dist(t.pos, unit.pos) <= 1) && (
              <>
                <Text style={styles.menuTitle}>CAPTURE</Text>
                {s.units
                  .filter((t) => t.alive && t.side === 'enemy' && !t.def.boss && t.hp <= t.def.maxHp * 0.25 && dist(t.pos, unit.pos) <= 1)
                  .map((t) => (
                    <Btn
                      key={t.uid}
                      label={`⛓ ${t.def.name}`}
                      sub={`crippled ${t.hp}/${t.def.maxHp} HP — crews secure the frame: +${60 * t.level + (t.elite ? 200 : 0)}cr + item chance`}
                      onPress={() => s.captureUnit(unit.uid, t.uid)}
                      accent="#ffd34d"
                    />
                  ))}
              </>
            )}
            {unit.def.pilot.spirits.length + (unit.bonusSpirits?.length ?? 0) > 0 && <Btn label="✦ SPIRIT COMMANDS" sub={`SP ${unit.sp}`} onPress={() => s.openSpirits(unit.uid)} accent="#c9a0ff" />}
            {Object.values(ITEMS).some((it) => (s.inventory[it.id] ?? 0) > 0) && (
              <>
                <Text style={styles.menuTitle}>ITEMS</Text>
                {Object.values(ITEMS).map((it) => {
                  const n = s.inventory[it.id] ?? 0;
                  return <Btn key={it.id} label={`▣ ${it.name} ×${n}`} sub={it.desc} disabled={n <= 0} onPress={() => s.useItem(unit.uid, it.id)} accent="#7ee0a0" />;
                })}
              </>
            )}
            {unit.altDef && !unit.moved && !unit.acted && (
              <Btn
                label={`⇄ TRANSFORM — ${unit.altDef.name}`}
                sub={`swap frames: move ${unit.def.moveRange}→${unit.altDef.moveRange} · armor ${unit.def.armor}→${unit.altDef.armor}${unit.altDef.moveType === 'air' ? ' · AIR' : ''}`}
                onPress={() => s.transformUnit(unit.uid)}
                accent="#7ec8ff"
              />
            )}
            <Btn label="\u25CF OVRWATCH" sub="hold — auto-fire on first foe in range" onPress={s.overwatchUnit} accent="#7ec8ff" />
            <Btn label="\u26A1 CHARGE" sub="channel core — next strike \u00D71.5 dmg, +15 crit" onPress={s.chargeUnit} accent="#ffb84d" />
            <Btn label="\u25CE AIM" sub="steady sensors — next attack +15 hit" onPress={s.aimUnit} accent="#8ef0e8" />
            {s.units.some((a2) => a2.alive && a2.side === 'player' && !a2.npc && a2.uid !== unit.uid && !a2.acted && dist(a2.pos, unit.pos) === 1) && (
              <Btn label="⇄ SWAP" sub="trade positions with an adjacent ally" onPress={s.swapUnit} accent="#9fd0ff" />
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
              <>
                <Text style={styles.hint}>
                  {s.mapAim ? `BLAST ZONE AIMED — (${s.mapAim.x},${s.mapAim.y}) · radius ${s.pendingWeapon.mapRange}` : `AREA WEAPON — tap a highlighted tile to aim the blast (radius ${s.pendingWeapon.mapRange}, allies included!)`}
                </Text>
                {s.mapAim &&
                  s.units
                    .filter((e) => e.alive && e.uid !== unit.uid && dist(e.pos, s.mapAim!) <= (s.pendingWeapon!.mapRange ?? 0))
                    .map((e) => (
                      <View key={e.uid} style={[styles.tgtRow, e.side === 'player' && { borderColor: '#ff9a4d' }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tgtName} numberOfLines={1}>
                            {e.side === 'player' ? '⚠ ALLY — ' : ''}
                            {e.def.name} {e.def.boss ? (e.phase2 ? 'Ω★' : '★') : ''}
                          </Text>
                          <Text style={styles.tgtHp}>
                            HP {e.hp}/{e.def.maxHp} · WILL {e.will}
                          </Text>
                        </View>
                        <View style={styles.tgtHitBox}>
                          <Text style={[styles.tgtHit, { color: '#ffd34d' }]}>{hitChance(unit, e, s.pendingWeapon!, s.map)}%</Text>
                          <Text style={styles.tgtDmg}>~{damageOf(unit, e, s.pendingWeapon!, s.map, false)}</Text>
                        </View>
                      </View>
                    ))}
                {s.mapAim && (
                  <Btn label="FIRE ▸" sub="Commit the blast — every unit in the zone takes the hit" onPress={() => s.chooseMapTile(s.mapAim!)} accent="#ff9a4d" />
                )}
                {s.mapAim && <Text style={styles.hint}>…or tap another tile to re-aim</Text>}
              </>
            ) : (
              <>
                <Text style={styles.hint}>Pick a target — or tap one on the map</Text>
                {s.units
                  .filter((e) => e.alive && e.side === 'enemy' && s.attackTiles.has(key(e.pos)))
                  .map((e) => {
                    const bm = bondMods(s.bonds, s.units, unit);
                    const fb = formationBonus(s.units, unit);
                    const pin = hasPincer(s.units, unit, e);
                    const hc = hitChance(unit, e, s.pendingWeapon!, s.map, bm.hitBonus + rallyBonus(s.units, unit) + fb + (s.blizzard && unit.def.moveType !== 'air' ? -15 : 0));
                    const dmg = damageOf(unit, e, s.pendingWeapon!, s.map, false, bm.dmgMult * (pin ? 1.1 : 1));
                    const kill = e.hp - dmg <= 0;
                    const cw = bestCounterWeapon(e, s.pendingMove!);
                    const cDmg = cw ? damageOf(e, unit, cw, s.map, false) : 0;
                    const cHc = cw ? hitChance(e, unit, cw, s.map, s.blizzard && e.def.moveType !== 'air' ? -15 : 0) : 0;
                    return (
                      <Pressable key={e.uid} onPress={() => s.chooseTarget(e.uid)} style={({ pressed }) => [styles.tgtRow, kill && styles.tgtRowKill, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}>
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
                            {cw ? `↩ CNT ~${cDmg} (${cHc}%)` : '↩ no counter in range'} · CRIT {critChance(unit, e)}%{fb > 0 ? ` · ▣FORM +${fb}` : ''}{pin ? ' · ⇄PIN +10%' : ''}
                            {(e.def.resists?.[s.pendingWeapon!.kind] ?? 0) > 0 ? ` · 🛡RES −${Math.round((e.def.resists![s.pendingWeapon!.kind] ?? 0) * 100)}%` : ''}
                          </Text>
                        </View>
                        <View style={styles.tgtHitBox}>
                          <Text style={[styles.tgtHit, hc >= 80 ? { color: '#4dff7a' } : hc >= 55 ? { color: '#ffd34d' } : { color: '#ff8a5a' }]}>{hc}%</Text>
                          <Text style={styles.tgtDmg}>{kill ? 'DESTROY' : `~${dmg}`}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
              </>
            )}
            <Btn label="BACK" onPress={() => useGame.setState({ pendingWeapon: null, attackTiles: new Set(), mapAim: null })} accent="#666" />
          </View>
        )}

        {spiritUnit && (
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>SPIRIT · SP {spiritUnit.sp}</Text>
            {[...new Set([...spiritUnit.def.pilot.spirits, ...(spiritUnit.bonusSpirits ?? [])])].map((id: SpiritId) => {
              const sp = SPIRITS[id];
              const milestone = !(spiritUnit.def.pilot.spirits as SpiritId[]).includes(id);
              return (
                <Btn key={id} label={`✦ ${sp.name} · ${spiritCost(spiritUnit, id)} SP${milestone ? ' · ★MILESTONE' : ''}`} sub={sp.desc} disabled={spiritUnit.sp < spiritCost(spiritUnit, id)} onPress={() => s.castSpirit(spiritUnit.uid, id)} accent={milestone ? '#ffd34d' : '#c9a0ff'} />
              );
            })}
            <Btn label="BACK" onPress={() => useGame.setState({ spiritForUid: null })} accent="#666" />
          </View>
        )}

        {/* enemy inspect card — shown after tapping a foe */}
        {/* empty-tile terrain info — tap a bare tile */}
        {s.tileInfo && !s.menuForUid && !s.pendingWeapon && !s.spiritForUid && !inspect && (
          <View style={[styles.unitCard, { borderWidth: 1, borderColor: '#3a5a48' }]}>
            <Text style={styles.unitName}>{TERRAIN_INFO[terrainAt(s.map, s.tileInfo)]?.name ?? 'Field'}</Text>
            <Text style={styles.tileCoords}>
              ({s.tileInfo.x},{s.tileInfo.y})
            </Text>
            <Text style={styles.terrainLine}>{terrainDesc(s.map, s.tileInfo)}</Text>
            {s.crates.some((c) => c.pos.x === s.tileInfo!.x && c.pos.y === s.tileInfo!.y) && <Text style={styles.crateHint}>▣ SALVAGE CRATE — land a unit here to claim it</Text>}
            {s.map.mines?.some((m) => m.x === s.tileInfo!.x && m.y === s.tileInfo!.y) && <Text style={[styles.crateHint, { color: '#ff6b6b' }]}>💥 MINEFIELD — detonates on entry (-15% HP, can't kill)</Text>}
          </View>
        )}

        {/* squad roster — toggle from the counts row */}
        {showRoster && !s.menuForUid && !s.pendingWeapon && !s.spiritForUid && !inspect && (
          <View style={styles.rosterBox}>
            <Text style={styles.menuTitle}>SQUAD</Text>
            {s.units
              .filter((u) => u.side === 'player' && u.alive)
              .map((u) => (
                <View key={u.uid} style={styles.rosterRow}>
                  <Text style={[styles.rosterName, u.acted && styles.rosterActed]} numberOfLines={1}>
                    {u.npc ? '🛡 ' : ''}
                    {u.def.name} <Text style={{ color: '#6b7694' }}>Lv{u.level}</Text>
                  </Text>
                  <View style={styles.rosterBarTrack}>
                    <View style={[styles.rosterBarFill, { width: `${(u.hp / u.def.maxHp) * 100}%` }]} />
                  </View>
                  <Text style={styles.rosterHp}>{Math.round((u.hp / u.def.maxHp) * 100)}%</Text>
                </View>
              ))}
            <Text style={styles.menuTitle}>HOSTILES</Text>
            <ScrollView style={{ maxHeight: 92 }} nestedScrollEnabled>
              {s.units
                .filter((u) => u.side === 'enemy' && u.alive)
                .map((u) =>
                  s.missionCh.fog && !fogLit(s.units, u.pos) ? (
                    <View key={u.uid} style={styles.rosterRow}>
                      <Text style={[styles.rosterName, { color: '#4a5a7a' }]} numberOfLines={1}>
                        ??? — UNCONTACTED
                      </Text>
                    </View>
                  ) : (
                    <View key={u.uid} style={styles.rosterRow}>
                      <Text style={[styles.rosterName, { color: '#ffb0a0' }]} numberOfLines={1}>
                        {u.def.boss || u.elite ? '★ ' : ''}
                        {u.def.name} <Text style={{ color: '#6b7694' }}>Lv{u.level}</Text>
                      </Text>
                      <View style={[styles.rosterBarTrack, { backgroundColor: '#2a1216' }]}>
                        <View style={[styles.rosterBarFill, { width: `${(u.hp / u.def.maxHp) * 100}%`, backgroundColor: '#ff5a5a' }]} />
                      </View>
                      <Text style={styles.rosterHp}>{Math.round((u.hp / u.def.maxHp) * 100)}%</Text>
                    </View>
                  ),
                )}
            </ScrollView>
          </View>
        )}

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
            {inspect.def.pilot.trait && (
              <Text style={styles.traitLine} numberOfLines={1}>
                ◆ {TRAITS[inspect.def.pilot.trait].name} — {TRAITS[inspect.def.pilot.trait].desc}
              </Text>
            )}
            {buffNames(inspect).length > 0 && (
              <Text style={[styles.traitLine, { color: '#7de0ff' }]} numberOfLines={1}>
                ✦ STATUS: {buffNames(inspect).join(' · ')}
              </Text>
            )}
            {(inspect.def.barrier ?? 0) > 0 && (
              <Text style={[styles.traitLine, { color: '#8ef0e8' }]} numberOfLines={1}>
                ◈ I-FIELD: incoming damage below {inspect.def.barrier} cut to 20%
              </Text>
            )}
            {inspect.def.resists && (
              <Text style={[styles.traitLine, { color: '#ffd34d' }]} numberOfLines={1}>
                🛡 RESIST: {Object.entries(inspect.def.resists)
                  .map(([k, v]) => `${k.toUpperCase()} −${Math.round((v ?? 0) * 100)}%`)
                  .join(' · ')}
              </Text>
            )}
            {inspect.def.weapons.map((w) => (
              <Text key={w.id} style={styles.weapLine} numberOfLines={1}>
                ⚔ {w.name} · POW {w.power} · R{w.rangeMin}-{w.rangeMax}
                {w.mapRange != null ? ` · AREA ${w.mapRange}` : ''}
                {w.willReq ? ` · W${w.willReq}` : ''}
                {w.critMod ? ` · CRIT+${w.critMod}` : ''}
                {w.ammo != null ? ` · ×${inspect.ammo[w.id] ?? 0}` : ` · EN ${w.enCost}`}
                {w.pierce ? ' · ◆PIERCE' : ''}
                {w.drain ? ' · ✚DRAIN' : ''}
                {w.antiAir ? ' · ☄AA' : ''}
                {w.sniper ? ' · ⌖SNIPER' : ''}{w.breaker ? ' · ⛏BREAK' : ''}
              </Text>
            ))}
            <Text style={styles.terrainLine}>{terrainDesc(s.map, inspect.pos)}</Text>
            <Text style={styles.threatNote}>Orange = its move + weapon range</Text>
            <Btn label="CLOSE" onPress={s.clearInspect} accent="#666" />
          </View>
        )}

        {!s.menuForUid && !s.pendingWeapon && !s.spiritForUid && !inspect && (
          <View style={styles.logBox}>
            <Text style={styles.logHead}>BATTLE LOG</Text>
            <ScrollView nestedScrollEnabled>
              {s.log.map((l, i) => (
                <Text key={i} style={[styles.logLine, i === 0 && styles.logLineHot]}>
                  {l}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {s.phase === 'player' && !s.enemyBusy && (
        <View>
          <Pressable onPress={s.endTurn} style={({ pressed }) => [styles.endTurn, allActed && styles.endTurnReady, pressed && { opacity: 0.8 }]}>
            <Text style={styles.endTurnTxt}>{allActed ? 'END TURN ▸ ALL UNITS ACTED' : 'END TURN ▸'}</Text>
          </Pressable>
          <Pressable onPress={s.retreatMission} style={({ pressed }) => [styles.retreat, pressed && { opacity: 0.6 }]}>
            <Text style={styles.retreatTxt}>◂ RETREAT MISSION</Text>
          </Pressable>
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
  btn: { borderWidth: 1, borderColor: '#46518a', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8, backgroundColor: '#1f2540' },
  btnOff: { opacity: 0.38 },
  btnText: { color: '#e6ecff', fontSize: 10.5, fontWeight: '700' },
  btnTextOff: { color: '#666f8c' },
  btnSub: { color: '#7f8db0', fontSize: 8.5, marginTop: 1 },
  tgtRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ff6b6b', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 8, backgroundColor: '#221622', gap: 6 },
  tgtRowKill: { borderColor: '#ffd34d', backgroundColor: '#2a2214' },
  tgtName: { color: '#ffe2e2', fontSize: 10.5, fontWeight: '800' },
  tgtHp: { color: '#8fa1c7', fontSize: 8.5, marginTop: 1 },
  tgtBar: { height: 7, borderRadius: 4, backgroundColor: '#1a2036', marginTop: 4, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tgtBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  tgtHitBox: { alignItems: 'flex-end' },
  tgtHit: { fontSize: 15, fontWeight: '900' },
  tgtDmg: { color: '#9fb0d0', fontSize: 8.5, fontWeight: '700' },
  logBox: { marginTop: 7, backgroundColor: '#0c0e16', borderRadius: 6, padding: 6, minHeight: 60, maxHeight: 110, borderWidth: 1, borderColor: '#2a3450' },
  logHead: { color: '#5a6484', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#1c2338', paddingBottom: 3 },
  logLineHot: { color: '#ffd34d' },
  dangerBtn: { borderWidth: 1, borderColor: '#ff5a5a55', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  dangerBtnOn: { borderColor: '#ff5a5a', backgroundColor: '#3a1010' },
  blizzChip: { color: '#9fd8ff', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4, backgroundColor: 'rgba(90,160,255,0.14)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  dangerTxt: { color: '#8a90a0', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  logLine: { color: '#9fb0d0', fontSize: 9, marginBottom: 2 },
  endTurn: { marginTop: 8, borderWidth: 1.5, borderColor: '#ffd34d', borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#2a281c', shadowColor: '#ffd34d', shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  endTurnReady: { borderWidth: 2, backgroundColor: 'rgba(255,211,77,0.22)' },
  endTurnTxt: { color: '#ffd34d', fontWeight: '900', fontSize: 12, letterSpacing: 1.4 },
  retreat: { marginTop: 4, borderWidth: 1, borderColor: '#3a4160', borderRadius: 6, paddingVertical: 4, alignItems: 'center', backgroundColor: '#14171f' },
  retreatTxt: { color: '#8fa1c7', fontWeight: '800', fontSize: 9, letterSpacing: 1 },
  terrainLine: { color: '#7fd4a8', fontSize: 8.5, marginTop: 4, fontWeight: '700' },
  objCard: { backgroundColor: '#1a2416', borderWidth: 1, borderColor: '#3a5a48', borderRadius: 6, padding: 5, marginTop: 4 },
  objTxt: { color: '#7dff9d', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  tileCoords: { color: '#6b7694', fontSize: 8.5, marginTop: 1 },
  crateHint: { color: '#ffd34d', fontSize: 8.5, marginTop: 4, fontWeight: '700' },
  rosterBox: { marginTop: 7, backgroundColor: '#0c0e16', borderRadius: 6, padding: 6 },
  traitLine: { color: '#b8a0ff', fontSize: 9, marginTop: 3 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  rosterName: { color: '#cfd8f0', fontSize: 9, fontWeight: '700', width: 78 },
  rosterActed: { opacity: 0.4 },
  rosterBarTrack: { flex: 1, height: 4, backgroundColor: '#141a12', borderRadius: 2, overflow: 'hidden' },
  rosterBarFill: { height: 4, borderRadius: 2, backgroundColor: '#4dff7a' },
  rosterHp: { color: '#8fa1c7', fontSize: 8, width: 26, textAlign: 'right' },
  killsLine: { color: '#ff9dbb', fontSize: 8.5, marginTop: 3, fontWeight: '700' },
  tgtCnt: { color: '#ff9d8a', fontSize: 8.5, marginTop: 1, fontWeight: '700' },
  inspectCard: { borderWidth: 1, borderColor: '#ff6b6b' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  statTxt: { color: '#c9a0ff', fontSize: 9, fontWeight: '700' },
  weapLine: { color: '#b8c4e0', fontSize: 9, marginTop: 3 },
  threatNote: { color: '#ff9632', fontSize: 8.5, marginTop: 6, marginBottom: 4 },
});
