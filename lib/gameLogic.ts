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

// 자동 생산 건물 - 은행 첫 구매까지 약 2시간 / 신전까지 ~3.5시간
export const UPGRADES: Upgrade[] = [
  { id: 'cursor',  name: '커서',   description: '자동 클릭',         baseCost: 50,         baseCps: 0.1,   icon: '👆' },
  { id: 'grandma', name: '할머니', description: '손수 굽는 쿠키',     baseCost: 600,        baseCps: 1.5,   icon: '👵' },
  { id: 'farm',    name: '농장',   description: '쿠키 밀 재배',       baseCost: 8000,       baseCps: 12,    icon: '🌾' },
  { id: 'mine',    name: '광산',   description: '쿠키 광석 채굴',     baseCost: 120000,     baseCps: 80,    icon: '⛏️' },
  { id: 'factory', name: '공장',   description: '대량 자동 생산',     baseCost: 2000000,    baseCps: 500,   icon: '🏭' },
  { id: 'bank',    name: '은행',   description: '쿠키 이자 수익',     baseCost: 40000000,   baseCps: 3500,  icon: '🏦' },
  { id: 'temple',  name: '신전',   description: '신의 쿠키 축복',     baseCost: 800000000,  baseCps: 25000, icon: '🛕' },
]

// 클릭 강화 업그레이드 - 클릭 노가다 보상 대폭 강화, 비용도 급등
export const CLICK_UPGRADES: ClickUpgrade[] = [
  { id: 'click1', name: '손가락 단련',   description: '클릭 파워 +3',       baseCost: 200,        baseClickPower: 3,     icon: '✊' },
  { id: 'click2', name: '철권',          description: '클릭 파워 +15',      baseCost: 6000,       baseClickPower: 15,    icon: '🤜' },
  { id: 'click3', name: '황금 손가락',   description: '클릭 파워 +60',      baseCost: 120000,     baseClickPower: 60,    icon: '👑' },
  { id: 'click4', name: '클릭 폭탄',     description: '클릭 파워 +300',     baseCost: 2500000,    baseClickPower: 300,   icon: '💥' },
  { id: 'click5', name: '신의 손길',     description: '클릭 파워 +2000',    baseCost: 60000000,   baseClickPower: 2000,  icon: '⚡' },
  { id: 'click6', name: '빅뱅 클릭',     description: '클릭 파워 +15000',   baseCost: 1500000000, baseClickPower: 15000, icon: '🌌' },
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

export type CookieSkin = {
  id: string
  name: string
  emoji: string
  grad: string
  unlockAt: number
}

export type BgTheme = {
  id: string
  name: string
  sceneEmoji: string
  desc: string
  theme: {
    bg: string
    panel: string
    border: string
    text: string
    subtext: string
    btn: string
    btnHover: string
  }
  unlockAt: number
}

export const COOKIE_SKINS: CookieSkin[] = [
  { id: 'cookie',  name: '쿠키',      emoji: '🍪', grad: 'from-amber-400 to-amber-700',    unlockAt: 0 },
  { id: 'donut',   name: '도넛',      emoji: '🍩', grad: 'from-pink-400 to-rose-600',      unlockAt: 10000 },
  { id: 'moon',    name: '달빛 쿠키', emoji: '🌕', grad: 'from-indigo-400 to-violet-700',  unlockAt: 500000 },
  { id: 'cake',    name: '케이크',    emoji: '🎂', grad: 'from-green-400 to-emerald-700',  unlockAt: 8000000 },
  { id: 'earth',   name: '지구 쿠키', emoji: '🌍', grad: 'from-cyan-400 to-blue-700',      unlockAt: 100000000 },
  { id: 'gem',     name: '보석 쿠키', emoji: '💎', grad: 'from-violet-400 to-fuchsia-700', unlockAt: 1000000000 },
]

export const BG_THEMES: BgTheme[] = [
  {
    id: 'home', name: '아늑한 집', sceneEmoji: '🏠', desc: '따뜻한 집에서 쿠키를 구워요',
    theme: { bg: 'bg-amber-950', panel: 'bg-amber-900/70', border: 'border-amber-800', text: 'text-amber-200', subtext: 'text-amber-500', btn: 'bg-amber-800 border-amber-600', btnHover: 'active:bg-amber-700' },
    unlockAt: 0,
  },
  {
    id: 'bakery', name: '빵집', sceneEmoji: '🥐', desc: '동네 빵집에서 대량 생산!',
    theme: { bg: 'bg-orange-950', panel: 'bg-orange-900/70', border: 'border-orange-800', text: 'text-orange-200', subtext: 'text-orange-500', btn: 'bg-orange-800 border-orange-600', btnHover: 'active:bg-orange-700' },
    unlockAt: 30000,
  },
  {
    id: 'field', name: '쿠키 밀밭', sceneEmoji: '🌾', desc: '광활한 밀밭에서 재료 직송',
    theme: { bg: 'bg-green-950', panel: 'bg-green-900/70', border: 'border-green-800', text: 'text-green-200', subtext: 'text-green-500', btn: 'bg-green-800 border-green-600', btnHover: 'active:bg-green-700' },
    unlockAt: 1000000,
  },
  {
    id: 'factory', name: '쿠키 공장', sceneEmoji: '🏭', desc: '자동화 공장에서 무한 생산',
    theme: { bg: 'bg-slate-950', panel: 'bg-slate-900/70', border: 'border-slate-700', text: 'text-slate-200', subtext: 'text-slate-400', btn: 'bg-slate-800 border-slate-600', btnHover: 'active:bg-slate-700' },
    unlockAt: 30000000,
  },
  {
    id: 'space', name: '우주 빵집', sceneEmoji: '🌌', desc: '은하계를 가득 채운 쿠키',
    theme: { bg: 'bg-indigo-950', panel: 'bg-indigo-900/70', border: 'border-indigo-800', text: 'text-indigo-200', subtext: 'text-indigo-400', btn: 'bg-indigo-800 border-indigo-600', btnHover: 'active:bg-indigo-700' },
    unlockAt: 500000000,
  },
]

// 하위 호환용 (ClickerGame에서 theme 접근)
export type Skin = BgTheme & { emoji: string; cookieGrad: string }
export const SKINS: Skin[] = BG_THEMES.map(b => ({
  ...b,
  emoji: COOKIE_SKINS[0].emoji,
  cookieGrad: COOKIE_SKINS[0].grad,
  theme: { ...b.theme, cookieGrad: COOKIE_SKINS[0].grad },
}))
