import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BattleScene } from './src/components/BattleScene';
import { MapGrid } from './src/components/MapGrid';
import { BriefingScreen, EndScreen, TitleScreen } from './src/components/Screens';
import { SidePanel } from './src/components/SidePanel';
import { useGame } from './src/game/store';

function EnemyBanner() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.enemyBanner, { opacity: v }]}>
      <Text style={styles.enemyBannerTxt}>ENEMY PHASE</Text>
    </Animated.View>
  );
}

export default function App() {
  const phase = useGame((s) => s.phase);
  const battle = useGame((s) => s.battle);

  return (
    <View style={styles.root}>
      {phase === 'title' && <TitleScreen />}
      {phase === 'briefing' && <BriefingScreen />}
      {(phase === 'player' || phase === 'enemy' || phase === 'battle') && (
        <View style={styles.gameRow}>
          <MapGrid />
          <SidePanel />
          {phase === 'enemy' && <EnemyBanner />}
        </View>
      )}
      {phase === 'victory' && <EndScreen victory />}
      {phase === 'defeat' && <EndScreen victory={false} />}
      {battle && <BattleScene key={`${battle.attacker.uid}-${battle.defender.uid}-${battle.weapon.id}`} />}
      <StatusBar style="light" hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05070f' },
  gameRow: { flex: 1, flexDirection: 'row' },
  enemyBanner: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 240,
    alignItems: 'center',
    backgroundColor: 'rgba(140,20,20,0.55)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ff5a5a',
    paddingVertical: 12,
  },
  enemyBannerTxt: { color: '#ffd0d0', fontSize: 26, fontWeight: '900', letterSpacing: 8, fontStyle: 'italic' },
});
