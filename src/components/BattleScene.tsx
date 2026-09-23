import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ART, DEFEAT_BARK, KIND_SFX, MECH_ART, PILOT_ART, SUBTITLES, UNIT_BARK, UNIT_DEFEAT_VOICE, UNIT_VOICE } from '../assets';
import { play } from '../audio';
import { bondMods } from '../game/bonds';
import { bestCounterWeapon, damageOf, hitChance, rallyBonus } from '../game/engine';
import { useGame } from '../game/store';
import { AttackResult, CounterResult, UnitState, WeaponDef } from '../game/types';

/**
 * SRW-style battle cut-in with generated anime art:
 * stage 0 intro slide-in -> 1 weapon banner+attack anim -> 2 impact/damage
 * -> 3 counter anim -> 4 counter impact -> 5 outro -> finishBattle()
 */

const DUR_BASE = { intro: 820, banner: 800, attack: 2100, impact: 1700, outro: 700 };
const DUR = { ...DUR_BASE };

/** Impact tint per weapon kind — flashes and sparks take the weapon's element color. */
const KIND_FLASH: Record<string, string> = { melee: '#aef3ff', beam: '#7ee7ff', missile: '#ffb84d', gun: '#ffe28a', funnel: '#d0a0ff' };

/** Scale every scene duration. Runs synchronously in render so child anims read scaled values. */
function scaleDur(mult: number) {
  for (const k of Object.keys(DUR) as (keyof typeof DUR)[]) DUR[k] = Math.round(DUR_BASE[k] / mult);
}

export function BattleScene() {
  const battle = useGame((s) => s.battle);
  const finishBattle = useGame((s) => s.finishBattle);
  const settings = useGame((s) => s.settings);
  scaleDur(settings.animSpeed * (settings.battleMode === 'short' ? 1.75 : 1));
  const { width, height } = useWindowDimensions();
  const [stage, setStage] = useState(0);

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
  const attDodge = useRef(new Animated.Value(0)).current;
  const defDodge = useRef(new Animated.Value(0)).current;
  const shieldAnim = useRef(new Animated.Value(0)).current;
  const screenFlash = useRef(new Animated.Value(0)).current; // full-screen hit flash
  const defKnock = useRef(new Animated.Value(0)).current; // defender knocked back on hit
  const attKnock = useRef(new Animated.Value(0)).current; // attacker knocked back on counter hit

  const atk = battle?.attacker;
  const def = battle?.defender;
  const hasCounter = !!battle?.result.counter && !battle.result.destroyed;
  const needsReaction = !!battle?.needsReaction;

  // stage driver
  useEffect(() => {
    if (!battle) return;
    setStage(0);
    fade.setValue(0);
    attEnter.setValue(0);
    defEnter.setValue(0);
    attLunge.setValue(0);
    defLunge.setValue(0);
    attDodge.setValue(0);
    defDodge.setValue(0);
    shieldAnim.setValue(0);
    screenFlash.setValue(0);
    defKnock.setValue(0);
    attKnock.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    bgZoom.setValue(0);
    Animated.timing(bgZoom, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(attEnter, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(defEnter, { toValue: 1, duration: 950, delay: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [battle]);

  useEffect(() => {
    if (!battle || battle.needsReaction) return; // wait for the player's defender reaction pick
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
  }, [battle, hasCounter, finishBattle, settings.animSpeed, settings.battleMode]);

  // audio + cut-ins + motion on attack stages
  useEffect(() => {
    if (!battle || battle.needsReaction) return;
    if (stage === 2) {
      const vk = UNIT_VOICE[battle.attacker.def.id]?.[0];
      if (vk) play(vk);
      play(KIND_SFX[battle.weapon.kind] ?? 'sfx_beam');
      Animated.sequence([
        Animated.timing(attLunge, { toValue: -0.2, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(attLunge, { toValue: 1, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(attLunge, { toValue: 0, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
    if (stage === 4 && battle.result.counter) {
      const vk = UNIT_VOICE[battle.defender.def.id]?.[1] ?? UNIT_VOICE[battle.defender.def.id]?.[0];
      if (vk) play(vk);
      play(KIND_SFX[battle.result.counter.weapon.kind] ?? 'sfx_beam');
      Animated.sequence([
        Animated.timing(defLunge, { toValue: -0.2, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(defLunge, { toValue: 1, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(defLunge, { toValue: 0, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  }, [stage]);

  // damage counter + shake + flash on impact stages
  useEffect(() => {
    if (!battle || battle.needsReaction) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (stage === 3) {
      const r = battle.result;
      if (r.hit) {
        play(r.destroyed ? 'sfx_explosion' : 'sfx_hit');
        pulse(defFlash, shakeX);
        flashScreen(screenFlash, r.destroyed);
        knockback(defKnock);
        if (r.reaction === 'defend') {
          Animated.sequence([
            Animated.timing(shieldAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(shieldAnim, { toValue: 0, duration: 480, delay: 240, useNativeDriver: true }),
          ]).start();
        }
        if (r.destroyed) {
          Animated.timing(defFall, { toValue: 1, duration: 1100, delay: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
          const dv = UNIT_DEFEAT_VOICE[battle.defender.def.id];
          if (dv) timers.push(setTimeout(() => play(dv), 650));
        }
      } else if (r.reaction === 'evade') {
        // evade pick — defender dashes aside as the shot whiffs
        Animated.sequence([
          Animated.timing(defDodge, { toValue: 1, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(defDodge, { toValue: 0, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]).start();
      }
    }
    if (stage === 5 && battle.result.counter) {
      const c = battle.result.counter;
      if (c.hit) {
        play(c.destroyed ? 'sfx_explosion' : 'sfx_hit');
        pulse(attFlash, shakeX);
        flashScreen(screenFlash, c.destroyed);
        knockback(attKnock);
        if (c.destroyed) {
          Animated.timing(attFall, { toValue: 1, duration: 1100, delay: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
          const dv = UNIT_DEFEAT_VOICE[battle.attacker.def.id];
          if (dv) timers.push(setTimeout(() => play(dv), 650));
        }
      } else {
        // counter whiffed — attacker slips aside
        Animated.sequence([
          Animated.timing(attDodge, { toValue: 1, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(attDodge, { toValue: 0, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]).start();
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  if (!battle || !atk || !def) return null;

  const PW = width * 0.415; // mech panel width — sized so both cards never overlap
  const PH = height * 0.58;
  const counterActive = stage >= 4 && !!battle.result.counter;

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={finishBattle}>
      <Animated.View style={[styles.root, { opacity: fade }]}>
      {/* bg */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: bgZoom.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.22] }) }] }]}>
        <Image cachePolicy="memory" source={ART.battleBg} style={StyleSheet.absoluteFill} contentFit="cover" />
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
                {
                  translateX: Animated.add(
                    Animated.add(
                      Animated.add(attEnter.interpolate({ inputRange: [0, 1], outputRange: [-PW * 1.2, 0] }), attLunge.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.07] })),
                      attDodge.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.05] }),
                    ),
                    attKnock.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.018] }),
                  ),
                },
                { translateY: attFall.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }) },
                { rotate: attFall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '12deg'] }) },
              ],
            },
          ]}
        >
          <Image cachePolicy="memory" source={MECH_ART[atk.def.id]} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: KIND_FLASH[battle.result.counter?.weapon.kind ?? battle.weapon.kind] ?? '#fff', opacity: attFlash }]} />
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
                {
                  translateX: Animated.add(
                    Animated.add(
                      Animated.add(defEnter.interpolate({ inputRange: [0, 1], outputRange: [PW * 1.2, 0] }), defLunge.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.07] })),
                      defDodge.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.05] }),
                    ),
                    defKnock.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.018] }),
                  ),
                },
                { translateY: defFall.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }) },
                { rotate: defFall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] }) },
              ],
            },
          ]}
        >
          <Image cachePolicy="memory" source={MECH_ART[def.def.id]} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: KIND_FLASH[battle.weapon.kind] ?? '#fff', opacity: defFlash }]} />
          {/* DEFEND pick — energy shield flashes over the defender's hull on impact */}
          {battle.result.reaction === 'defend' && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Animated.View
                style={{
                  width: '58%',
                  aspectRatio: 1,
                  borderRadius: 18,
                  borderWidth: 4,
                  borderColor: '#7ee7ff',
                  backgroundColor: 'rgba(126,231,255,0.12)',
                  opacity: shieldAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.95] }),
                  transform: [{ scale: shieldAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.14] }) }, { rotate: '45deg' }],
                }}
              />
            </View>
          )}
        </Animated.View>

        {/* attack VFX overlays */}
        {(stage === 2 || stage === 3) && <AttackAnim weapon={battle.weapon} side="attacker" w={width} h={height} />}
        {counterActive && <AttackAnim weapon={battle.result.counter!.weapon} side="defender" w={width} h={height} />}
        {stage === 2 && <SpeedLines fromLeft />}
        {counterActive && <SpeedLines fromLeft={false} />}

        {/* pilot cut-in — mounted for the whole attack+impact window */}
        {(stage === 2 || stage === 3) && <PilotCutIn key="atk" unit={atk} side="left" />}
        {counterActive && <PilotCutIn key="def" unit={def} side="right" />}
      </Animated.View>

      {/* SRW boss WARNING card — first engagement this mission */}
      {!!battle.warning && (battle.needsReaction || stage <= 1) && <WarningCard text={battle.warning} />}

      {/* defender reaction prompt — the player picks how to answer the incoming attack */}
      {battle.needsReaction && <ReactionBar attacker={atk} defender={def} weapon={battle.weapon} coverUid={battle.coverUid} />}

      {/* reaction banners for AI-chosen defend/evade */}
      {!battle.needsReaction && stage <= 2 && battle.result.reaction === 'defend' && <Banner text="DEFEND" color="#7ee7ff" />}
      {!battle.needsReaction && stage <= 2 && battle.result.reaction === 'evade' && <Banner text="EVADE" color="#b6ff9d" />}
      {!battle.needsReaction && stage <= 2 && battle.result.reaction === 'cover' && <Banner text="COVER" color="#ffd34d" />}
      {/* critical hits get their own splash — up high so it never collides with FINISH */}
      {!battle.needsReaction && stage === 3 && battle.result.hit && battle.result.crit && !battle.result.destroyed && <Banner text="⚡ CRITICAL ⚡" color="#ffd34d" pos="high" />}
      {!battle.needsReaction && stage === 3 && battle.result.hit && battle.result.graze && !battle.result.destroyed && <Banner text="≈ GRAZE" color="#9fd8ff" pos="high" />}
      {!battle.needsReaction && stage === 5 && !!battle.result.counter?.hit && battle.result.counter.crit && !battle.result.counter.destroyed && <Banner text="⚡ CRITICAL ⚡" color="#ff8a5c" pos="high" />}
      {/* killing blow on a boss — the dramatic finish */}
      {!battle.needsReaction && stage >= 3 && battle.result.destroyed && def.def.boss && <Banner text="★ FINISH ★" color="#ffd34d" />}

      {/* MAP weapon blast list */}
      {!!battle.result.splash?.length && stage >= 2 && stage <= 4 && (
        <View style={styles.splashBox} pointerEvents="none">
          <Text style={styles.splashTitle}>MAP BLAST — {battle.result.splash.length + 1} HIT ZONES</Text>
          {battle.result.splash.map((sp) => (
            <Text key={sp.uid} style={styles.splashLine} numberOfLines={1}>
              {sp.name} · {sp.hit ? `${sp.damage}${sp.destroyed ? ' DESTROYED' : ''}` : 'MISSED'}
            </Text>
          ))}
        </View>
      )}

      {/* SRW support attack — ally chips in after the main strike */}
      {!!battle.result.support && stage >= 3 && stage <= 4 && (
        <View style={styles.supportBox} pointerEvents="none">
          <Text style={styles.supportTxt}>
            ⇒ {battle.result.support.name} SUPPORT FIRE · {battle.result.support.hit ? `${battle.result.support.damage}${battle.result.support.destroyed ? ' DESTROYED' : ''}` : 'MISSED'}
          </Text>
        </View>
      )}

      {/* name plates — own their damage count-up state so ticks don't re-render the scene */}
      <HitPlate unit={def} after={battle.defenderAfter} side="right" active={stage === 3} result={battle.result} />
      <CounterPlate unit={atk} after={battle.attackerAfter} side="left" active={stage === 5} result={battle.result.counter} />

      {/* weapon banner */}
      {stage === 1 && <Banner text={battle.weapon.name} color="#ffd34d" />}
      {stage === 4 && !!battle.result.counter && <Banner text={battle.result.counter!.weapon.name} color="#ff8a5c" />}

      {/* weapon-tinted full-screen flash on every impact */}
      {stage >= 3 && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: stage === 5 ? KIND_FLASH[battle.result.counter?.weapon.kind ?? ''] ?? '#fff' : KIND_FLASH[battle.weapon.kind] ?? '#fff', opacity: screenFlash, zIndex: 55 }]}
        />
      )}

      {/* impact feedback */}
      {stage === 3 && battle.result.hit && battle.result.destroyed && <Explosion right w={width} h={height} color={KIND_FLASH[battle.weapon.kind]} />}
      {stage === 3 && battle.result.hit && !battle.result.destroyed && <SparkBurst right w={width} h={height} color={KIND_FLASH[battle.weapon.kind]} />}
      {stage === 5 && battle.result.counter?.hit && battle.result.counter.destroyed && <Explosion w={width} h={height} color={KIND_FLASH[battle.result.counter.weapon.kind]} />}
      {stage === 5 && battle.result.counter?.hit && !battle.result.counter.destroyed && <SparkBurst w={width} h={height} color={KIND_FLASH[battle.result.counter.weapon.kind]} />}

      {/* footer */}
      {!battle.needsReaction && (
        <View style={styles.footer}>
          <Text style={styles.footerTxt}>
            {battle.weapon.name} · HIT {battle.result.hitChance}% · POW {battle.weapon.power}
          </Text>
        </View>
      )}
      <View style={styles.skipHint} pointerEvents="none">
        <Text style={styles.skipTxt}>{battle.needsReaction ? 'CHOOSE YOUR REACTION' : 'TAP TO SKIP ▸▸'}</Text>
      </View>
      </Animated.View>
    </Pressable>
  );
}

/** Whole-screen hit flash — quick double strobe, brighter on a kill. */
function flashScreen(v: Animated.Value, big: boolean) {
  v.setValue(0);
  Animated.sequence([
    Animated.timing(v, { toValue: big ? 0.5 : 0.3, duration: 50, useNativeDriver: true }),
    Animated.timing(v, { toValue: 0, duration: big ? 320 : 210, useNativeDriver: true }),
  ]).start();
}

/** Small knockback jolt on the struck mech — snap out, ease back. */
function knockback(v: Animated.Value) {
  v.setValue(0);
  Animated.sequence([
    Animated.timing(v, { toValue: 1, duration: 55, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    Animated.timing(v, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
  ]).start();
}

/** Compact spark burst for ordinary (non-kill) hits — one ring + six embers. */
function SparkBurst({ w, h, right, color }: { w: number; h: number; right?: boolean; color?: string }) {
  const c = color ?? '#ffd9a0';
  const ring = useRef(new Animated.Value(0)).current;
  const parts = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      v: new Animated.Value(0),
      dx: Math.cos((i / 6) * Math.PI * 2) * (26 + (i % 3) * 12),
      dy: Math.sin((i / 6) * Math.PI * 2) * (20 + (i % 2) * 10),
    })),
  ).current;
  useEffect(() => {
    Animated.timing(ring, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    parts.forEach((p) => Animated.timing(p.v, { toValue: 1, duration: 340, easing: Easing.out(Easing.quad), useNativeDriver: true }).start());
  }, []);
  const cx = right ? w * 0.74 : w * 0.26;
  const cy = right ? h * 0.38 : h * 0.64;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={{
          position: 'absolute',
          left: cx - 22,
          top: cy - 22,
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 3,
          borderColor: c,
          opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.7] }) }],
        }}
      />
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: cx,
            top: cy,
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: i % 2 ? c : '#ffffff',
            opacity: p.v.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 0.8, 0] }),
            transform: [{ translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) }, { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) }],
          }}
        />
      ))}
    </View>
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
  const steps = 10;
  const iv = ms / steps;
  let i = 0;
  const t = setInterval(() => {
    i++;
    set(Math.round((to * i) / steps));
    if (i >= steps) clearInterval(t);
  }, iv);
  return t;
}

/** Name plate + impact text that owns its damage count-up — its ~10 state ticks re-render only this small subtree. */
function HitPlate({ unit, after, side, active, result }: { unit: UnitState; after: UnitState; side: 'left' | 'right'; active: boolean; result: AttackResult }) {
  const [dmg, setDmg] = useState(0);
  useEffect(() => {
    if (!active || !result.hit) return;
    setDmg(0);
    const iv = countUp(result.damage, setDmg, 1000);
    return () => clearInterval(iv);
  }, [active]);
  const hpShown = Math.max(0, Math.min(unit.hp, Math.max(after.hp, unit.hp - dmg)));
  return (
    <>
      <NamePlate unit={unit} hp={hpShown} side={side} />
      {active &&
        (result.hit ? (
          <ImpactText
            text={`${dmg}`}
            sub={result.crit ? 'CRITICAL!' : result.graze ? 'GRAZE' : result.destroyed ? 'DESTROYED!' : `${result.hitChance}%`}
            color={result.crit ? '#ffd34d' : result.graze ? '#9fd8ff' : result.destroyed ? '#ff5a4a' : '#fff'}
          />
        ) : (
          <ImpactText text="MISS" sub={`${result.hitChance}%`} color="#9fd0ff" />
        ))}
    </>
  );
}

function CounterPlate({ unit, after, side, active, result }: { unit: UnitState; after: UnitState; side: 'left' | 'right'; active: boolean; result: CounterResult | null }) {
  const [dmg, setDmg] = useState(0);
  useEffect(() => {
    if (!active || !result?.hit) return;
    setDmg(0);
    const iv = countUp(result.damage, setDmg, 1000);
    return () => clearInterval(iv);
  }, [active]);
  const hpShown = Math.max(0, Math.min(unit.hp, Math.max(after.hp, unit.hp - dmg)));
  return (
    <>
      <NamePlate unit={unit} hp={hpShown} side={side} />
      {active &&
        result &&
        (result.hit ? (
          <ImpactText text={`${dmg}`} sub={result.crit ? 'CRITICAL!' : result.destroyed ? 'DESTROYED!' : 'COUNTER'} color={result.crit ? '#ffd34d' : result.destroyed ? '#ff5a4a' : '#ff8a5c'} />
        ) : (
          <ImpactText text="MISS" sub="counter" color="#9fd0ff" />
        ))}
    </>
  );
}

// ---------- sub-visuals ----------

function PilotCutIn({ unit, side }: { unit: UnitState; side: 'left' | 'right' }) {
  const { width, height } = useWindowDimensions();
  const fromLeft = side === 'left';
  // horizontal voice bar in the free diagonal corner — never touches a mech card.
  // Static (no entrance anim): native-driver animations get starved by the battle scene's many concurrent values.
  const W = Math.min(320, width * 0.4);
  const IMG = Math.min(64, height * 0.19);
  // quote derived from the unit itself — attacker uses voice 1, counter voice 2; bark fallback
  const vk = side === 'left' ? UNIT_VOICE[unit.def.id]?.[0] : UNIT_VOICE[unit.def.id]?.[1] ?? UNIT_VOICE[unit.def.id]?.[0];
  const quote = (vk ? SUBTITLES[vk] : undefined) ?? UNIT_BARK[unit.def.id] ?? null;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.cutIn,
        fromLeft ? { left: width * 0.02, top: height * 0.02 } : { right: width * 0.02, bottom: height * 0.02 },
        { width: W, flexDirection: fromLeft ? 'row' : 'row-reverse', backgroundColor: 'rgba(8,10,22,0.72)', borderRadius: 10, padding: 6 },
      ]}
    >
      <View style={[styles.cutInImgWrap, { borderColor: unit.def.accent }]}>
        <Image cachePolicy="memory" source={PILOT_ART[unit.def.id]} style={{ width: IMG, height: IMG }} contentFit="cover" />
      </View>
      <View style={{ flex: 1, marginLeft: fromLeft ? 6 : 0, marginRight: fromLeft ? 0 : 6 }}>
        <View style={[styles.cutInNameBar, { borderColor: unit.def.accent }]}>
          <Text style={styles.cutInNameTxt} numberOfLines={1}>
            {unit.def.pilot.name}
          </Text>
        </View>
        {!!quote && (
          <View style={[styles.cutInLine, { borderColor: unit.def.accent }]}>
            <Text style={styles.cutInLineTxt} numberOfLines={2}>
              "{quote}"
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Last-words banner — defeat quote + portrait in the top-center, over the impact. */
function DefeatBar({ unit, flip }: { unit: UnitState; flip?: boolean }) {
  const { width, height } = useWindowDimensions();
  const line = DEFEAT_BARK[unit.def.id];
  if (!line) return null;
  const W = Math.min(420, width * 0.52);
  const IMG = Math.min(56, height * 0.17);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (width - W) / 2,
        top: height * 0.07,
        width: W,
        flexDirection: flip ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(10,8,18,0.82)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: unit.def.accent,
        padding: 7,
      }}
    >
      <Image cachePolicy="memory" source={PILOT_ART[unit.def.id]} style={{ width: IMG, height: IMG, borderRadius: 8 }} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: unit.def.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 }} numberOfLines={1}>
          {unit.def.pilot.name} — UNIT LOST
        </Text>
        <Text style={{ color: '#e8e8f0', fontSize: 11.5, fontStyle: 'italic', marginTop: 2 }} numberOfLines={2}>
          "{line}"
        </Text>
      </View>
    </View>
  );
}

function NamePlate({ unit, hp, side }: { unit: UnitState; hp?: number; side: 'left' | 'right' }) {
  const { height } = useWindowDimensions();
  const shown = hp ?? unit.hp;
  const pct = Math.max(0, shown / unit.def.maxHp);
  return (
    <View style={[styles.plate, side === 'left' ? { left: 14, bottom: 26 } : { right: 14, top: height * 0.68 }]}>
      <Image cachePolicy="memory" source={PILOT_ART[unit.def.id]} style={styles.plateFace} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <Text style={styles.plateName} numberOfLines={1}>
          {unit.def.name}{unit.phase2 ? ' Ω' : ''} · {unit.def.pilot.callsign} · Lv{unit.level}
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

function Banner({ text, color, pos }: { text: string; color: string; pos?: 'mid' | 'high' }) {
  const slide = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
  }, []);
  return (
    <Animated.View style={[styles.banner, pos === 'high' && { top: '24%' }, { borderColor: color, transform: [{ translateX: slide.interpolate({ inputRange: [-1, 0], outputRange: [-520, 0] }) }] }]}>
      <Text style={[styles.bannerTxt, { color }]}>{text}</Text>
    </Animated.View>
  );
}

function ImpactText({ text, sub, color }: { text: string; sub?: string; color: string }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    Animated.timing(rise, { toValue: 1, duration: 1150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.impactWrap, { transform: [{ scale }, { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }] }]}>
      <Text style={[styles.impactTxt, { color }]}>{text}</Text>
      {!!sub && <Text style={styles.impactSub}>{sub}</Text>}
    </Animated.View>
  );
}

function Explosion({ w, h, right, color }: { w: number; h: number; right?: boolean; color?: string }) {
  const rings = useRef(Array.from({ length: 3 }, () => new Animated.Value(0))).current;
  const parts = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      v: new Animated.Value(0),
      dx: Math.cos((i / 10) * Math.PI * 2) * (40 + (i % 4) * 18),
      dy: Math.sin((i / 10) * Math.PI * 2) * (30 + (i % 3) * 14),
      color: i % 2 ? (color ?? '#ffb84d') : '#ff5a5a',
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
            borderColor: i === 0 ? '#fff' : (color ?? '#ffb84d'),
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
      // two crossing blade streaks that sweep through the target + contact spark
      return (
        <>
          {[0, 1].map((i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: Math.min(sx, tx) - 30,
                top: ty - 8,
                width: Math.abs(dir) + 60,
                height: 15,
                opacity: v.interpolate({ inputRange: [0.08 + i * 0.16, 0.2 + i * 0.16, 0.42 + i * 0.16, 0.56 + i * 0.16, 1], outputRange: [0, 0, 1, 0, 0], extrapolate: 'clamp' }),
                transform: [
                  { rotate: `${(dir < 0 ? -1 : 1) * (i ? -27 : 37)}deg` },
                  { scaleX: v.interpolate({ inputRange: [0.08 + i * 0.16, 0.42 + i * 0.16], outputRange: [0.04, 1], extrapolate: 'clamp' }) },
                ],
              }}
            >
              <LinearGradient colors={['rgba(174,243,255,0)', '#aef3ff', '#ffffff', '#aef3ff', 'rgba(174,243,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, borderRadius: 8 }} />
            </Animated.View>
          ))}
          {/* contact spark at the blade crossing point */}
          <Animated.View
            style={{
              position: 'absolute',
              left: tx - 24,
              top: ty - 24,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#fff',
              opacity: v.interpolate({ inputRange: [0, 0.5, 0.62, 0.78, 1], outputRange: [0, 0, 1, 0, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0.5, 0.68], outputRange: [0.3, 1.9], extrapolate: 'clamp' }) }],
            }}
          />
        </>
      );
    }
    case 'beam': {
      const bx = Math.min(sx, tx);
      return (
        <>
          {/* charge orb at muzzle */}
          <Animated.View
            style={{
              position: 'absolute',
              left: sx - 19,
              top: sy - 19,
              width: 38,
              height: 38,
              borderRadius: 19,
              opacity: v.interpolate({ inputRange: [0, 0.26, 0.38, 1], outputRange: [0, 1, 0.85, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0, 0.3], outputRange: [0.2, 1.45], extrapolate: 'clamp' }) }],
            }}
          >
            <LinearGradient colors={['#ffffff', '#8ee9ff', 'rgba(126,231,255,0.15)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1, borderRadius: 19 }} />
          </Animated.View>
          {/* outer glow beam — vertical gradient gives soft edges */}
          <Animated.View
            style={{
              position: 'absolute',
              left: bx,
              top: sy - 14,
              width: Math.abs(dir),
              height: 30,
              opacity: v.interpolate({ inputRange: [0.36, 0.48, 0.92, 1], outputRange: [0, 0.9, 0.9, 0], extrapolate: 'clamp' }),
              transform: [
                { scaleX: v.interpolate({ inputRange: [0.4, 0.74], outputRange: [0.03, 1], extrapolate: 'clamp' }) },
                { scaleY: v.interpolate({ inputRange: [0.5, 0.6, 0.85, 1], outputRange: [0.75, 1.3, 0.95, 0.6], extrapolate: 'clamp' }) },
              ],
            }}
          >
            <LinearGradient colors={['rgba(126,231,255,0)', '#7ee7ff', '#ffffff', '#7ee7ff', 'rgba(126,231,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1, borderRadius: 15 }} />
          </Animated.View>
          {/* white-hot core */}
          <Animated.View
            style={{
              position: 'absolute',
              left: bx,
              top: sy - 2,
              width: Math.abs(dir),
              height: 9,
              borderRadius: 5,
              backgroundColor: '#fff',
              opacity: v.interpolate({ inputRange: [0.38, 0.5, 0.9, 1], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' }),
              transform: [{ scaleX: v.interpolate({ inputRange: [0.42, 0.72], outputRange: [0.02, 1], extrapolate: 'clamp' }) }],
            }}
          />
          {/* bloom where the beam lands */}
          <Animated.View
            style={{
              position: 'absolute',
              left: tx - 16,
              top: ty - 16,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#dffaff',
              opacity: v.interpolate({ inputRange: [0.55, 0.7, 0.85, 1], outputRange: [0, 1, 0.6, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0.55, 0.85], outputRange: [0.4, 2.2], extrapolate: 'clamp' }) }],
            }}
          />
        </>
      );
    }
    case 'missile': {
      // arcing volley: body + flame trail per missile
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => {
            const t0 = 0.05 + i * 0.075;
            const arc = -55 - (i % 3) * 22;
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  left: sx,
                  top: sy,
                  opacity: v.interpolate({ inputRange: [0, t0, 0.9, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateX: v.interpolate({ inputRange: [t0, 0.92], outputRange: [0, dir], extrapolate: 'clamp' }) },
                    { translateY: v.interpolate({ inputRange: [t0, t0 + 0.42, 0.92], outputRange: [0, dy + arc, dy], extrapolate: 'clamp' }) },
                    { rotate: v.interpolate({ inputRange: [t0, 0.92], outputRange: dir < 0 ? ['150deg', '185deg'] : ['30deg', '-5deg'] }) },
                  ],
                }}
              >
                <View style={{ width: 17, height: 7, borderRadius: 3.5, overflow: 'hidden' }}>
                  <LinearGradient colors={['#f2f5fb', '#c9d2e4', '#7d879c']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
                </View>
                <View style={{ position: 'absolute', left: -12, top: 1.5, width: 12, height: 4, borderRadius: 2, backgroundColor: '#ffb84d' }} />
              </Animated.View>
            );
          })}
          {/* impact sparks */}
          <Animated.View
            style={{
              position: 'absolute',
              left: tx - 18,
              top: ty - 18,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#ffd9a0',
              opacity: v.interpolate({ inputRange: [0.8, 0.9, 1], outputRange: [0, 1, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0.8, 1], outputRange: [0.4, 1.9] }) }],
            }}
          />
        </>
      );
    }
    case 'gun': {
      return (
        <>
          {/* muzzle flash */}
          <Animated.View
            style={{
              position: 'absolute',
              left: sx - 13,
              top: sy - 13,
              width: 26,
              height: 26,
              opacity: v.interpolate({ inputRange: [0, 0.07, 0.18, 0.3, 1], outputRange: [0, 1, 0.85, 0, 0] }),
              transform: [{ rotate: '45deg' }, { scale: v.interpolate({ inputRange: [0.05, 0.24], outputRange: [0.4, 1.7], extrapolate: 'clamp' }) }],
            }}
          >
            <LinearGradient colors={['#fff', '#ffe28a']} style={{ flex: 1, borderRadius: 4 }} />
          </Animated.View>
          {Array.from({ length: 5 }, (_, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: sx,
                top: sy,
                width: 24,
                height: 4,
                opacity: v.interpolate({ inputRange: [0, 0.1 + i * 0.1, 0.18 + i * 0.1, 0.62, 1], outputRange: [0, 0, 1, 1, 0] }),
                transform: [
                  { translateX: v.interpolate({ inputRange: [0.12 + i * 0.1, 0.55 + i * 0.1], outputRange: [0, dir], extrapolate: 'clamp' }) },
                  { translateY: dy * 0.85 + (i - 2) * 4 },
                ],
              }}
            >
              <LinearGradient colors={['rgba(255,226,138,0)', '#ffe28a', '#fff']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, borderRadius: 2 }} />
            </Animated.View>
          ))}
        </>
      );
    }
    case 'funnel': {
      // drones launch, spread, converge on the target, then each fires a thin beam
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            const ox = Math.cos(a) * 64;
            const oy = Math.sin(a) * 38;
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  left: sx,
                  top: sy,
                  width: 14,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e8d0ff',
                  shadowColor: '#b06cff',
                  shadowRadius: 9,
                  shadowOpacity: 1,
                  opacity: v.interpolate({ inputRange: [0, 0.1, 0.92, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateX: v.interpolate({ inputRange: [0.1, 0.45, 0.78, 0.95], outputRange: [0, ox, dir * 0.8 + ox * 0.3, dir], extrapolate: 'clamp' }) },
                    { translateY: v.interpolate({ inputRange: [0.1, 0.45, 0.78, 0.95], outputRange: [0, oy, dy * 0.8 + oy * 0.3, dy], extrapolate: 'clamp' }) },
                  ],
                }}
              />
            );
          })}
          {Array.from({ length: 6 }, (_, i) => (
            <Animated.View
              key={`b${i}`}
              style={{
                position: 'absolute',
                left: tx - 20,
                top: ty - 44 + i * 15,
                width: 46,
                height: 3,
                opacity: v.interpolate({ inputRange: [0.78, 0.85, 0.95, 1], outputRange: [0, 1, 1, 0] }),
                transform: [{ rotate: dir < 0 ? '168deg' : '-12deg' }],
              }}
            >
              <LinearGradient colors={['rgba(208,160,255,0)', '#d0a0ff', '#fff']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, borderRadius: 2 }} />
            </Animated.View>
          ))}
        </>
      );
    }
    default:
      return null;
  }
}

/** diagonal speedline streaks sweeping behind the attack */
function SpeedLines({ fromLeft }: { fromLeft: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: DUR.attack, easing: Easing.linear, useNativeDriver: true }).start();
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 7 }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: height * (0.1 + i * 0.11),
            left: 0,
            width: width * 0.45,
            height: 2,
            backgroundColor: 'rgba(255,255,255,0.4)',
            opacity: v.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 0.55, 0.55, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: fromLeft ? [-width * 0.5, width * 1.05] : [width * 1.05, -width * 0.5] }) },
              { skewX: '-16deg' },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** SRW boss encounter WARNING — flashes over the intro before the first exchange. */
function WarningCard({ text }: { text: string }) {
  const { width } = useWindowDimensions();
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(blink, { toValue: 0.35, duration: 320, useNativeDriver: true }), Animated.timing(blink, { toValue: 1, duration: 320, useNativeDriver: true })]), { iterations: 4 }).start();
  }, []);
  const W = Math.min(430, width * 0.5);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: (width - W) / 2, top: '34%', width: W, zIndex: 80 }}>
      <Animated.View style={{ opacity: blink, borderWidth: 2, borderColor: '#ff3a3a', borderRadius: 10, backgroundColor: 'rgba(40,4,8,0.88)', paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ color: '#ff5a5a', fontSize: 26, fontWeight: '900', letterSpacing: 8 }}>⚠ WARNING ⚠</Text>
        <Text style={{ color: '#ffd0d0', fontSize: 12.5, fontWeight: '800', marginTop: 6, letterSpacing: 1.5 }} numberOfLines={1}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

/** Defender reaction pick — COUNTER / DEFEND / EVADE with a live auto-counter countdown. */
function ReactionBar({ attacker, defender, weapon, coverUid }: { attacker: UnitState; defender: UnitState; weapon: WeaponDef; coverUid?: string }) {
  const { width } = useWindowDimensions();
  const setReaction = useGame((s) => s.setReaction);
  const battle = useGame((s) => s.battle);
  const map = useGame((s) => s.map);
  const units = useGame((s) => s.units);
  const countdown = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    countdown.setValue(1);
    Animated.timing(countdown, { toValue: 0, duration: 5200, easing: Easing.linear, useNativeDriver: false }).start();
  }, []);

  // live forecast: use CURRENT states for accurate numbers
  const attNow = units.find((u) => u.uid === attacker.uid) ?? attacker;
  const defNow = units.find((u) => u.uid === defender.uid) ?? defender;
  const bmA = bondMods(useGame.getState().bonds, units, attNow);
  const bmD = bondMods(useGame.getState().bonds, units, defNow);
  const inHc = hitChance(attNow, defNow, weapon, map, bmA.hitBonus + rallyBonus(units, attNow));
  const inDmg = damageOf(attNow, defNow, weapon, map, false, bmA.dmgMult);
  const cw = bestCounterWeapon(defNow, attNow.pos);
  const cDmg = cw ? damageOf(defNow, attNow, cw, map, false, bmD.dmgMult) : 0;
  const cHc = cw ? hitChance(defNow, attNow, cw, map, bmD.hitBonus) : 0;
  const cover = coverUid ? units.find((u) => u.uid === coverUid) : undefined;

  const W = Math.min(cover ? 760 : 620, width * 0.86);
  const Btn2 = ({ label, sub, color, onPress }: { label: string; sub: string; color: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ flex: 1, borderWidth: 1.5, borderColor: color, borderRadius: 10, backgroundColor: 'rgba(10,14,30,0.9)', paddingVertical: 9, alignItems: 'center' }}>
      <Text style={{ color, fontSize: 15, fontWeight: '900', letterSpacing: 2 }}>{label}</Text>
      <Text style={{ color: '#9fb0d0', fontSize: 9.5, marginTop: 3 }} numberOfLines={1}>
        {sub}
      </Text>
    </Pressable>
  );
  return (
    <View style={{ position: 'absolute', bottom: '6%', left: (width - W) / 2, width: W, zIndex: 90 }}>
      <View style={{ borderWidth: 1.5, borderColor: '#ffd34d', borderRadius: 12, backgroundColor: 'rgba(8,10,24,0.92)', padding: 10 }}>
        <Text style={{ color: '#ffd34d', fontSize: 12, fontWeight: '900', letterSpacing: 2, textAlign: 'center' }}>
          INCOMING — {weapon.name} · {inHc}% · ~{inDmg} DMG
        </Text>
        <Text style={{ color: '#8fa1c7', fontSize: 10, textAlign: 'center', marginTop: 2 }}>How should {defNow.def.pilot.name} answer?</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Btn2 label="COUNTER" sub={cw ? `${cw.name} · ~${cDmg} (${cHc}%)` : 'no weapon in range'} color="#ff8a5c" onPress={() => setReaction('counter')} />
          <Btn2 label="DEFEND" sub="damage halved · no counter" color="#7ee7ff" onPress={() => setReaction('defend')} />
          <Btn2 label="EVADE" sub={`-30% enemy hit${(defNow.dodges ?? 0) > 0 ? ` · EV decayed ×${defNow.dodges}` : ''} · no counter`} color="#b6ff9d" onPress={() => setReaction('evade')} />
          {cover && <Btn2 label="COVER" sub={`${cover.def.pilot.name} intercepts · -30% dmg`} color="#ffd34d" onPress={() => setReaction('cover')} />}
        </View>
        <View style={{ height: 3, backgroundColor: '#141828', borderRadius: 2, marginTop: 9, overflow: 'hidden' }}>
          <Animated.View style={{ height: 3, width: countdown.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: '#ffd34d' }} />
        </View>
        <Text style={{ color: '#5a6484', fontSize: 8.5, textAlign: 'center', marginTop: 3 }}>auto-COUNTER when the bar empties</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#04060f', zIndex: 50, elevation: 50 },
  supportBox: { position: 'absolute', left: '6%', top: '12%', backgroundColor: 'rgba(10,20,14,0.85)', borderWidth: 1, borderColor: '#7ee0a0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  supportTxt: { color: '#7ee0a0', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  splashBox: { position: 'absolute', top: '12%', left: '30%', right: '30%', alignItems: 'center', backgroundColor: 'rgba(10,12,26,0.85)', borderWidth: 1, borderColor: '#ffb84d', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, zIndex: 75 },
  splashTitle: { color: '#ffb84d', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  splashLine: { color: '#e6ecff', fontSize: 10.5, fontWeight: '700', marginTop: 2 },
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
  footer: { position: 'absolute', bottom: 24, alignSelf: 'center' },
  footerTxt: { color: 'rgba(200,214,255,0.7)', fontSize: 11, letterSpacing: 2 },
  skipHint: { position: 'absolute', top: 10, right: 14, backgroundColor: 'rgba(8,12,28,0.55)', borderWidth: 1, borderColor: 'rgba(126,231,255,0.4)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  skipTxt: { color: 'rgba(200,214,255,0.75)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
});
