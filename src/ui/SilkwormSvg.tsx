import { useId } from 'react';
import { SILK_STAGE_COCOON, SILK_STAGE_EGG, SILK_STAGE_MOTH } from '../core';
import type { SilkBreed } from '../core';

// 蠶寶寶的造型全部由 SVG 畫出，品種只換顏色、花紋和帽子；viewBox 固定 100×100。

const OUTLINE = 'rgba(70, 45, 30, .35)';
const EYE = '#2b2230';
const BLUSH = '#ff9fb0';
/** 彩虹蠶用的顏色：身體 4 節＋頭依序上色，繭和蛾翅膀也用這組 */
const RAINBOW = ['#ff8a8a', '#ffb86b', '#ffe36e', '#9be38a', '#8cc8ff', '#c3a3ff'] as const;

interface Props {
  breed: SilkBreed;
  stage: number;
  /** 圖鑑裡還沒收集到時畫成剪影 */
  silhouette?: boolean;
  size?: number;
  label: string;
}

export function SilkwormSvg({ breed, stage, silhouette = false, size = 96, label }: Props) {
  // 同一頁會有很多隻蠶，漸層的 id 必須唯一；useId 產生的字元不一定能放進 url(#...)，所以只留英數字
  const gradientId = `silk-grad-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const look: Look = {
    body: silhouette ? 'var(--line)' : breed.body,
    pattern: silhouette ? 'var(--line)' : breed.pattern,
    type: silhouette ? 'none' : breed.patternType,
    hat: breed.hat,
    silhouette,
  };
  const stageClass =
    stage <= SILK_STAGE_EGG ? 'egg' : stage >= SILK_STAGE_MOTH ? 'moth' : stage === SILK_STAGE_COCOON ? 'cocoon' : 'larva';
  return (
    <svg
      className={`silkworm-svg stage-${stageClass}${breed.glow && !silhouette ? ' silk-glow' : ''}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={label}
    >
      {stage <= SILK_STAGE_EGG ? (
        <Eggs />
      ) : stage === SILK_STAGE_COCOON ? (
        <Cocoon look={look} gradientId={gradientId} />
      ) : stage >= SILK_STAGE_MOTH ? (
        <Moth look={look} />
      ) : (
        <Larva look={look} stage={stage} />
      )}
    </svg>
  );
}

interface Look {
  body: string;
  pattern: string;
  type: SilkBreed['patternType'];
  hat: SilkBreed['hat'];
  silhouette: boolean;
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

/** 以 (x, y) 為中心、半徑 r 的小月牙（開口朝右） */
function crescentPath(x: number, y: number, r: number): string {
  return `M${x} ${y - r} A${r} ${r} 0 1 0 ${x} ${y + r} A${r * 0.75} ${r * 0.75} 0 1 1 ${x} ${y - r} Z`;
}

function Larva({ look, stage }: { look: Look; stage: number }) {
  const { body, pattern, type, hat, silhouette } = look;
  // 一齡最小，五齡最大；以中心點縮放
  const scale = 0.55 + stage * 0.09;
  const segments = [22, 34, 46, 58]; // 由尾巴到頭前的身體節
  const segmentFill = (i: number) => (type === 'rainbow' ? RAINBOW[i] : body);
  return (
    <g transform={`translate(50 55) scale(${scale}) translate(-50 -55)`}>
      <g className="larva-body">
        {/* 小腳 */}
        {segments.map((x) => (
          <ellipse key={`f${x}`} cx={x} cy="70" rx="3" ry="2.2" fill={OUTLINE} />
        ))}
        {segments.map((x, i) => (
          <circle key={x} cx={x} cy="58" r={11 + i * 0.8} fill={segmentFill(i)} stroke={OUTLINE} strokeWidth="1.5" />
        ))}
        {type === 'stripes' &&
          segments.map((x) => <rect key={`s${x}`} x={x - 2} y="46" width="4" height="12" rx="2" fill={pattern} />)}
        {type === 'spots' &&
          segments.map((x, i) => <circle key={`p${x}`} cx={x + (i % 2 ? 2 : -2)} cy="52" r="2.6" fill={pattern} />)}
        {type === 'swirl' &&
          segments.map((x) => (
            <path key={`w${x}`} d={`M${x - 3} 54 a3 3 0 1 1 3 3 a1.6 1.6 0 1 1 -1.6 -1.6`} stroke={pattern} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          ))}
        {type === 'crescent' && segments.map((x) => <path key={`c${x}`} d={crescentPath(x, 53, 3.4)} fill={pattern} />)}
        {/* 頭 */}
        <circle cx="74" cy="52" r="15" fill={type === 'rainbow' ? RAINBOW[4] : body} stroke={OUTLINE} strokeWidth="1.5" />
        {!silhouette && <Face cx={74} cy={52} />}
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

function Cocoon({ look, gradientId }: { look: Look; gradientId: string }) {
  const rainbow = look.type === 'rainbow';
  return (
    <g>
      {rainbow && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {RAINBOW.map((c, i) => (
              <stop key={c} offset={i / (RAINBOW.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
      )}
      <ellipse cx="50" cy="55" rx="22" ry="30" fill={rainbow ? `url(#${gradientId})` : look.body} stroke={OUTLINE} strokeWidth="1.5" />
      <g stroke="#fff" strokeWidth="1.4" fill="none" opacity=".7" strokeLinecap="round">
        <path d="M34 42 q16 8 32 0" />
        <path d="M30 56 q20 9 40 0" />
        <path d="M34 70 q16 8 32 0" />
      </g>
      <path d="M50 25 q6 -10 14 -12" stroke={OUTLINE} strokeWidth="1.2" fill="none" />
    </g>
  );
}

function Moth({ look }: { look: Look }) {
  const { body, pattern, type, hat, silhouette } = look;
  // 四片翅膀：左上、右上、左下、右下；彩虹蠶每片不同顏色
  const wing = (i: number) => (type === 'rainbow' ? [RAINBOW[0], RAINBOW[4], RAINBOW[2], RAINBOW[3]][i] : body);
  return (
    <g className="moth-body">
      <g className="wings" stroke={OUTLINE} strokeWidth="1.5">
        <ellipse cx="30" cy="48" rx="20" ry="16" fill={wing(0)} transform="rotate(-20 30 48)" />
        <ellipse cx="70" cy="48" rx="20" ry="16" fill={wing(1)} transform="rotate(20 70 48)" />
        <ellipse cx="34" cy="70" rx="13" ry="10" fill={wing(2)} transform="rotate(20 34 70)" />
        <ellipse cx="66" cy="70" rx="13" ry="10" fill={wing(3)} transform="rotate(-20 66 70)" />
      </g>
      {type === 'crescent' && (
        <g fill={pattern}>
          <path d={crescentPath(27, 47, 5)} />
          <path d={crescentPath(73, 47, 5)} />
        </g>
      )}
      {(type === 'stripes' || type === 'spots' || type === 'swirl') && (
        <g fill={pattern}>
          <circle cx="27" cy="47" r="4" />
          <circle cx="73" cy="47" r="4" />
        </g>
      )}
      <path d="M45 34 q-6 -14 -14 -16 M55 34 q6 -14 14 -16" stroke={OUTLINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="56" rx="9" ry="20" fill={body} stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="50" cy="40" r="10" fill={body} stroke={OUTLINE} strokeWidth="1.5" />
      {!silhouette && (
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

type HatKind = NonNullable<SilkBreed['hat']>;

const HAT_COLORS: Record<HatKind, { cap: string; inner: string }> = {
  bunny: { cap: '#ffffff', inner: '#ffc2d1' },
  hamster: { cap: '#f2a541', inner: '#ffc2a8' },
  bear: { cap: '#9a6a48', inner: '#e8c39e' },
  strawberry: { cap: '#ff5a6e', inner: '#ffe36e' },
  chick: { cap: '#ffe066', inner: '#ff9f1c' },
};
const LEAF = '#5cb85c';

/** 帽子：以頭的中心和半徑為基準（座標是給 r=15 的頭設計的，再縮放）。剪影時只畫輪廓色。 */
function Hat({ kind, cx, cy, r, silhouette }: { kind: HatKind; cx: number; cy: number; r: number; silhouette: boolean }) {
  const cap = silhouette ? 'var(--line)' : HAT_COLORS[kind].cap;
  const inner = silhouette ? 'var(--line)' : HAT_COLORS[kind].inner;
  const leaf = silhouette ? 'var(--line)' : LEAF;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${r / 15})`} stroke={OUTLINE} strokeWidth="1.5">
      {/* 耳朵畫在帽身後面 */}
      {kind === 'bunny' && (
        <>
          <ellipse cx="-6" cy="-24" rx="4.5" ry="11" fill={cap} transform="rotate(-12 -6 -24)" />
          <ellipse cx="6" cy="-24" rx="4.5" ry="11" fill={cap} transform="rotate(12 6 -24)" />
          <ellipse cx="-6" cy="-23" rx="2" ry="7" fill={inner} stroke="none" transform="rotate(-12 -6 -23)" />
          <ellipse cx="6" cy="-23" rx="2" ry="7" fill={inner} stroke="none" transform="rotate(12 6 -23)" />
        </>
      )}
      {(kind === 'hamster' || kind === 'bear') && (
        <>
          <circle cx="-11" cy="-12" r={kind === 'bear' ? 6 : 5.5} fill={cap} />
          <circle cx="11" cy="-12" r={kind === 'bear' ? 6 : 5.5} fill={cap} />
          <circle cx="-11" cy="-12" r="3" fill={inner} stroke="none" />
          <circle cx="11" cy="-12" r="3" fill={inner} stroke="none" />
        </>
      )}
      {kind === 'chick' && (
        // 頭頂三根呆毛
        <path d="M0 -15 q-4 -7 -1 -10 M0 -15 q0 -8 3 -10 M0 -15 q4 -5 7 -6" stroke={silhouette ? 'var(--line)' : '#e0b400'} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      )}

      {/* 帽身蓋住頭頂；草莓帽比較高 */}
      <path d={kind === 'strawberry' ? 'M-15.5 -4 C-15 -24 15 -24 15.5 -4 Z' : 'M-15.5 -4 a15.5 15.5 0 0 1 31 0 Z'} fill={cap} />

      {kind === 'hamster' && <path d="M-3 -18 q3 -2 6 0 v14 h-6 Z" fill={silhouette ? cap : '#fff4dc'} stroke="none" />}
      {kind === 'strawberry' && (
        <>
          {/* 籽 */}
          <g fill={inner} stroke="none">
            <ellipse cx="-8" cy="-8" rx="1" ry="1.5" />
            <ellipse cx="0" cy="-11" rx="1" ry="1.5" />
            <ellipse cx="8" cy="-8" rx="1" ry="1.5" />
            <ellipse cx="-4" cy="-15" rx="1" ry="1.5" />
            <ellipse cx="4" cy="-15" rx="1" ry="1.5" />
          </g>
          {/* 蒂頭 */}
          <g fill={leaf}>
            <ellipse cx="-4.5" cy="-19" rx="4.5" ry="2" transform="rotate(-20 -4.5 -19)" />
            <ellipse cx="4.5" cy="-19" rx="4.5" ry="2" transform="rotate(20 4.5 -19)" />
            <ellipse cx="0" cy="-20" rx="2" ry="3.5" />
          </g>
          <path d="M0 -22 q1 -4 3 -5" stroke={leaf} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      )}
      {kind === 'chick' && !silhouette && (
        <g stroke="none">
          <circle cx="-5" cy="-10" r="1.6" fill={EYE} />
          <circle cx="5" cy="-10" r="1.6" fill={EYE} />
          <path d="M-3 -7.5 L3 -7.5 L0 -4 Z" fill={inner} />
        </g>
      )}
    </g>
  );
}
