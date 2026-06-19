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
