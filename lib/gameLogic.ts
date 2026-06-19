export type Upgrade = {
  id: string
  name: string
  description: string
  baseCost: number
  baseCps: number
  icon: string
}

export const UPGRADES: Upgrade[] = [
  { id: 'cursor',  name: '커서',   description: '자동으로 클릭합니다',     baseCost: 15,     baseCps: 0.1,  icon: '👆' },
  { id: 'grandma', name: '할머니', description: '쿠키를 굽는 할머니',       baseCost: 100,    baseCps: 1,    icon: '👵' },
  { id: 'farm',    name: '농장',   description: '쿠키 농장',               baseCost: 1100,   baseCps: 8,    icon: '🌾' },
  { id: 'mine',    name: '광산',   description: '쿠키 광석 채굴',           baseCost: 12000,  baseCps: 47,   icon: '⛏️' },
  { id: 'factory', name: '공장',   description: '대량 생산',               baseCost: 130000, baseCps: 260,  icon: '🏭' },
  { id: 'bank',    name: '은행',   description: '쿠키 이자',               baseCost: 1400000, baseCps: 1400, icon: '🏦' },
  { id: 'temple',  name: '신전',   description: '쿠키 신에게 기도',         baseCost: 20000000, baseCps: 7800, icon: '🛕' },
]

export function getCost(upgrade: Upgrade, owned: number): number {
  return Math.ceil(upgrade.baseCost * Math.pow(1.15, owned))
}

export function getTotalCps(upgrades: Record<string, number>): number {
  return UPGRADES.reduce((total, upgrade) => {
    const count = upgrades[upgrade.id] || 0
    return total + upgrade.baseCps * count
  }, 0)
}

export function formatNumber(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' 조'
  if (n >= 1e8)  return (n / 1e8).toFixed(2) + ' 억'
  if (n >= 1e4)  return (n / 1e4).toFixed(2) + ' 만'
  return Math.floor(n).toLocaleString()
}

export type Skin = {
  id: string
  name: string
  emoji: string
  theme: {
    bg: string
    panel: string
    border: string
    text: string
    subtext: string
    btn: string
    btnHover: string
    cookieGrad: string
  }
  unlockAt: number
}

export const SKINS: Skin[] = [
  {
    id: 'classic',
    name: '기본 쿠키',
    emoji: '🍪',
    theme: {
      bg: 'bg-amber-950',
      panel: 'bg-amber-900/70',
      border: 'border-amber-800',
      text: 'text-amber-300',
      subtext: 'text-amber-500',
      btn: 'bg-amber-800 border-amber-600',
      btnHover: 'active:bg-amber-700',
      cookieGrad: 'from-amber-400 to-amber-700',
    },
    unlockAt: 0,
  },
  {
    id: 'donut',
    name: '도넛',
    emoji: '🍩',
    theme: {
      bg: 'bg-pink-950',
      panel: 'bg-pink-900/70',
      border: 'border-pink-800',
      text: 'text-pink-300',
      subtext: 'text-pink-500',
      btn: 'bg-pink-800 border-pink-600',
      btnHover: 'active:bg-pink-700',
      cookieGrad: 'from-pink-400 to-rose-700',
    },
    unlockAt: 1000,
  },
  {
    id: 'moon',
    name: '달빛 쿠키',
    emoji: '🌕',
    theme: {
      bg: 'bg-indigo-950',
      panel: 'bg-indigo-900/70',
      border: 'border-indigo-800',
      text: 'text-indigo-300',
      subtext: 'text-indigo-400',
      btn: 'bg-indigo-800 border-indigo-600',
      btnHover: 'active:bg-indigo-700',
      cookieGrad: 'from-indigo-400 to-violet-700',
    },
    unlockAt: 50000,
  },
  {
    id: 'cake',
    name: '케이크',
    emoji: '🎂',
    theme: {
      bg: 'bg-green-950',
      panel: 'bg-green-900/70',
      border: 'border-green-800',
      text: 'text-green-300',
      subtext: 'text-green-500',
      btn: 'bg-green-800 border-green-600',
      btnHover: 'active:bg-green-700',
      cookieGrad: 'from-green-400 to-emerald-700',
    },
    unlockAt: 500000,
  },
  {
    id: 'earth',
    name: '지구 쿠키',
    emoji: '🌍',
    theme: {
      bg: 'bg-slate-950',
      panel: 'bg-slate-900/70',
      border: 'border-slate-700',
      text: 'text-cyan-300',
      subtext: 'text-slate-400',
      btn: 'bg-slate-800 border-slate-600',
      btnHover: 'active:bg-slate-700',
      cookieGrad: 'from-cyan-400 to-blue-700',
    },
    unlockAt: 5000000,
  },
]
