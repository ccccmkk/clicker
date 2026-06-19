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
}

export type RankEntry = {
  user_id: string
  nickname: string
  total_cookies: number
  total_clicks: number
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
  // 1. 원격 우선 시도
  try {
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (!error && data) {
      const state = { ...data, click_upgrades: data.click_upgrades || {} } as GameState
      saveLocalState(state) // 원격 성공 시 로컬에도 캐시
      return { state, source: 'remote' }
    }
  } catch {}

  // 2. 원격 실패 시 로컬 폴백
  const local = loadLocalState()
  if (local && local.user_id === userId) return { state: local, source: 'local' }

  return { state: null, source: 'none' }
}

export async function saveGameState(state: GameState): Promise<'remote' | 'local'> {
  // 항상 로컬 저장
  saveLocalState(state)

  // 원격 저장 시도
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
      .select('user_id, nickname, total_cookies, total_clicks')
      .order('total_cookies', { ascending: false })
      .limit(20)
    if (error || !data) return []
    return data as RankEntry[]
  } catch { return [] }
}
