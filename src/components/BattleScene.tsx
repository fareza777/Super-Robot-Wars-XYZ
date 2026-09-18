import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useGame } from '../game/store';
import { UnitState, WeaponDef } from '../game/types';
import { MechSprite } from './MechSprite';

/**
 * SRW-style battle cut-in:
 * stage 0 intro slide-in -> 1 weapon banner+attack anim -> 2 impact/damage
 * -> 3 counter anim -> 4 counter impact -> 5 outro -> finishBattle()
 */

const DUR = { intro: 550, banner: 500, attack: 1150, impact: 1100, outro: 450 };

export function BattleScene() {
  const battle = useGame((s) => s.battle);
  const finishBattle = useGame((s) => s.finishBattle);
  const { width, height } = useWindowDimensions();
  const [stage, setStage] = useState(0);
  const [dmgShown, setDmgShown] = useState(0);
  const [counterDmgShown, setCounterDmgShown] = useState(0);

  const bgShift = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const defFlash = useRef(new Animated.Value(0)).current;
  const attFlash = useRef(new Animated.Value(0)).current;
  const defFall = useRef(new Animated.Value(0)).current;
  const attFall = useRef(new Animated.Value(0)).current;

  const atk = battle?.attacker;
  const def = battle?.defender;
  const hasCounter = !!battle?.result.counter && !battle.result.destroyed;

  // stage driver
  useEffect(() => {
    if (!battle) return;
    setStage(0);
    setDmgShown(0);
    setCounterDmgShown(0);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    Animated.loop(Animated.timing(bgShift, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })).start();
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

  // damage counter + shake + flash on impact stages
  useEffect(() => {
    if (!battle) return;
    if (stage === 3) {
      const r = battle.result;
      if (r.hit) {
        pulse(defFlash, shakeX);
        countUp(r.damage, setDmgShown, 700);
        if (r.destroyed)
          Animated.timing(defFall, { toValue: 1, duration: 700, delay: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
      }
    }
    if (stage === 5 && battle.result.counter) {
      const c = battle.result.counter;
      if (c.hit) {
        pulse(attFlash, shakeX);
        countUp(c.damage, setCounterDmgShown, 700);
        if (c.destroyed)
          Animated.timing(attFall, { toValue: 1, duration: 700, delay: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
      }
    }
  }, [stage]);

  if (!battle || !atk || !def) return null;
  const mech = Math.min(150, height * 0.42);

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      {/* animated starfield bg */}
      <StarField shift={bgShift} w={width} h={height} />

      {/* name plates */}
      <NamePlate unit={atk} side="left" />
      <NamePlate unit={def} side="right" />

      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: shakeX }] }]}>
        {/* attacker */}
        <Animated.View
          style={[
            styles.mech,
            {
              left: width * 0.14,
              bottom: height * 0.16,
              opacity: attFall.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                { translateY: attFall.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }) },
                { rotate: attFall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '40deg'] }) },
              ],
            },
          ]}
        >
          {stage >= 1 && stage < 4 && <AttackAnim weapon={battle.weapon} side="attacker" w={width} h={height} />}
          <MechSprite def={atk.def} size={mech} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: attFlash }]} />
        </Animated.View>

        {/* defender */}
        <Animated.View
          style={[
            styles.mech,
            {
              right: width * 0.14,
              top: height * 0.14,
              opacity: defFall.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                { translateY: defFall.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }) },
                { rotate: defFall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-40deg'] }) },
              ],
            },
          ]}
        >
          {stage >= 4 && <AttackAnim weapon={battle.result.counter!.weapon} side="defender" w={width} h={height} />}
          <MechSprite def={def.def} size={mech} flip />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: defFlash }]} />
        </Animated.View>
      </Animated.View>

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

      {/* hit chance footer */}
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

function StarField({ shift, w, h }: { shift: Animated.Value; w: number; h: number }) {
  const stars = useRef(
    Array.from({ length: 46 }, (_, i) => ({
      x: (i * 173) % w,
      y: (i * 97) % h,
      r: (i % 3) + 1,
      speed: 0.4 + (i % 5) * 0.25,
    })),
  ).current;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#05070f' }]}>
      {/* horizon grid */}
      {Array.from({ length: 7 }, (_, i) => (
        <View key={`h${i}`} style={[styles.gridLine, { top: h * 0.55 + i * i * 3.2, opacity: 0.16 + i * 0.02 }]} />
      ))}
      {stars.map((s, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: s.y,
            left: 0,
            width: s.r * 2,
            height: s.r,
            borderRadius: s.r,
            backgroundColor: '#bcd6ff',
            opacity: 0.7,
            transform: [
              {
                translateX: shift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [s.x, s.x - w * s.speed],
                }),
              },
            ],
          }}
        />
      ))}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,30,80,0.25)' }]} />
    </View>
  );
}

function NamePlate({ unit, side }: { unit: UnitState; side: 'left' | 'right' }) {
  const pct = Math.max(0, unit.hp / unit.def.maxHp);
  return (
    <View style={[styles.plate, side === 'left' ? { left: 14, bottom: 14 } : { right: 14, top: 14 }]}>
      <Text style={styles.plateName}>
        {unit.def.name} · {unit.def.pilot.callsign}
      </Text>
      <View style={styles.plateBarTrack}>
        <View style={[styles.plateBarFill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.plateHp}>
        {unit.hp}/{unit.def.maxHp}
      </Text>
    </View>
  );
}

function Banner({ text, color }: { text: string; color: string }) {
  const slide = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
  }, []);
  return (
    <Animated.View style={[styles.banner, { borderColor: color, transform: [{ translateX: slide.interpolate({ inputRange: [-1, 0], outputRange: [-420, 0] }) }] }]}>
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
  const cx = right ? w * 0.86 : w * 0.14;
  const cy = right ? h * 0.32 : h * 0.62;
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
    Animated.timing(v, { toValue: 1, duration: DUR.attack + DUR.banner, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [weapon.id]);

  // attacker sits left shooting right; defender (countering) sits right shooting left
  const fromLeft = side === 'attacker';
  const sx = fromLeft ? w * 0.2 : w * 0.8;
  const sy = fromLeft ? h * 0.5 : h * 0.36;
  const tx = fromLeft ? w * 0.82 : w * 0.16;
  const ty = fromLeft ? h * 0.32 : h * 0.62;
  const dir = tx - sx;
  const dy = ty - sy;

  switch (weapon.kind) {
    case 'melee': {
      // dash + slash line on target
      return (
        <>
          <Animated.View
            style={{
              position: 'absolute',
              left: sx,
              top: sy,
              width: 8,
              height: 46,
              backgroundColor: '#7ee7ff',
              borderRadius: 4,
              opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dir] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                { rotate: '35deg' },
                { scaleY: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.2, 1.6, 0.4] }) },
              ],
            }}
          />
        </>
      );
    }
    case 'beam': {
      return (
        <>
          {/* charge glow */}
          <Animated.View
            style={{
              position: 'absolute',
              left: sx - 14,
              top: sy - 14,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#9fd0ff',
              opacity: v.interpolate({ inputRange: [0, 0.35, 0.6, 1], outputRange: [0, 0.9, 0.9, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0, 0.35], outputRange: [0.2, 1.4] }) }],
            }}
          />
          {/* beam */}
          <Animated.View
            style={{
              position: 'absolute',
              left: sx,
              top: sy,
              width: Math.abs(dir),
              height: 10,
              borderRadius: 5,
              backgroundColor: '#7ee7ff',
              shadowColor: '#7ee7ff',
              shadowRadius: 12,
              shadowOpacity: 0.9,
              opacity: v.interpolate({ inputRange: [0, 0.38, 0.42, 0.95, 1], outputRange: [0, 0, 1, 1, 0] }),
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
                width: 10,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#ffd0a0',
                opacity: v.interpolate({ inputRange: [0, 0.15 + i * 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: v.interpolate({ inputRange: [0.1 + i * 0.1, 0.95], outputRange: [0, dir], extrapolate: 'clamp' }) },
                  { translateY: v.interpolate({ inputRange: [0.1 + i * 0.1, 0.5, 0.95], outputRange: [0, dy - 60 - i * 8, dy], extrapolate: 'clamp' }) },
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
                width: 16,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#ffe28a',
                opacity: v.interpolate({ inputRange: [0, 0.2 + i * 0.12, 0.3 + i * 0.12, 1], outputRange: [0, 0, 1, 0] }),
                transform: [{ translateX: v.interpolate({ inputRange: [0.2 + i * 0.12, 0.6 + i * 0.12], outputRange: [0, dir], extrapolate: 'clamp' }) }, { translateY: dy * 0.9 }],
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
            const off = (i - 1.5) * 26;
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  left: sx,
                  top: sy + off,
                  width: 12,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#d0a0ff',
                  opacity: v.interpolate({ inputRange: [0, 0.15, 0.9, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateX: v.interpolate({ inputRange: [0.15, 0.85], outputRange: [0, dir], extrapolate: 'clamp' }) },
                    { translateY: v.interpolate({ inputRange: [0.15, 0.5, 0.85], outputRange: [0, -60 - off, dy - off], extrapolate: 'clamp' }) },
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
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#05070f', zIndex: 50, elevation: 50 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#3a5fd0' },
  mech: { position: 'absolute' },
  plate: { position: 'absolute', backgroundColor: 'rgba(10,14,28,0.85)', borderWidth: 1, borderColor: '#3a4160', borderRadius: 8, padding: 8, width: 190, zIndex: 60 },
  plateName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  plateBarTrack: { height: 7, backgroundColor: '#0a0c12', borderRadius: 3, marginTop: 5, overflow: 'hidden' },
  plateBarFill: { height: 7, backgroundColor: '#4dff7a' },
  plateHp: { color: '#9fb0d0', fontSize: 10, marginTop: 3, textAlign: 'right' },
  banner: { position: 'absolute', top: '44%', left: 0, right: 0, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, backgroundColor: 'rgba(5,8,18,0.75)', paddingVertical: 10 },
  bannerTxt: { fontSize: 22, fontWeight: '900', letterSpacing: 4, fontStyle: 'italic' },
  impactWrap: { position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center' },
  impactTxt: { fontSize: 56, fontWeight: '900', fontStyle: 'italic', textShadowColor: '#000', textShadowRadius: 10 },
  impactSub: { color: '#ffb84d', fontSize: 15, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  footer: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  footerTxt: { color: '#6b7694', fontSize: 11, letterSpacing: 1 },
});
