import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})

export type GameState = {
  user_id: string
  nickname?: string
  cookies: number
  total_clicks: number
  total_cookies: number
  upgrades: Record<string, number>
  click_upgrades: Record<string, number>
  cps_estimate?: number
  click_power?: number
  defense_power?: number
  revenge_map?: Record<string, number>
}

export type RankEntry = {
  user_id: string
  nickname: string
  cookies: number
  total_cookies: number
  total_clicks: number
  cps_estimate: number
  click_power: number
  defense_power: number
}

export type StealLogEntry = {
  id: string
  attacker_id: string
  defender_id: string
  amount: number
  created_at: string
  attacker_nickname?: string
  defender_nickname?: string
}

const LOCAL_KEY = 'cookie_game_state'

export function saveLocalState(state: GameState): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)) } catch {}
}

export function loadLocalState(): GameState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameState
  } catch { return null }
}

export async function loadGameState(userId: string): Promise<{ state: GameState | null; source: 'remote' | 'local' | 'none' }> {
  try {
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (!error && data) {
      const state = { ...data, click_upgrades: data.click_upgrades || {}, revenge_map: data.revenge_map || {} } as GameState
      saveLocalState(state)
      return { state, source: 'remote' }
    }
  } catch {}

  const local = loadLocalState()
  if (local && local.user_id === userId) return { state: local, source: 'local' }

  return { state: null, source: 'none' }
}

export async function saveGameState(state: GameState): Promise<'remote' | 'local'> {
  saveLocalState(state)

  try {
    const { error } = await supabase.from('game_state').upsert(
      {
        user_id: state.user_id,
        nickname: state.nickname || '익명의 제빵사',
        cookies: Math.floor(state.cookies),
        total_clicks: state.total_clicks,
        total_cookies: Math.floor(state.total_cookies),
        upgrades: state.upgrades,
        click_upgrades: state.click_upgrades,
        cps_estimate: Math.floor(state.cps_estimate ?? 0),
        click_power: Math.floor(state.click_power ?? 1),
        defense_power: state.defense_power ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (!error) return 'remote'
  } catch {}

  return 'local'
}

export async function fetchRanking(): Promise<RankEntry[]> {
  try {
    const { data, error } = await supabase
      .from('game_state')
      .select('user_id, nickname, cookies, total_cookies, total_clicks, cps_estimate, click_power, defense_power')
      .order('total_cookies', { ascending: false })
      .limit(20)
    if (error || !data) return []
    return data as RankEntry[]
  } catch { return [] }
}

export async function breakShield(attackerId: string, defenderId: string): Promise<{ success: boolean; defense: number }> {
  try {
    const { data, error } = await supabase.rpc('break_shield', {
      p_attacker: attackerId,
      p_defender: defenderId,
    })
    if (error || !data) return { success: false, defense: -1 }
    return { success: data.success, defense: data.defense ?? 0 }
  } catch { return { success: false, defense: -1 } }
}

export async function stealCookies(attackerId: string, defenderId: string): Promise<{ success: boolean; amount?: number; reason?: string }> {
  try {
    const { data, error } = await supabase.rpc('steal_cookies', {
      p_attacker: attackerId,
      p_defender: defenderId,
    })
    if (error || !data) return { success: false, reason: 'error' }
    return data
  } catch { return { success: false, reason: 'error' } }
}

export async function regenDefense(userId: string, cps: number): Promise<{ regenerated: boolean; amount?: number }> {
  try {
    const { data, error } = await supabase.rpc('regen_defense', {
      p_user: userId,
      p_cps: cps,
    })
    if (error || !data) return { regenerated: false }
    return data
  } catch { return { regenerated: false } }
}

export async function fetchStealLog(userId: string): Promise<StealLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('steal_log')
      .select('*')
      .or(`attacker_id.eq.${userId},defender_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error || !data) return []
    // fetch nicknames
    const idSet: Record<string, true> = {}
    data.forEach(r => { idSet[r.attacker_id] = true; idSet[r.defender_id] = true })
    const ids = Object.keys(idSet)
    const { data: nickData } = await supabase
      .from('game_state')
      .select('user_id, nickname')
      .in('user_id', ids)
    const nickMap: Record<string, string> = {}
    nickData?.forEach(n => { nickMap[n.user_id] = n.nickname })
    return data.map(r => ({
      ...r,
      attacker_nickname: nickMap[r.attacker_id] || '???',
      defender_nickname: nickMap[r.defender_id] || '???',
    }))
  } catch { return [] }
}
