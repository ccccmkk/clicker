import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})

export type GameState = {
  id?: string
  user_id: string
  nickname?: string
  cookies: number
  total_clicks: number
  total_cookies: number
  upgrades: Record<string, number>
  updated_at?: string
}

export type RankEntry = {
  user_id: string
  nickname: string
  total_cookies: number
  cookies: number
}

export async function loadGameState(userId: string): Promise<GameState | null> {
  try {
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return data as GameState
  } catch {
    return null
  }
}

export async function saveGameState(state: GameState): Promise<void> {
  await supabase.from('game_state').upsert(
    {
      user_id: state.user_id,
      nickname: state.nickname || '익명의 제빵사',
      cookies: Math.floor(state.cookies),
      total_clicks: state.total_clicks,
      total_cookies: Math.floor(state.total_cookies),
      upgrades: state.upgrades,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
}

export async function fetchRanking(): Promise<RankEntry[]> {
  const { data, error } = await supabase
    .from('game_state')
    .select('user_id, nickname, total_cookies, cookies')
    .order('total_cookies', { ascending: false })
    .limit(20)

  if (error || !data) return []
  return data as RankEntry[]
}
