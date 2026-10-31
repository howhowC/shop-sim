import type { Product } from '../core/types';

// 全部是虛構的品牌與商品。
export const PRODUCTS: readonly Product[] = [
  { id: 'wave-pro', name: '無線降噪耳機 Wave Pro', category: '3C', icon: '🎧', basePrice: 2490 },
  { id: 'kb-87', name: '機械鍵盤 青軸 87 鍵', category: '3C', icon: '⌨️', basePrice: 1890 },
  { id: 'lumo-35', name: '復古底片相機 Lumo 35', category: '3C', icon: '📷', basePrice: 3280 },
  { id: 'pocket-game', name: '掌上遊戲機 Pocket', category: '3C', icon: '🎮', basePrice: 4590 },
  { id: 'power-bank', name: '快充行動電源 10000mAh', category: '3C', icon: '🔋', basePrice: 690 },
  { id: 'cloud-chair', name: '人體工學椅 雲背款', category: '居家', icon: '🪑', basePrice: 5990 },
  { id: 'steel-cup', name: '不鏽鋼保溫杯 500ml', category: '居家', icon: '🥤', basePrice: 399 },
  { id: 'cedar-candle', name: '香氛蠟燭 雪松與海鹽', category: '居家', icon: '🕯️', basePrice: 450 },
  { id: 'monstera', name: '龜背芋盆栽 中型', category: '居家', icon: '🪴', basePrice: 580 },
  { id: 'desk-lamp', name: '護眼檯燈 暖白光', category: '居家', icon: '💡', basePrice: 1290 },
  { id: 'grey-hoodie', name: '連帽外套 霧灰色', category: '服飾', icon: '🧥', basePrice: 1190 },
  { id: 'canvas-shoes', name: '經典帆布鞋 米白', category: '服飾', icon: '👟', basePrice: 1490 },
  { id: 'tote-bag', name: '厚磅帆布托特包', category: '服飾', icon: '👜', basePrice: 590 },
  { id: 'wool-scarf', name: '羊毛圍巾 格紋', category: '服飾', icon: '🧣', basePrice: 880 },
  { id: 'lip-balm', name: '保濕護唇膏 三入組', category: '美妝', icon: '💄', basePrice: 199 },
  { id: 'sunscreen', name: '清爽防曬乳 SPF50', category: '美妝', icon: '🧴', basePrice: 420 },
  { id: 'moon-rabbit', name: '月兔公仔 限量 500 隻', category: '收藏', icon: '🐇', basePrice: 1280, limited: true },
  { id: 'star-puzzle', name: '星空拼圖 1000 片', category: '收藏', icon: '🧩', basePrice: 690 },
  { id: 'robot-kit', name: '發條機器人 復刻版', category: '收藏', icon: '🤖', basePrice: 960, limited: true },
  { id: 'vinyl', name: '黑膠唱片 城市夜曲', category: '收藏', icon: '💿', basePrice: 1180 },
];
