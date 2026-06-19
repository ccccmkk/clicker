'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { loadGameState, saveGameState, fetchRanking, type RankEntry } from '@/lib/supabase'
import { UPGRADES, getCost, getTotalCps, formatNumber } from '@/lib/gameLogic'

type FloatingText = { id: number; x: number; y: number }

function getUserId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('cookie_user_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('cookie_user_id', id)
  }
  return id
}

function getNickname(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('cookie_nickname') || ''
}

export default function ClickerGame() {
  const [cookies, setCookies] = useState(0)
  const [totalCookies, setTotalCookies] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [upgrades, setUpgrades] = useState<Record<string, number>>({})
  const [floats, setFloats] = useState<FloatingText[]>([])
  const [cookieScale, setCookieScale] = useState(1)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'store' | 'stats' | 'rank'>('store')
  const [nickname, setNickname] = useState('')
  const [nicknameInput, setNicknameInput] = useState('')
  const [editingNick, setEditingNick] = useState(false)
  const [ranking, setRanking] = useState<RankEntry[]>([])
  const [rankLoading, setRankLoading] = useState(false)

  const cookiesRef = useRef(0)
  const totalCookiesRef = useRef(0)
  const totalClicksRef = useRef(0)
  const upgradesRef = useRef<Record<string, number>>({})
  const nicknameRef = useRef('')
  const floatId = useRef(0)
  const userId = useRef('')

  useEffect(() => {
    userId.current = getUserId()
    const savedNick = getNickname()
    nicknameRef.current = savedNick || '익명의 제빵사'
    setNickname(nicknameRef.current)

    loadGameState(userId.current).then((state) => {
      if (state) {
        cookiesRef.current = state.cookies
        totalCookiesRef.current = state.total_cookies
        totalClicksRef.current = state.total_clicks
        upgradesRef.current = state.upgrades || {}
        if (state.nickname && state.nickname !== '익명의 제빵사') {
          nicknameRef.current = state.nickname
          setNickname(state.nickname)
          localStorage.setItem('cookie_nickname', state.nickname)
        }
        setCookies(state.cookies)
        setTotalCookies(state.total_cookies)
        setTotalClicks(state.total_clicks)
        setUpgrades(state.upgrades || {})
      }
      setLoaded(true)
    })
  }, [])

  // CPS tick
  useEffect(() => {
    if (!loaded) return
    const interval = setInterval(() => {
      const cps = getTotalCps(upgradesRef.current)
      if (cps > 0) {
        const gain = cps / 20
        cookiesRef.current += gain
        totalCookiesRef.current += gain
        setCookies(cookiesRef.current)
        setTotalCookies(totalCookiesRef.current)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [loaded])

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!loaded) return
    const interval = setInterval(async () => {
      setSaving(true)
      await saveGameState({
        user_id: userId.current,
        nickname: nicknameRef.current,
        cookies: cookiesRef.current,
        total_cookies: totalCookiesRef.current,
        total_clicks: totalClicksRef.current,
        upgrades: upgradesRef.current,
      })
      setSaving(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [loaded])

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    cookiesRef.current += 1
    totalCookiesRef.current += 1
    totalClicksRef.current += 1
    setCookies(cookiesRef.current)
    setTotalCookies(totalCookiesRef.current)
    setTotalClicks(totalClicksRef.current)

    setCookieScale(0.92)
    setTimeout(() => setCookieScale(1), 100)

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = floatId.current++
    setFloats((f) => [...f, { id, x, y }])
    setTimeout(() => setFloats((f) => f.filter((t) => t.id !== id)), 900)
  }, [])

  const buyUpgrade = useCallback((upgradeId: string) => {
    const upgrade = UPGRADES.find((u) => u.id === upgradeId)
    if (!upgrade) return
    const owned = upgradesRef.current[upgradeId] || 0
    const cost = getCost(upgrade, owned)
    if (cookiesRef.current < cost) return

    cookiesRef.current -= cost
    upgradesRef.current = { ...upgradesRef.current, [upgradeId]: owned + 1 }
    setCookies(cookiesRef.current)
    setUpgrades({ ...upgradesRef.current })
  }, [])

  const saveNickname = useCallback(async () => {
    const trimmed = nicknameInput.trim().slice(0, 16)
    if (!trimmed) return
    nicknameRef.current = trimmed
    setNickname(trimmed)
    localStorage.setItem('cookie_nickname', trimmed)
    setEditingNick(false)
    await saveGameState({
      user_id: userId.current,
      nickname: trimmed,
      cookies: cookiesRef.current,
      total_cookies: totalCookiesRef.current,
      total_clicks: totalClicksRef.current,
      upgrades: upgradesRef.current,
    })
  }, [nicknameInput])

  const loadRanking = useCallback(async () => {
    setRankLoading(true)
    const data = await fetchRanking()
    setRanking(data)
    setRankLoading(false)
  }, [])

  useEffect(() => {
    if (activeTab === 'rank') loadRanking()
  }, [activeTab, loadRanking])

  const cps = getTotalCps(upgradesRef.current)
  const myRank = ranking.findIndex((r) => r.user_id === userId.current) + 1

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-amber-950 text-amber-200">
        <div className="text-2xl animate-pulse">🍪 로딩중...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-amber-950 text-amber-100 overflow-hidden select-none">
      {/* Left panel */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 relative">
        {/* Nickname bar */}
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          {editingNick ? (
            <div className="flex gap-2 items-center">
              <input
                autoFocus
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                maxLength={16}
                placeholder="닉네임 (최대 16자)"
                className="bg-amber-800 border border-amber-600 rounded px-3 py-1 text-sm text-amber-100 placeholder-amber-600 outline-none focus:border-amber-400"
              />
              <button onClick={saveNickname} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded text-sm">저장</button>
              <button onClick={() => setEditingNick(false)} className="text-amber-600 hover:text-amber-400 text-sm">취소</button>
            </div>
          ) : (
            <button
              onClick={() => { setNicknameInput(nickname); setEditingNick(true) }}
              className="text-amber-400 hover:text-amber-200 text-sm flex items-center gap-1 transition-colors"
            >
              👤 {nickname} <span className="text-amber-600 text-xs">✏️</span>
            </button>
          )}
        </div>

        <div className="text-center mt-8">
          <div className="text-5xl font-bold text-amber-300 drop-shadow-lg">
            🍪 {formatNumber(cookies)}
          </div>
          <div className="text-amber-400 text-lg mt-1">개의 쿠키</div>
          {cps > 0 && (
            <div className="text-amber-500 text-sm mt-1">초당 {formatNumber(cps)}개</div>
          )}
        </div>

        <button
          onClick={handleClick}
          style={{ transform: `scale(${cookieScale})`, transition: 'transform 0.1s' }}
          className="relative w-52 h-52 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 shadow-2xl shadow-amber-900 hover:brightness-110 active:brightness-90 cursor-pointer border-4 border-amber-300 flex items-center justify-center"
        >
          <span className="text-9xl">🍪</span>
          {floats.map((f) => (
            <span
              key={f.id}
              className="absolute text-2xl font-bold text-white pointer-events-none animate-float"
              style={{ left: f.x, top: f.y, transform: 'translate(-50%, -50%)' }}
            >
              +1
            </span>
          ))}
        </button>

        <div className="text-amber-600 text-xs text-center">
          총 클릭: {formatNumber(totalClicks)} | 총 생산: {formatNumber(totalCookies)}
        </div>

        {saving && (
          <div className="absolute bottom-4 left-4 text-amber-600 text-xs animate-pulse">
            💾 저장중...
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-80 bg-amber-900/60 border-l border-amber-800 flex flex-col">
        <div className="flex border-b border-amber-800">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'store' ? 'bg-amber-700 text-amber-100' : 'text-amber-400 hover:text-amber-200'}`}
          >
            🏪 상점
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'stats' ? 'bg-amber-700 text-amber-100' : 'text-amber-400 hover:text-amber-200'}`}
          >
            📊 통계
          </button>
          <button
            onClick={() => setActiveTab('rank')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'rank' ? 'bg-amber-700 text-amber-100' : 'text-amber-400 hover:text-amber-200'}`}
          >
            🏆 랭킹
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeTab === 'store' && UPGRADES.map((upgrade) => {
            const owned = upgrades[upgrade.id] || 0
            const cost = getCost(upgrade, owned)
            const canAfford = cookies >= cost
            return (
              <button
                key={upgrade.id}
                onClick={() => buyUpgrade(upgrade.id)}
                disabled={!canAfford}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  canAfford
                    ? 'bg-amber-800 border-amber-600 hover:bg-amber-700 hover:border-amber-400 cursor-pointer'
                    : 'bg-amber-950/50 border-amber-900 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className="text-3xl">{upgrade.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-amber-200 flex justify-between">
                    <span>{upgrade.name}</span>
                    {owned > 0 && <span className="text-amber-400 text-xs">×{owned}</span>}
                  </div>
                  <div className="text-amber-500 text-xs truncate">{upgrade.description}</div>
                  <div className="text-amber-300 text-sm font-mono">🍪 {formatNumber(cost)}</div>
                </div>
              </button>
            )
          })}

          {activeTab === 'stats' && (
            <div className="p-3 space-y-3 text-sm">
              <div className="bg-amber-800/50 rounded-lg p-3 space-y-2">
                <h3 className="font-bold text-amber-300">📈 생산 현황</h3>
                <div className="flex justify-between"><span className="text-amber-400">초당 생산</span><span>{formatNumber(cps)}/초</span></div>
                <div className="flex justify-between"><span className="text-amber-400">총 생산량</span><span>{formatNumber(totalCookies)}</span></div>
                <div className="flex justify-between"><span className="text-amber-400">총 클릭</span><span>{formatNumber(totalClicks)}</span></div>
                <div className="flex justify-between"><span className="text-amber-400">현재 보유</span><span>{formatNumber(cookies)}</span></div>
              </div>
              <div className="bg-amber-800/50 rounded-lg p-3 space-y-2">
                <h3 className="font-bold text-amber-300">🏭 건물 현황</h3>
                {UPGRADES.map((u) => {
                  const owned = upgrades[u.id] || 0
                  if (owned === 0) return null
                  return (
                    <div key={u.id} className="flex justify-between">
                      <span className="text-amber-400">{u.icon} {u.name}</span>
                      <span>{owned}개 ({formatNumber(u.baseCps * owned)}/초)</span>
                    </div>
                  )
                })}
                {Object.values(upgrades).every((v) => !v) && (
                  <div className="text-amber-600 text-xs">아직 건물이 없습니다</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rank' && (
            <div className="p-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-amber-300 text-sm">🏆 총 생산량 랭킹</h3>
                <button
                  onClick={loadRanking}
                  className="text-amber-600 hover:text-amber-400 text-xs transition-colors"
                >
                  🔄 새로고침
                </button>
              </div>

              {myRank > 0 && (
                <div className="bg-amber-700/60 border border-amber-500 rounded-lg px-3 py-2 text-xs text-center text-amber-200">
                  내 순위: <span className="font-bold text-amber-300 text-sm">#{myRank}</span>
                </div>
              )}

              {rankLoading ? (
                <div className="text-center text-amber-500 text-sm py-8 animate-pulse">
                  🍪 랭킹 불러오는 중...
                </div>
              ) : ranking.length === 0 ? (
                <div className="text-center text-amber-600 text-sm py-8">
                  아직 데이터가 없습니다
                </div>
              ) : (
                <div className="space-y-1">
                  {ranking.map((entry, i) => {
                    const isMe = entry.user_id === userId.current
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
                    return (
                      <div
                        key={entry.user_id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          isMe
                            ? 'bg-amber-600/50 border border-amber-500'
                            : 'bg-amber-900/50 border border-amber-800'
                        }`}
                      >
                        <span className="w-6 text-center text-base flex-shrink-0">{medal}</span>
                        <span className={`flex-1 truncate font-medium ${isMe ? 'text-amber-200' : 'text-amber-300'}`}>
                          {entry.nickname || '익명의 제빵사'}
                          {isMe && <span className="text-amber-500 text-xs ml-1">(나)</span>}
                        </span>
                        <span className="text-amber-400 text-xs font-mono flex-shrink-0">
                          🍪 {formatNumber(entry.total_cookies)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
