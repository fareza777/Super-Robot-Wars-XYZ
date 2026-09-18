# Super Robot Wars XYZ

Original-mecha tactical RPG (SRPG) inspired by Super Robot Wars. Turn-based grid combat, full battle cut-in animations, pilot spirit commands, terrain effects — built for Android/Google Play.

## Play

```bash
npm install
npx expo start        # dev server
npx expo start --web  # browser preview
```

## Build APK (local debug)

```bash
npx expo prebuild -p android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

## Play Store (EAS)

```bash
npm i -g eas-cli && eas login
eas build -p android --profile production   # → .aab for Play Console
```

## Stack

Expo (React Native) · TypeScript · Zustand · react-native-svg

## Features (v0.1)

- **Mission SSS — "Steel Sky Siege"**: 14×10 map, 4 player mecha vs 6 Imperial units incl. ace boss *Kargan Rex*
- Movement/attack range highlights, terrain DEF/EVA bonuses, EN/ammo weapons, `[No P]` = can't fire after moving
- Pilot spirit commands: Focus, Strike, Valor, Grit, Guard, Accel (SP resource)
- SRW-style battle cut-ins: melee slash dashes, beam charge/fire, missile arcs, gatling tracers, funnels — hit/miss/crit/destroyed with counters
- Enemy AI phase: advances, picks best weapon/target, counterattacks

## Structure

```
src/game/types.ts    — unit/pilot/weapon/map types
src/game/data.ts     — weapons, pilots, mecha (X/Y/Z factions), terrain, Mission SSS
src/game/engine.ts   — movement BFS, hit/damage, spirits, counterattacks, enemy AI
src/game/store.ts    — zustand game state + enemy phase driver
src/components/      — MapGrid, SidePanel, BattleScene (cut-in animations), Screens
```
