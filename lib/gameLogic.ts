export type Upgrade = {
  id: string
  name: string
  description: string
  baseCost: number
  baseCps: number
  icon: string
}

export type ClickUpgrade = {
  id: string
  name: string
  description: string
  baseCost: number
  baseClickPower: number
  icon: string
}

// 자동 생산 건물 - 4~5시간 밸런스 (총 ~4억 쿠키 필요)
export const UPGRADES: Upgrade[] = [
  { id: 'cursor',  name: '커서',   description: '자동 클릭',         baseCost: 15,        baseCps: 0.1,   icon: '👆' },
  { id: 'grandma', name: '할머니', description: '손수 굽는 쿠키',     baseCost: 100,       baseCps: 1,     icon: '👵' },
  { id: 'farm',    name: '농장',   description: '쿠키 밀 재배',       baseCost: 1200,      baseCps: 8,     icon: '🌾' },
  { id: 'mine',    name: '광산',   description: '쿠키 광석 채굴',     baseCost: 14000,     baseCps: 50,    icon: '⛏️' },
  { id: 'factory', name: '공장',   description: '대량 자동 생산',     baseCost: 200000,    baseCps: 300,   icon: '🏭' },
  { id: 'bank',    name: '은행',   description: '쿠키 이자 수익',     baseCost: 3000000,   baseCps: 1800,  icon: '🏦' },
  { id: 'temple',  name: '신전',   description: '신의 쿠키 축복',     baseCost: 50000000,  baseCps: 10000, icon: '🛕' },
]

// 클릭 강화 업그레이드 - 클릭당 생산량 증가
export const CLICK_UPGRADES: ClickUpgrade[] = [
  { id: 'click1', name: '손가락 단련',   description: '클릭 파워 +2',      baseCost: 100,      baseClickPower: 2,    icon: '✊' },
  { id: 'click2', name: '철권',          description: '클릭 파워 +8',      baseCost: 2000,     baseClickPower: 8,    icon: '🤜' },
  { id: 'click3', name: '황금 손가락',   description: '클릭 파워 +30',     baseCost: 25000,    baseClickPower: 30,   icon: '👑' },
  { id: 'click4', name: '클릭 폭탄',     description: '클릭 파워 +120',    baseCost: 400000,   baseClickPower: 120,  icon: '💥' },
  { id: 'click5', name: '신의 손길',     description: '클릭 파워 +600',    baseCost: 8000000,  baseClickPower: 600,  icon: '⚡' },
  { id: 'click6', name: '빅뱅 클릭',     description: '클릭 파워 +4000',   baseCost: 150000000, baseClickPower: 4000, icon: '🌌' },
]

export function getCost(upgrade: Upgrade | ClickUpgrade, owned: number): number {
  return Math.ceil(upgrade.baseCost * Math.pow(1.15, owned))
}

export function getTotalCps(upgrades: Record<string, number>): number {
  return UPGRADES.reduce((total, u) => total + u.baseCps * (upgrades[u.id] || 0), 0)
}

export function getClickPower(clickUpgrades: Record<string, number>): number {
  return 1 + CLICK_UPGRADES.reduce((total, u) => total + u.baseClickPower * (clickUpgrades[u.id] || 0), 0)
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
    id: 'classic', name: '기본 쿠키', emoji: '🍪',
    theme: { bg: 'bg-amber-950', panel: 'bg-amber-900/70', border: 'border-amber-800', text: 'text-amber-300', subtext: 'text-amber-500', btn: 'bg-amber-800 border-amber-600', btnHover: 'active:bg-amber-700', cookieGrad: 'from-amber-400 to-amber-700' },
    unlockAt: 0,
  },
  {
    id: 'donut', name: '도넛', emoji: '🍩',
    theme: { bg: 'bg-pink-950', panel: 'bg-pink-900/70', border: 'border-pink-800', text: 'text-pink-300', subtext: 'text-pink-500', btn: 'bg-pink-800 border-pink-600', btnHover: 'active:bg-pink-700', cookieGrad: 'from-pink-400 to-rose-700' },
    unlockAt: 1000,
  },
  {
    id: 'moon', name: '달빛 쿠키', emoji: '🌕',
    theme: { bg: 'bg-indigo-950', panel: 'bg-indigo-900/70', border: 'border-indigo-800', text: 'text-indigo-300', subtext: 'text-indigo-400', btn: 'bg-indigo-800 border-indigo-600', btnHover: 'active:bg-indigo-700', cookieGrad: 'from-indigo-400 to-violet-700' },
    unlockAt: 50000,
  },
  {
    id: 'cake', name: '케이크', emoji: '🎂',
    theme: { bg: 'bg-green-950', panel: 'bg-green-900/70', border: 'border-green-800', text: 'text-green-300', subtext: 'text-green-500', btn: 'bg-green-800 border-green-600', btnHover: 'active:bg-green-700', cookieGrad: 'from-green-400 to-emerald-700' },
    unlockAt: 500000,
  },
  {
    id: 'earth', name: '지구 쿠키', emoji: '🌍',
    theme: { bg: 'bg-slate-950', panel: 'bg-slate-900/70', border: 'border-slate-700', text: 'text-cyan-300', subtext: 'text-slate-400', btn: 'bg-slate-800 border-slate-600', btnHover: 'active:bg-slate-700', cookieGrad: 'from-cyan-400 to-blue-700' },
    unlockAt: 5000000,
  },
]
