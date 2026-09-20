import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { PILOT_ART } from '../assets';
import { ITEMS } from '../game/campaign';
import { SPIRITS } from '../game/data';
import { weaponsAgainst } from '../game/engine';
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
              <Image source={PILOT_ART[unit.def.id]} style={styles.face} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.unitName} numberOfLines={1}>
                  {unit.def.name}
                </Text>
                <Text style={styles.pilotName} numberOfLines={1}>
                  {unit.def.pilot.name} · Lv{unit.level}
                </Text>
              </View>
            </View>
            <Bar label="HP" val={unit.hp} max={unit.def.maxHp} color="#4dff7a" />
            <Bar label="EN" val={unit.en} max={unit.def.maxEn} color="#4db4ff" />
            <Bar label="SP" val={unit.sp} max={unit.def.pilot.maxSp} color="#ffb84d" />
            <Bar label="EXP" val={unit.exp} max={100} color="#c9a0ff" />
          </View>
        )}

        {/* weapon pick while menu open */}
        {s.menuForUid && !s.pendingWeapon && unit && (
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>ACTION</Text>
            {unit.def.weapons.map((w) => {
              const ammoLeft = w.ammo != null ? unit.ammo[w.id] ?? 0 : null;
              const noEn = unit.en < w.enCost;
              const noAmmo = ammoLeft != null && ammoLeft <= 0;
              const noPost = !w.postMove && s.pendingMovedFlag;
              const hitsAny = s.units.some(
                (e) => e.alive && e.side === 'enemy' && weaponsAgainst(unit, s.pendingMove!, e, s.pendingMovedFlag).some((x) => x.id === w.id),
              );
              const disabled = noEn || noAmmo || noPost || !hitsAny;
              const reason = noEn ? 'NEED EN' : noAmmo ? 'NO AMMO' : noPost ? 'CAN\'T AFTER MOVE' : !hitsAny ? 'NO TARGET' : null;
              const stat = `POW ${w.power} · R${w.rangeMin}-${w.rangeMax}${w.ammo != null ? ` · ×${ammoLeft}` : ` · EN ${w.enCost}`}`;
              return (
                <Btn
                  key={w.id}
                  label={`⚔ ${w.name}${reason ? `  · ${reason}` : ''}`}
                  sub={stat}
                  accent={hitsAny && !disabled ? '#ff6b6b' : undefined}
                  disabled={disabled}
                  onPress={() => s.chooseWeapon(w)}
                />
              );
            })}
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

        {s.pendingWeapon && (
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>{s.pendingWeapon.name}</Text>
            <Text style={styles.hint}>Tap a red-highlighted enemy to attack</Text>
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

        {!s.menuForUid && !s.pendingWeapon && !s.spiritForUid && (
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
        <TouchableOpacity onPress={s.endTurn} style={styles.endTurn}>
          <Text style={styles.endTurnTxt}>END TURN ▸</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 236, backgroundColor: '#12141c', borderLeftWidth: 1, borderLeftColor: '#2a2f42', padding: 7, paddingBottom: 7 },
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
  logBox: { marginTop: 7, backgroundColor: '#0c0e16', borderRadius: 6, padding: 6, minHeight: 60 },
  logLine: { color: '#9fb0d0', fontSize: 9, marginBottom: 2 },
  endTurn: { marginTop: 6, borderWidth: 1, borderColor: '#ffd34d', borderRadius: 6, paddingVertical: 7, alignItems: 'center', backgroundColor: '#26251a' },
  endTurnTxt: { color: '#ffd34d', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
});
