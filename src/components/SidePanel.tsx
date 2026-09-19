import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { PILOT_ART } from '../assets';
import { SPIRITS } from '../game/data';
import { usableWeapons, weaponsAgainst } from '../game/engine';
import { aliveEnemies, alivePlayers, useGame } from '../game/store';
import { SpiritId } from '../game/types';
import { MechSprite } from './MechSprite';

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

function Btn({ label, onPress, disabled, accent }: { label: string; onPress: () => void; disabled?: boolean; accent?: string }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.btn, disabled && styles.btnOff, accent ? { borderColor: accent } : null]}>
      <Text style={[styles.btnText, disabled && styles.btnTextOff]}>{label}</Text>
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
        <Text style={styles.turnTxt}>TURN {s.turn}</Text>
      </View>
      <Text style={styles.counts}>
        Ally {alivePlayers(s).length} · Enemy {aliveEnemies(s).length}
      </Text>

      {unit && (
        <View style={styles.unitCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={PILOT_ART[unit.def.id]} style={styles.face} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.unitName}>{unit.def.name}</Text>
              <Text style={styles.pilotName}>
                {unit.def.pilot.name} · {unit.def.pilot.callsign}
              </Text>
            </View>
          </View>
          <Bar label="HP" val={unit.hp} max={unit.def.maxHp} color="#4dff7a" />
          <Bar label="EN" val={unit.en} max={unit.def.maxEn} color="#4db4ff" />
          <Bar label="SP" val={unit.sp} max={unit.def.pilot.maxSp} color="#ffb84d" />
        </View>
      )}

      {/* weapon pick while menu open */}
      {s.menuForUid && !s.pendingWeapon && unit && (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>ACTION</Text>
          {usableWeapons(unit).map((w) => {
              const hitsAny = s.units.some((e) => e.alive && e.side === 'enemy' && weaponsAgainst(unit, s.pendingMove!, e, s.pendingMovedFlag).some((x) => x.id === w.id));
              const ammoTxt = w.ammo != null ? ` · ammo ${unit.ammo[w.id] ?? 0}` : ` · EN ${w.enCost}`;
              return (
                <Btn
                  key={w.id}
                  label={`⚔ ${w.name}  ${w.rangeMin}-${w.rangeMax}${ammoTxt}${w.postMove ? '' : '  [No P]'}`}
                  accent={hitsAny ? '#ff6b6b' : undefined}
                  onPress={() => s.chooseWeapon(w)}
                />
              );
            })}
          {unit.def.pilot.spirits.length > 0 && <Btn label="✦ Spirit Commands" onPress={() => s.openSpirits(unit.uid)} accent="#c9a0ff" />}
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
              <Btn key={id} label={`${sp.name} (${sp.cost}) — ${sp.desc}`} disabled={spiritUnit.sp < sp.cost} onPress={() => s.castSpirit(spiritUnit.uid, id)} accent="#c9a0ff" />
            );
          })}
          <Btn label="BACK" onPress={() => useGame.setState({ spiritForUid: null })} accent="#666" />
        </View>
      )}

      <ScrollView style={styles.logBox}>
        {s.log.map((l, i) => (
          <Text key={i} style={styles.logLine}>
            {l}
          </Text>
        ))}
      </ScrollView>

      {s.phase === 'player' && !s.enemyBusy && <Btn label="END TURN ▸" onPress={s.endTurn} accent="#ffd34d" />}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 240, backgroundColor: '#12141c', borderLeftWidth: 1, borderLeftColor: '#2a2f42', padding: 8 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  phaseTxt: { color: '#ffd34d', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  turnTxt: { color: '#9fb0d0', fontWeight: '700', fontSize: 12 },
  counts: { color: '#6b7694', fontSize: 10, marginTop: 2 },
  unitCard: { backgroundColor: '#1a1e2c', borderRadius: 8, padding: 8, marginTop: 8 },
  face: { width: 46, height: 46, borderRadius: 8, borderWidth: 1, borderColor: '#3a4160' },
  unitName: { color: '#fff', fontWeight: '800', fontSize: 14 },
  pilotName: { color: '#8fa1c7', fontSize: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  barLabel: { color: '#9fb0d0', fontSize: 9, width: 18, fontWeight: '700' },
  barTrack: { flex: 1, height: 6, backgroundColor: '#0a0c12', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  barVal: { color: '#9fb0d0', fontSize: 9, width: 62, textAlign: 'right' },
  menu: { marginTop: 8, gap: 6 },
  menuTitle: { color: '#ffd34d', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  hint: { color: '#8fa1c7', fontSize: 10 },
  btn: { borderWidth: 1, borderColor: '#3a4160', borderRadius: 6, paddingVertical: 7, paddingHorizontal: 8, backgroundColor: '#1c2133' },
  btnOff: { opacity: 0.4 },
  btnText: { color: '#e6ecff', fontSize: 11, fontWeight: '600' },
  btnTextOff: { color: '#666f8c' },
  logBox: { flex: 1, marginTop: 8, backgroundColor: '#0c0e16', borderRadius: 6, padding: 6 },
  logLine: { color: '#9fb0d0', fontSize: 9, marginBottom: 3 },
});
