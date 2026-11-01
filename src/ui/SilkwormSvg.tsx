import { SILK_STAGE_COCOON, SILK_STAGE_EGG, SILK_STAGE_MOTH } from '../core';
import type { SilkBreed } from '../core';

// 蠶寶寶的造型全部由 SVG 畫出，品種只換顏色和花紋；viewBox 固定 100×100。

const OUTLINE = 'rgba(70, 45, 30, .35)';
const EYE = '#2b2230';
const BLUSH = '#ff9fb0';

interface Props {
  breed: SilkBreed;
  stage: number;
  /** 圖鑑裡還沒收集到時畫成剪影 */
  silhouette?: boolean;
  size?: number;
  label: string;
}

export function SilkwormSvg({ breed, stage, silhouette = false, size = 96, label }: Props) {
  const body = silhouette ? 'var(--line)' : breed.body;
  const pattern = silhouette ? 'var(--line)' : breed.pattern;
  return (
    <svg
      className={`silkworm-svg stage-${stage <= SILK_STAGE_EGG ? 'egg' : stage >= SILK_STAGE_MOTH ? 'moth' : stage === SILK_STAGE_COCOON ? 'cocoon' : 'larva'}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={label}
    >
      {stage <= SILK_STAGE_EGG ? (
        <Eggs />
      ) : stage === SILK_STAGE_COCOON ? (
        <Cocoon body={body} />
      ) : stage >= SILK_STAGE_MOTH ? (
        <Moth body={body} pattern={pattern} type={breed.patternType} face={!silhouette} hat={breed.hat} silhouette={silhouette} />
      ) : (
        <Larva body={body} pattern={pattern} type={breed.patternType} stage={stage} face={!silhouette} hat={breed.hat} silhouette={silhouette} />
      )}
    </svg>
  );
}

/** 卵：品種未知，一律畫成一小撮米色卵 */
function Eggs() {
  return (
    <g stroke={OUTLINE} strokeWidth="1.5" fill="#efe6d2">
      <ellipse cx="38" cy="60" rx="9" ry="7" />
      <ellipse cx="58" cy="62" rx="9" ry="7" />
      <ellipse cx="48" cy="48" rx="9" ry="7" />
      <ellipse cx="45" cy="45" rx="2.5" ry="1.5" fill="#fff" stroke="none" />
    </g>
  );
}

interface BodyProps {
  body: string;
  pattern: string;
  type: SilkBreed['patternType'];
  face: boolean;
  hat: SilkBreed['hat'];
  silhouette: boolean;
}

function Larva({ body, pattern, type, stage, face, hat, silhouette }: BodyProps & { stage: number }) {
  // 一齡最小，五齡最大；以中心點縮放
  const scale = 0.55 + stage * 0.09;
  const segments = [22, 34, 46, 58]; // 由尾巴到頭前的身體節
  return (
    <g transform={`translate(50 55) scale(${scale}) translate(-50 -55)`}>
      <g className="larva-body">
        {/* 小腳 */}
        {segments.map((x) => (
          <ellipse key={`f${x}`} cx={x} cy="70" rx="3" ry="2.2" fill={OUTLINE} />
        ))}
        {segments.map((x, i) => (
          <circle key={x} cx={x} cy="58" r={11 + i * 0.8} fill={body} stroke={OUTLINE} strokeWidth="1.5" />
        ))}
        {type === 'stripes' &&
          segments.map((x) => <rect key={`s${x}`} x={x - 2} y="46" width="4" height="12" rx="2" fill={pattern} />)}
        {type === 'spots' &&
          segments.map((x, i) => <circle key={`p${x}`} cx={x + (i % 2 ? 2 : -2)} cy="52" r="2.6" fill={pattern} />)}
        {type === 'swirl' &&
          segments.map((x) => (
            <path key={`w${x}`} d={`M${x - 3} 54 a3 3 0 1 1 3 3 a1.6 1.6 0 1 1 -1.6 -1.6`} stroke={pattern} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          ))}
        {/* 頭 */}
        <circle cx="74" cy="52" r="15" fill={body} stroke={OUTLINE} strokeWidth="1.5" />
        {face && <Face cx={74} cy={52} />}
        {hat && <Hat kind={hat} cx={74} cy={52} r={15} silhouette={silhouette} />}
      </g>
    </g>
  );
}

function Face({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx - 5} cy={cy - 1} r="2.6" fill={EYE} stroke="#fff" strokeWidth="1" />
      <circle cx={cx + 5} cy={cy - 1} r="2.6" fill={EYE} stroke="#fff" strokeWidth="1" />
      <circle cx={cx - 4.2} cy={cy - 2} r=".9" fill="#fff" />
      <circle cx={cx + 5.8} cy={cy - 2} r=".9" fill="#fff" />
      <ellipse cx={cx - 8} cy={cy + 4} rx="3" ry="1.8" fill={BLUSH} opacity=".75" />
      <ellipse cx={cx + 8} cy={cy + 4} rx="3" ry="1.8" fill={BLUSH} opacity=".75" />
      <path d={`M${cx - 2} ${cy + 4} q2 2 4 0`} stroke={EYE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Cocoon({ body }: { body: string }) {
  return (
    <g>
      <ellipse cx="50" cy="55" rx="22" ry="30" fill={body} stroke={OUTLINE} strokeWidth="1.5" />
      <g stroke="#fff" strokeWidth="1.4" fill="none" opacity=".7" strokeLinecap="round">
        <path d="M34 42 q16 8 32 0" />
        <path d="M30 56 q20 9 40 0" />
        <path d="M34 70 q16 8 32 0" />
      </g>
      <path d="M50 25 q6 -10 14 -12" stroke={OUTLINE} strokeWidth="1.2" fill="none" />
    </g>
  );
}

function Moth({ body, pattern, type, face, hat, silhouette }: BodyProps) {
  return (
    <g className="moth-body">
      <g className="wings" fill={body} stroke={OUTLINE} strokeWidth="1.5">
        <ellipse cx="30" cy="48" rx="20" ry="16" transform="rotate(-20 30 48)" />
        <ellipse cx="70" cy="48" rx="20" ry="16" transform="rotate(20 70 48)" />
        <ellipse cx="34" cy="70" rx="13" ry="10" transform="rotate(20 34 70)" />
        <ellipse cx="66" cy="70" rx="13" ry="10" transform="rotate(-20 66 70)" />
      </g>
      {type !== 'none' && (
        <g fill={pattern}>
          <circle cx="27" cy="47" r="4" />
          <circle cx="73" cy="47" r="4" />
        </g>
      )}
      <path d="M45 34 q-6 -14 -14 -16 M55 34 q6 -14 14 -16" stroke={OUTLINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="56" rx="9" ry="20" fill={body} stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="50" cy="40" r="10" fill={body} stroke={OUTLINE} strokeWidth="1.5" />
      {face && (
        <g>
          <circle cx="46" cy="40" r="2" fill={EYE} stroke="#fff" strokeWidth=".8" />
          <circle cx="54" cy="40" r="2" fill={EYE} stroke="#fff" strokeWidth=".8" />
          <ellipse cx="43" cy="45" rx="2.2" ry="1.4" fill={BLUSH} opacity=".75" />
          <ellipse cx="57" cy="45" rx="2.2" ry="1.4" fill={BLUSH} opacity=".75" />
        </g>
      )}
      {hat && <Hat kind={hat} cx={50} cy={40} r={10} silhouette={silhouette} />}
    </g>
  );
}

const HAT_COLORS = {
  bunny: { cap: '#ffffff', inner: '#ffc2d1' },
  hamster: { cap: '#f2a541', inner: '#ffc2a8' },
} as const;

/** 帽子：以頭的中心和半徑為基準（座標是給 r=15 的頭設計的，再縮放） */
function Hat({ kind, cx, cy, r, silhouette }: { kind: NonNullable<SilkBreed['hat']>; cx: number; cy: number; r: number; silhouette: boolean }) {
  const cap = silhouette ? 'var(--line)' : HAT_COLORS[kind].cap;
  const inner = silhouette ? 'var(--line)' : HAT_COLORS[kind].inner;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${r / 15})`} stroke={OUTLINE} strokeWidth="1.5">
      {kind === 'bunny' ? (
        <>
          {/* 長耳朵 */}
          <ellipse cx="-6" cy="-24" rx="4.5" ry="11" fill={cap} transform="rotate(-12 -6 -24)" />
          <ellipse cx="6" cy="-24" rx="4.5" ry="11" fill={cap} transform="rotate(12 6 -24)" />
          <ellipse cx="-6" cy="-23" rx="2" ry="7" fill={inner} stroke="none" transform="rotate(-12 -6 -23)" />
          <ellipse cx="6" cy="-23" rx="2" ry="7" fill={inner} stroke="none" transform="rotate(12 6 -23)" />
        </>
      ) : (
        <>
          {/* 圓耳朵 */}
          <circle cx="-11" cy="-12" r="5.5" fill={cap} />
          <circle cx="11" cy="-12" r="5.5" fill={cap} />
          <circle cx="-11" cy="-12" r="3" fill={inner} stroke="none" />
          <circle cx="11" cy="-12" r="3" fill={inner} stroke="none" />
        </>
      )}
      {/* 帽身蓋住頭頂 */}
      <path d="M-15.5 -4 a15.5 15.5 0 0 1 31 0 Z" fill={cap} />
      {kind === 'hamster' && <path d="M-3 -18 q3 -2 6 0 v14 h-6 Z" fill="#fff4dc" stroke="none" />}
    </g>
  );
}
