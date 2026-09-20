import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART, KIND_SFX, MECH_ART, PILOT_ART, SUBTITLES, UNIT_VOICE } from '../assets';
import { play } from '../audio';
import { useGame } from '../game/store';
import { UnitState, WeaponDef } from '../game/types';

/**
 * SRW-style battle cut-in with generated anime art:
 * stage 0 intro slide-in -> 1 weapon banner+attack anim -> 2 impact/damage
 * -> 3 counter anim -> 4 counter impact -> 5 outro -> finishBattle()
 */

const DUR = { intro: 1000, banner: 950, attack: 2300, impact: 2000, outro: 900 };

export function BattleScene() {
  const battle = useGame((s) => s.battle);
  const finishBattle = useGame((s) => s.finishBattle);
  const { width, height } = useWindowDimensions();
  const [stage, setStage] = useState(0);
  const [dmgShown, setDmgShown] = useState(0);
  const [counterDmgShown, setCounterDmgShown] = useState(0);
  const [voiceLine, setVoiceLine] = useState<string | null>(null);

  const bgZoom = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const defFlash = useRef(new Animated.Value(0)).current;
  const attFlash = useRef(new Animated.Value(0)).current;
  const defFall = useRef(new Animated.Value(0)).current;
  const attFall = useRef(new Animated.Value(0)).current;
  const attEnter = useRef(new Animated.Value(0)).current;
  const defEnter = useRef(new Animated.Value(0)).current;
  const attLunge = useRef(new Animated.Value(0)).current;
  const defLunge = useRef(new Animated.Value(0)).current;
  const cutIn = useRef(new Animated.Value(0)).current;

  const atk = battle?.attacker;
  const def = battle?.defender;
  const hasCounter = !!battle?.result.counter && !battle.result.destroyed;

  // stage driver
  useEffect(() => {
    if (!battle) return;
    setStage(0);
    setDmgShown(0);
    setCounterDmgShown(0);
    setVoiceLine(null);
    fade.setValue(0);
    attEnter.setValue(0);
    defEnter.setValue(0);
    attLunge.setValue(0);
    defLunge.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    bgZoom.setValue(0);
    Animated.timing(bgZoom, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(attEnter, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(defEnter, { toValue: 1, duration: 950, delay: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [battle]);

  useEffect(() => {
    if (!battle) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const go = (ms: number, st: number) => timers.push(setTimeout(() => setStage(st), ms));
    go(DUR.intro, 1);
    go(DUR.intro + DUR.banner, 2); // attack anim runs
    go(DUR.intro + DUR.banner + DUR.attack, 3); // impact
    let t = DUR.intro + DUR.banner + DUR.attack + DUR.impact;
    if (hasCounter) {
      go(t, 4); // counter attack
      t += DUR.banner + DUR.attack;
      go(t, 5); // counter impact
      t += DUR.impact;
    }
    go(t, 6); // outro
    timers.push(setTimeout(() => finishBattle(), t + DUR.outro));
    return () => timers.forEach(clearTimeout);
  }, [battle, hasCounter, finishBattle]);

  // audio + cut-ins + motion on attack stages
  useEffect(() => {
    if (!battle) return;
    if (stage === 2) {
      const vk = UNIT_VOICE[battle.attacker.def.id]?.[0];
      if (vk) {
        play(vk);
        setVoiceLine(SUBTITLES[vk] ?? null);
      }
      play(KIND_SFX[battle.weapon.kind] ?? 'sfx_beam');
      cutIn.setValue(0);
      Animated.sequence([
        Animated.timing(cutIn, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cutIn, { toValue: 0, duration: 420, delay: 1900, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(attLunge, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(attLunge, { toValue: 0, duration: 780, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
    if (stage === 4 && battle.result.counter) {
      const vk = UNIT_VOICE[battle.defender.def.id]?.[1] ?? UNIT_VOICE[battle.defender.def.id]?.[0];
      if (vk) {
        play(vk);
        setVoiceLine(SUBTITLES[vk] ?? null);
      }
      play(KIND_SFX[battle.result.counter.weapon.kind] ?? 'sfx_beam');
      cutIn.setValue(0);
      Animated.sequence([
        Animated.timing(cutIn, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cutIn, { toValue: 0, duration: 420, delay: 1900, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(defLunge, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(defLunge, { toValue: 0, duration: 780, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  }, [stage]);

  // damage counter + shake + flash on impact stages
  useEffect(() => {
    if (!battle) return;
    if (stage === 3) {
      const r = battle.result;
      if (r.hit) {
        play(r.destroyed ? 'sfx_explosion' : 'sfx_hit');
        pulse(defFlash, shakeX);
        countUp(r.damage, setDmgShown, 1200);
        if (r.destroyed)
          Animated.timing(defFall, { toValue: 1, duration: 950, delay: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
      }
    }
    if (stage === 5 && battle.result.counter) {
      const c = battle.result.counter;
      if (c.hit) {
        play(c.destroyed ? 'sfx_explosion' : 'sfx_hit');
        pulse(attFlash, shakeX);
        countUp(c.damage, setCounterDmgShown, 1200);
        if (c.destroyed)
          Animated.timing(attFall, { toValue: 1, duration: 950, delay: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
      }
    }
  }, [stage]);

  if (!battle || !atk || !def) return null;

  const PW = width * 0.415; // mech panel width — sized so both cards never overlap
  const PH = height * 0.58;
  const counterActive = stage >= 4;
  const activePilot = counterActive ? def : atk;
  // HP shown drains live during the impact stage (post-attack states stored on battle)
  const defHpShown = Math.max(0, Math.min(def.hp, Math.max(battle.defenderAfter.hp, def.hp - dmgShown)));
  const attHpShown = Math.max(0, Math.min(atk.hp, Math.max(battle.attackerAfter.hp, atk.hp - counterDmgShown)));

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      {/* bg */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: bgZoom.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.22] }) }] }]}>
        <Image source={ART.battleBg} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,6,16,0.35)' }]} />

      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: shakeX }] }]}>
        {/* attacker mech panel */}
        <Animated.View
          style={[
            styles.panel,
            {
              left: width * 0.035,
              bottom: height * 0.14,
              width: PW,
              height: PH,
              borderColor: atk.def.accent,
              opacity: attFall.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                { translateX: Animated.add(attEnter.interpolate({ inputRange: [0, 1], outputRange: [-PW * 1.2, 0] }), attLunge.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.07] })) },
                { translateY: attFall.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }) },
                { rotate: attFall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '12deg'] }) },
              ],
            },
          ]}
        >
          <Image source={MECH_ART[atk.def.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: attFlash }]} />
        </Animated.View>

        {/* defender mech panel */}
        <Animated.View
          style={[
            styles.panel,
            {
              right: width * 0.035,
              top: height * 0.08,
              width: PW,
              height: PH,
              borderColor: def.def.accent,
              opacity: defFall.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                { translateX: Animated.add(defEnter.interpolate({ inputRange: [0, 1], outputRange: [PW * 1.2, 0] }), defLunge.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.07] })) },
                { translateY: defFall.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }) },
                { rotate: defFall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] }) },
              ],
            },
          ]}
        >
          <Image source={MECH_ART[def.def.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: defFlash }]} />
        </Animated.View>

        {/* attack VFX overlays */}
        {(stage === 2 || stage === 3) && <AttackAnim weapon={battle.weapon} side="attacker" w={width} h={height} />}
        {counterActive && <AttackAnim weapon={battle.result.counter!.weapon} side="defender" w={width} h={height} />}

        {/* pilot cut-in */}
        <PilotCutIn unit={activePilot} side={counterActive ? 'right' : 'left'} anim={cutIn} line={voiceLine} />
      </Animated.View>

      {/* name plates */}
      <NamePlate unit={atk} hp={attHpShown} side="left" />
      <NamePlate unit={def} hp={defHpShown} side="right" />

      {/* weapon banner */}
      {stage === 1 && <Banner text={battle.weapon.name} color="#ffd34d" />}
      {stage === 4 && <Banner text={battle.result.counter!.weapon.name} color="#ff8a5c" />}

      {/* impact feedback */}
      {stage === 3 &&
        (battle.result.hit ? (
          <ImpactText
            text={`${dmgShown}`}
            sub={battle.result.crit ? 'CRITICAL!' : battle.result.destroyed ? 'DESTROYED!' : `${battle.result.hitChance}%`}
            color={battle.result.crit ? '#ffd34d' : '#fff'}
          />
        ) : (
          <ImpactText text="MISS" sub={`${battle.result.hitChance}%`} color="#9fd0ff" />
        ))}
      {stage === 3 && battle.result.hit && battle.result.destroyed && <Explosion right w={width} h={height} />}
      {stage === 5 &&
        battle.result.counter &&
        (battle.result.counter.hit ? (
          <ImpactText text={`${counterDmgShown}`} sub={battle.result.counter.crit ? 'CRITICAL!' : battle.result.counter.destroyed ? 'DESTROYED!' : 'COUNTER'} color="#ff8a5c" />
        ) : (
          <ImpactText text="MISS" sub="counter" color="#9fd0ff" />
        ))}
      {stage === 5 && battle.result.counter?.hit && battle.result.counter.destroyed && <Explosion w={width} h={height} />}

      {/* footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTxt}>
          {battle.weapon.name} · HIT {battle.result.hitChance}% · POW {battle.weapon.power}
        </Text>
      </View>
    </Animated.View>
  );
}

function pulse(flash: Animated.Value, shake: Animated.Value) {
  flash.setValue(0);
  shake.setValue(0);
  Animated.sequence([
    Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
    Animated.timing(flash, { toValue: 0, duration: 90, useNativeDriver: true }),
    Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
    Animated.timing(flash, { toValue: 0, duration: 200, useNativeDriver: true }),
  ]).start();
  Animated.sequence([
    Animated.timing(shake, { toValue: 10, duration: 40, useNativeDriver: true }),
    Animated.timing(shake, { toValue: -10, duration: 40, useNativeDriver: true }),
    Animated.timing(shake, { toValue: 7, duration: 40, useNativeDriver: true }),
    Animated.timing(shake, { toValue: -5, duration: 40, useNativeDriver: true }),
    Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
  ]).start();
}

function countUp(to: number, set: (n: number) => void, ms: number) {
  const steps = 18;
  const iv = ms / steps;
  let i = 0;
  const t = setInterval(() => {
    i++;
    set(Math.round((to * i) / steps));
    if (i >= steps) clearInterval(t);
  }, iv);
}

// ---------- sub-visuals ----------

function PilotCutIn({ unit, side, anim, line }: { unit: UnitState; side: 'left' | 'right'; anim: Animated.Value; line: string | null }) {
  const { width, height } = useWindowDimensions();
  const fromLeft = side === 'left';
  // horizontal voice bar in the free diagonal corner — never touches a mech card
  const W = Math.min(320, width * 0.4);
  const IMG = Math.min(64, height * 0.19);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.cutIn,
        fromLeft ? { left: width * 0.02, top: height * 0.02 } : { right: width * 0.02, bottom: height * 0.02 },
        {
          opacity: anim,
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [fromLeft ? -W * 1.4 : W * 1.4, 0] }) },
            { skewX: fromLeft ? '-8deg' : '8deg' },
          ],
          width: W,
          flexDirection: fromLeft ? 'row' : 'row-reverse',
        },
      ]}
    >
      <View style={[styles.cutInImgWrap, { borderColor: unit.def.accent }]}>
        <Image source={PILOT_ART[unit.def.id]} style={{ width: IMG, height: IMG }} contentFit="cover" />
      </View>
      <View style={{ flex: 1, marginLeft: fromLeft ? 6 : 0, marginRight: fromLeft ? 0 : 6 }}>
        <View style={[styles.cutInNameBar, { borderColor: unit.def.accent }]}>
          <Text style={styles.cutInNameTxt} numberOfLines={1}>
            {unit.def.pilot.name}
          </Text>
        </View>
        {!!line && (
          <View style={[styles.cutInLine, { borderColor: unit.def.accent }]}>
            <Text style={styles.cutInLineTxt} numberOfLines={2}>
              "{line}"
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function NamePlate({ unit, hp, side }: { unit: UnitState; hp?: number; side: 'left' | 'right' }) {
  const { height } = useWindowDimensions();
  const shown = hp ?? unit.hp;
  const pct = Math.max(0, shown / unit.def.maxHp);
  return (
    <View style={[styles.plate, side === 'left' ? { left: 14, bottom: 10 } : { right: 14, top: height * 0.68 }]}>
      <Image source={PILOT_ART[unit.def.id]} style={styles.plateFace} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <Text style={styles.plateName} numberOfLines={1}>
          {unit.def.name} · {unit.def.pilot.callsign} · Lv{unit.level}
        </Text>
        <View style={styles.plateBarTrack}>
          <View style={[styles.plateBarFill, { width: `${pct * 100}%`, backgroundColor: pct > 0.5 ? '#4dff7a' : pct > 0.25 ? '#ffd34d' : '#ff5a5a' }]} />
        </View>
        <Text style={styles.plateHp}>
          {shown}/{unit.def.maxHp}
        </Text>
      </View>
    </View>
  );
}

function Banner({ text, color }: { text: string; color: string }) {
  const slide = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
  }, []);
  return (
    <Animated.View style={[styles.banner, { borderColor: color, transform: [{ translateX: slide.interpolate({ inputRange: [-1, 0], outputRange: [-520, 0] }) }] }]}>
      <Text style={[styles.bannerTxt, { color }]}>{text}</Text>
    </Animated.View>
  );
}

function ImpactText({ text, sub, color }: { text: string; sub?: string; color: string }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  }, []);
  return (
    <Animated.View style={[styles.impactWrap, { transform: [{ scale }] }]}>
      <Text style={[styles.impactTxt, { color }]}>{text}</Text>
      {!!sub && <Text style={styles.impactSub}>{sub}</Text>}
    </Animated.View>
  );
}

function Explosion({ w, h, right }: { w: number; h: number; right?: boolean }) {
  const rings = useRef(Array.from({ length: 3 }, () => new Animated.Value(0))).current;
  const parts = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      v: new Animated.Value(0),
      dx: Math.cos((i / 10) * Math.PI * 2) * (40 + (i % 4) * 18),
      dy: Math.sin((i / 10) * Math.PI * 2) * (30 + (i % 3) * 14),
      color: i % 2 ? '#ffb84d' : '#ff5a5a',
    })),
  ).current;
  useEffect(() => {
    rings.forEach((r, i) => Animated.timing(r, { toValue: 1, duration: 600, delay: i * 120, useNativeDriver: true }).start());
    parts.forEach((p) => Animated.timing(p.v, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }).start());
  }, []);
  const cx = right ? w * 0.74 : w * 0.26;
  const cy = right ? h * 0.38 : h * 0.64;
  return (
    <View style={[StyleSheet.absoluteFill]} pointerEvents="none">
      {rings.map((r, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: cx - 30,
            top: cy - 30,
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 4,
            borderColor: i === 0 ? '#fff' : '#ffb84d',
            opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
            transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6 + i] }) }],
          }}
        />
      ))}
      {parts.map((p, i) => (
        <Animated.View
          key={`p${i}`}
          style={{
            position: 'absolute',
            left: cx,
            top: cy,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: p.color,
            opacity: p.v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.9, 0] }),
            transform: [{ translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) }, { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ---------- per-weapon attack animations ----------

function AttackAnim({ weapon, side, w, h }: { weapon: WeaponDef; side: 'attacker' | 'defender'; w: number; h: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: DUR.attack + DUR.impact * 0.6, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [weapon.id]);

  // attacker panel left firing right; defender (countering) right firing left
  const fromLeft = side === 'attacker';
  const sx = fromLeft ? w * 0.3 : w * 0.7;
  const sy = fromLeft ? h * 0.52 : h * 0.4;
  const tx = fromLeft ? w * 0.74 : w * 0.26;
  const ty = fromLeft ? h * 0.4 : h * 0.6;
  const dir = tx - sx;
  const dy = ty - sy;

  switch (weapon.kind) {
    case 'melee': {
      return (
        <Animated.View
          style={{
            position: 'absolute',
            left: sx,
            top: sy,
            width: 9,
            height: 120,
            backgroundColor: '#aef3ff',
            borderRadius: 5,
            shadowColor: '#7ee7ff',
            shadowRadius: 14,
            shadowOpacity: 1,
            opacity: v.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dir] }) },
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
              { rotate: '38deg' },
              { scaleY: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.3, 1.5, 0.4] }) },
            ],
          }}
        />
      );
    }
    case 'beam': {
      return (
        <>
          <Animated.View
            style={{
              position: 'absolute',
              left: sx - 18,
              top: sy - 18,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#9fd0ff',
              opacity: v.interpolate({ inputRange: [0, 0.3, 0.55, 1], outputRange: [0, 0.9, 0.9, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0, 0.3], outputRange: [0.2, 1.5] }) }],
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              left: sx,
              top: sy,
              width: Math.abs(dir),
              height: 12,
              borderRadius: 6,
              backgroundColor: '#8ee9ff',
              shadowColor: '#7ee7ff',
              shadowRadius: 16,
              shadowOpacity: 1,
              opacity: v.interpolate({ inputRange: [0, 0.35, 0.42, 0.95, 1], outputRange: [0, 0, 1, 1, 0] }),
              transform: [{ translateX: dir < 0 ? dir : 0 }, { scaleX: v.interpolate({ inputRange: [0.4, 0.75], outputRange: [0.02, 1], extrapolate: 'clamp' }) }],
            }}
          />
        </>
      );
    }
    case 'missile': {
      return (
        <>
          {Array.from({ length: 5 }, (_, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: sx,
                top: sy,
                width: 14,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#ffd0a0',
                shadowColor: '#ffb84d',
                shadowRadius: 8,
                shadowOpacity: 0.9,
                opacity: v.interpolate({ inputRange: [0, 0.12 + i * 0.09, 0.9, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: v.interpolate({ inputRange: [0.08 + i * 0.09, 0.95], outputRange: [0, dir], extrapolate: 'clamp' }) },
                  { translateY: v.interpolate({ inputRange: [0.08 + i * 0.09, 0.5, 0.95], outputRange: [0, dy - 70 - i * 9, dy], extrapolate: 'clamp' }) },
                  { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '10deg'] }) },
                ],
              }}
            />
          ))}
        </>
      );
    }
    case 'gun': {
      return (
        <>
          {Array.from({ length: 4 }, (_, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: sx,
                top: sy,
                width: 20,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#ffe28a',
                shadowColor: '#ffd34d',
                shadowRadius: 8,
                shadowOpacity: 1,
                opacity: v.interpolate({ inputRange: [0, 0.18 + i * 0.12, 0.28 + i * 0.12, 1], outputRange: [0, 0, 1, 0] }),
                transform: [{ translateX: v.interpolate({ inputRange: [0.18 + i * 0.12, 0.6 + i * 0.12], outputRange: [0, dir], extrapolate: 'clamp' }) }, { translateY: dy * 0.9 }],
              }}
            />
          ))}
        </>
      );
    }
    case 'funnel': {
      return (
        <>
          {Array.from({ length: 4 }, (_, i) => {
            const off = (i - 1.5) * 30;
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  left: sx,
                  top: sy + off,
                  width: 15,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#d0a0ff',
                  shadowColor: '#b06cff',
                  shadowRadius: 10,
                  shadowOpacity: 1,
                  opacity: v.interpolate({ inputRange: [0, 0.12, 0.9, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateX: v.interpolate({ inputRange: [0.12, 0.85], outputRange: [0, dir], extrapolate: 'clamp' }) },
                    { translateY: v.interpolate({ inputRange: [0.12, 0.5, 0.85], outputRange: [0, -70 - off, dy - off], extrapolate: 'clamp' }) },
                  ],
                }}
              />
            );
          })}
        </>
      );
    }
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#04060f', zIndex: 50, elevation: 50 },
  panel: { position: 'absolute', borderRadius: 14, overflow: 'hidden', borderWidth: 2, backgroundColor: '#0a0e1e' },
  cutIn: { position: 'absolute', zIndex: 70 },
  cutInImgWrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 2, backgroundColor: '#0a0e1e' },
  cutInNameBar: { borderWidth: 1, borderRadius: 8, backgroundColor: 'rgba(8,10,22,0.9)', paddingVertical: 4, paddingHorizontal: 8 },
  cutInName: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(8,10,22,0.85)', paddingVertical: 4, alignItems: 'center' },
  cutInNameTxt: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  cutInLine: { marginTop: 6, borderWidth: 1, borderRadius: 8, backgroundColor: 'rgba(8,10,22,0.85)', padding: 7 },
  cutInLineTxt: { color: '#ffe9b0', fontSize: 11.5, fontStyle: 'italic', lineHeight: 16 },
  plate: { position: 'absolute', flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(10,14,28,0.88)', borderWidth: 1, borderColor: '#3a4160', borderRadius: 10, padding: 7, width: 220, zIndex: 60 },
  plateFace: { width: 40, height: 40, borderRadius: 8 },
  plateName: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
  plateBarTrack: { height: 7, backgroundColor: '#0a0c12', borderRadius: 3, marginTop: 5, overflow: 'hidden' },
  plateBarFill: { height: 7, backgroundColor: '#4dff7a' },
  plateHp: { color: '#9fb0d0', fontSize: 10, marginTop: 3, textAlign: 'right' },
  banner: { position: 'absolute', top: '44%', left: 0, right: 0, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, backgroundColor: 'rgba(5,8,18,0.78)', paddingVertical: 10 },
  bannerTxt: { fontSize: 26, fontWeight: '900', letterSpacing: 6, fontStyle: 'italic' },
  impactWrap: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center' },
  impactTxt: { fontSize: 58, fontWeight: '900', fontStyle: 'italic', textShadowColor: '#000', textShadowRadius: 10 },
  impactSub: { color: '#ffd34d', fontSize: 18, fontWeight: '900', letterSpacing: 5, marginTop: 2 },
  footer: { position: 'absolute', bottom: 8, alignSelf: 'center' },
  footerTxt: { color: 'rgba(200,214,255,0.7)', fontSize: 11, letterSpacing: 2 },
});
