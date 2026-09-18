import React from 'react';
import Svg, { Circle, G, Path, Polygon, Rect } from 'react-native-svg';
import { UnitDef } from '../game/types';

interface Props {
  def: UnitDef;
  size: number;
  flip?: boolean;
  dimmed?: boolean;
}

/** Simple stylized mecha drawn from the unit's colors — no bitmap assets needed. */
export function MechSprite({ def, size, flip, dimmed }: Props) {
  const c = def.color;
  const a = def.accent;
  const air = def.moveType === 'air';
  const boss = !!def.boss;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={{ transform: [{ scaleX: flip ? -1 : 1 }], opacity: dimmed ? 0.45 : 1 }}>
      <G>
        {/* wings (air units) */}
        {air && (
          <>
            <Polygon points="14,20 4,8 20,26" fill={a} opacity={0.9} />
            <Polygon points="50,20 60,8 44,26" fill={a} opacity={0.9} />
          </>
        )}
        {/* legs */}
        <Rect x={24} y={44} width={6} height={14} rx={2} fill={c} />
        <Rect x={34} y={44} width={6} height={14} rx={2} fill={c} />
        <Rect x={22} y={56} width={10} height={4} rx={1.5} fill={a} />
        <Rect x={32} y={56} width={10} height={4} rx={1.5} fill={a} />
        {/* torso */}
        <Rect x={22} y={26} width={20} height={20} rx={3} fill={c} />
        <Rect x={27} y={30} width={10} height={8} rx={1.5} fill={a} opacity={0.95} />
        {/* shoulders */}
        <Rect x={12} y={24} width={10} height={12} rx={2} fill={a} />
        <Rect x={42} y={24} width={10} height={12} rx={2} fill={a} />
        {/* arms */}
        <Rect x={13} y={36} width={7} height={14} rx={2} fill={c} />
        <Rect x={44} y={36} width={7} height={14} rx={2} fill={c} />
        {/* head */}
        <Rect x={26} y={14} width={12} height={12} rx={2} fill={c} />
        <Rect x={28} y={17} width={8} height={3} rx={1} fill={a} />
        {/* antenna / crest */}
        {boss ? (
          <Path d="M32 4 L35 14 L29 14 Z" fill="#ffd34d" />
        ) : (
          <Rect x={31} y={8} width={2} height={7} fill={a} />
        )}
        {boss && (
          <>
            <Path d="M26 12 L20 4 L24 14 Z" fill="#ffd34d" />
            <Path d="M38 12 L44 4 L40 14 Z" fill="#ffd34d" />
          </>
        )}
        {/* eyes glow */}
        <Circle cx={29} cy={21} r={1.3} fill="#fff" opacity={0.9} />
        <Circle cx={35} cy={21} r={1.3} fill="#fff" opacity={0.9} />
      </G>
    </Svg>
  );
}
