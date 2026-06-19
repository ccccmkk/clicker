'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { loadGameState, saveGameState, fetchRanking, supabase, type RankEntry } from '@/lib/supabase'
import { UPGRADES, SKINS, getCost, getTotalCps, formatNumber, type Skin } from '@/lib/gameLogic'

type FloatingText = { id: number; x: number; y: number; text: string; color: string }
type Building = { id: number; upgradeId: string; x: number; y: number; animOffset: number }
type GoldenCookie = { id: number; x: number; y: number }

function getUserId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('cookie_user_id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('cookie_user_id', id) }
  return id
}

function getSavedNickname(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('cookie_nickname') || ''
}

function getSavedSkin(): string {
  if (typeof window === 'undefined') return 'classic'
  return localStorage.getItem('cookie_skin') || 'classic'
}

export default function ClickerGame() {
  const [cookies, setCookies] = useState(0)
  const [totalCookies, setTotalCookies] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [upgrades, setUpgrades] = useState<Record<string, number>>({})
  const [floats, setFloats] = useState<FloatingText[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [cookieScale, setCookieScale] = useState(1)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'store' | 'rank' | 'skin'>('store')
  const [nickname, setNickname] = useState('')
  const [nicknameInput, setNicknameInput] = useState('')
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [editingNick, setEditingNick] = useState(false)
  const [ranking, setRanking] = useState<RankEntry[]>([])
  const [goldenCookie, setGoldenCookie] = useState<GoldenCookie | null>(null)
  const [activeSkinId, setActiveSkinId] = useState('classic')
  const [tick, setTick] = useState(0)

  const cookiesRef = useRef(0)
  const totalCookiesRef = useRef(0)
  const totalClicksRef = useRef(0)
  const upgradesRef = useRef<Record<string, number>>({})
  const nicknameRef = useRef('')
  const floatId = useRef(0)
  const buildingId = useRef(0)
  const goldenId = useRef(0)
  const userId = useRef('')

  const skin: Skin = SKINS.find(s => s.id === activeSkinId) ?? SKINS[0]

  const rebuildBuildings = useCallback((ups: Record<string, number>) => {
    const list: Building[] = []
    UPGRADES.forEach((upgrade) => {
      const count = Math.min(ups[upgrade.id] || 0, 10)
      for (let i = 0; i < count; i++) {
        list.push({
          id: buildingId.current++,
          upgradeId: upgrade.id,
          x: 5 + Math.random() * 85,
          y: 52 + Math.random() * 42,
          animOffset: Math.random() * 3000,
        })
      }
    })
    setBuildings(list)
  }, [])

  useEffect(() => {
    userId.current = getUserId()
    setActiveSkinId(getSavedSkin())
    const savedNick = getSavedNickname()
    if (!savedNick) {
      setShowNicknameModal(true)
    } else {
      nicknameRef.current = savedNick
      setNickname(savedNick)
    }

    const timeout = setTimeout(() => setLoaded(true), 4000)
    loadGameState(userId.current).then((state) => {
      clearTimeout(timeout)
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
        rebuildBuildings(state.upgrades || {})
      }
      setLoaded(true)
    }).catch(() => { clearTimeout(timeout); setLoaded(true) })
  }, [rebuildBuildings])

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
      setTick(t => t + 1)
    }, 50)
    return () => clearInterval(interval)
  }, [loaded])

  // Auto-save every 5s
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

  // Realtime ranking
  useEffect(() => {
    fetchRanking().then(setRanking)
    const channel = supabase
      .channel('ranking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        fetchRanking().then(setRanking)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // 황금 쿠키: 40~90초마다 등장, 10초 후 사라짐
  useEffect(() => {
    if (!loaded) return
    const schedule = () => {
      const delay = 40000 + Math.random() * 50000
      return setTimeout(() => {
        const id = goldenId.current++
        const x = 10 + Math.random() * 75
        const y = 15 + Math.random() * 55
        setGoldenCookie({ id, x, y })
        setTimeout(() => setGoldenCookie(c => c?.id === id ? null : c), 10000)
        schedule()
      }, delay)
    }
    const t = schedule()
    return () => clearTimeout(t)
  }, [loaded])

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    cookiesRef.current += 1
    totalCookiesRef.current += 1
    totalClicksRef.current += 1
    setCookies(cookiesRef.current)
    setTotalCookies(totalCookiesRef.current)
    setTotalClicks(totalClicksRef.current)
    setCookieScale(0.88)
    setTimeout(() => setCookieScale(1), 100)

    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
    let cx: number, cy: number
    if ('touches' in e && e.touches[0]) {
      cx = e.touches[0].clientX - rect.left; cy = e.touches[0].clientY - rect.top
    } else if ('clientX' in e) {
      cx = e.clientX - rect.left; cy = e.clientY - rect.top
    } else {
      cx = rect.width / 2; cy = rect.height / 2
    }
    const id = floatId.current++
    setFloats(f => [...f, { id, x: cx, y: cy, text: '+1', color: 'text-white' }])
    setTimeout(() => setFloats(f => f.filter(t => t.id !== id)), 900)
  }, [])

  const handleGoldenClick = useCallback(() => {
    const bonus = Math.max(13, Math.floor(cookiesRef.current * 0.05))
    cookiesRef.current += bonus
    totalCookiesRef.current += bonus
    setCookies(cookiesRef.current)
    setTotalCookies(totalCookiesRef.current)
    setGoldenCookie(null)
    const id = floatId.current++
    setFloats(f => [...f, { id, x: 50, y: 50, text: `+${formatNumber(bonus)}✨`, color: 'text-yellow-300' }])
    setTimeout(() => setFloats(f => f.filter(t => t.id !== id)), 1400)
  }, [])

  const buyUpgrade = useCallback((upgradeId: string) => {
    const upgrade = UPGRADES.find(u => u.id === upgradeId)
    if (!upgrade) return
    const owned = upgradesRef.current[upgradeId] || 0
    const cost = getCost(upgrade, owned)
    if (cookiesRef.current < cost) return
    cookiesRef.current -= cost
    upgradesRef.current = { ...upgradesRef.current, [upgradeId]: owned + 1 }
    setCookies(cookiesRef.current)
    const newUpgrades = { ...upgradesRef.current }
    setUpgrades(newUpgrades)
    rebuildBuildings(newUpgrades)
  }, [rebuildBuildings])

  const confirmNickname = useCallback(async () => {
    const trimmed = nicknameInput.trim().slice(0, 16) || '익명의 제빵사'
    nicknameRef.current = trimmed
    setNickname(trimmed)
    localStorage.setItem('cookie_nickname', trimmed)
    setShowNicknameModal(false)
    setEditingNick(false)
    await saveGameState({
      user_id: userId.current, nickname: trimmed,
      cookies: cookiesRef.current, total_cookies: totalCookiesRef.current,
      total_clicks: totalClicksRef.current, upgrades: upgradesRef.current,
    })
  }, [nicknameInput])

  const selectSkin = useCallback((skinId: string) => {
    setActiveSkinId(skinId)
    localStorage.setItem('cookie_skin', skinId)
  }, [])

  const cps = getTotalCps(upgradesRef.current)
  const myRank = ranking.findIndex(r => r.user_id === userId.current) + 1
  const unlockedSkins = SKINS.filter(s => totalCookies >= s.unlockAt)

  // 닉네임 모달
  if (showNicknameModal) {
    return (
      <div className="fixed inset-0 bg-amber-950 flex items-center justify-center p-6">
        <div className="bg-amber-900 border-2 border-amber-600 rounded-2xl p-8 w-full max-w-sm text-center space-y-5">
          <div className="text-6xl">🍪</div>
          <h1 className="text-2xl font-bold text-amber-200">쿠키 클리커</h1>
          <p className="text-amber-400 text-sm">쿠키 제국의 이름을 정해주세요!</p>
          <input
            autoFocus
            value={nicknameInput}
            onChange={e => setNicknameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmNickname()}
            maxLength={16}
            placeholder="닉네임 입력 (최대 16자)"
            className="w-full bg-amber-800 border border-amber-600 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-600 outline-none focus:border-amber-400 text-center text-lg"
          />
          <button onClick={confirmNickname} className="w-full bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold py-3 rounded-xl text-lg">
            시작하기 🍪
          </button>
          <button onClick={() => { setNicknameInput('익명의 제빵사'); setTimeout(confirmNickname, 0) }} className="text-amber-600 text-sm">
            건너뛰기
          </button>
        </div>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className={`flex items-center justify-center h-screen ${skin.theme.bg} ${skin.theme.text}`}>
        <div className="text-2xl animate-pulse">{skin.emoji} 로딩중...</div>
      </div>
    )
  }

  const now = Date.now()

  return (
    <div className={`flex flex-col h-screen ${skin.theme.bg} text-white overflow-hidden select-none`}>

      {/* 상단 쿠키 영역 */}
      <div className="relative flex-none" style={{ height: '52vh' }}>

        {/* 건물들 */}
        {buildings.map((b) => {
          const upgrade = UPGRADES.find(u => u.id === b.upgradeId)!
          const t = (now + b.animOffset) / 1000
          const bobY = Math.sin(t * (b.upgradeId === 'cursor' ? 3 : 1.2)) * 4
          const rotate = b.upgradeId === 'cursor' ? Math.sin(t * 3) * 20 : Math.sin(t * 0.8) * 5
          const size = b.upgradeId === 'cursor' ? '1rem'
            : b.upgradeId === 'grandma' ? '1.5rem'
            : b.upgradeId === 'farm' ? '1.6rem'
            : '1.8rem'
          return (
            <span
              key={b.id}
              className="absolute pointer-events-none leading-none"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                fontSize: size,
                transform: `translateY(${bobY}px) rotate(${rotate}deg)`,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
            >
              {upgrade.icon}
            </span>
          )
        })}

        {/* 황금 쿠키 */}
        {goldenCookie && (
          <button
            key={goldenCookie.id}
            onClick={handleGoldenClick}
            className="absolute z-30 animate-bounce"
            style={{ left: `${goldenCookie.x}%`, top: `${goldenCookie.y}%`, transform: 'translate(-50%,-50%)' }}
          >
            <span className="text-4xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px gold)' }}>✨</span>
          </button>
        )}

        {/* 플로팅 텍스트 */}
        {floats.map(f => (
          <span
            key={f.id}
            className={`absolute text-xl font-bold pointer-events-none animate-float ${f.color} z-40`}
            style={{ left: `${f.x}px`, top: `${f.y}px`, transform: 'translate(-50%,-50%)' }}
          >
            {f.text}
          </span>
        ))}

        {/* 닉네임 */}
        <div className="absolute top-2 left-0 right-0 flex justify-center z-20">
          {editingNick ? (
            <div className={`flex gap-2 items-center ${skin.theme.panel} rounded-xl px-3 py-1 border ${skin.theme.border}`}>
              <input autoFocus value={nicknameInput} onChange={e => setNicknameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmNickname()}
                maxLength={16} className="bg-transparent text-sm outline-none w-28" placeholder="새 닉네임" />
              <button onClick={confirmNickname} className={`${skin.theme.text} text-sm font-bold`}>✓</button>
              <button onClick={() => setEditingNick(false)} className={`${skin.theme.subtext} text-sm`}>✕</button>
            </div>
          ) : (
            <button onClick={() => { setNicknameInput(nickname); setEditingNick(true) }}
              className={`${skin.theme.subtext} text-xs flex items-center gap-1`}>
              👤 {nickname} ✏️
            </button>
          )}
        </div>

        {/* 쿠키 수 */}
        <div className="absolute top-8 left-0 right-0 flex flex-col items-center z-10 pointer-events-none">
          <div className={`text-4xl font-bold ${skin.theme.text} drop-shadow-lg`}>
            {skin.emoji} {formatNumber(cookies)}
          </div>
          {cps > 0 && <div className={`${skin.theme.subtext} text-xs mt-0.5`}>초당 {formatNumber(cps)}개</div>}
        </div>

        {/* 쿠키 버튼 */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <button
            onClick={handleClick}
            onTouchStart={e => { e.preventDefault(); handleClick(e) }}
            style={{ transform: `scale(${cookieScale})`, transition: 'transform 0.08s' }}
            className={`relative w-36 h-36 rounded-full bg-gradient-to-br ${skin.theme.cookieGrad} shadow-2xl active:brightness-90 border-4 border-white/20 flex items-center justify-center touch-none`}
          >
            <span className="text-7xl">{skin.emoji}</span>
          </button>
        </div>

        {saving && <div className={`absolute bottom-1 right-2 ${skin.theme.subtext} text-xs animate-pulse`}>💾</div>}
      </div>

      {/* 하단 패널 */}
      <div className={`flex-1 flex flex-col ${skin.theme.panel} border-t ${skin.theme.border} min-h-0`}>
        {/* 탭 */}
        <div className={`flex border-b ${skin.theme.border} flex-shrink-0`}>
          {(['store', 'rank', 'skin'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${activeTab === tab ? 'bg-white/10 text-white' : skin.theme.subtext}`}>
              {tab === 'store' ? '🏪 상점'
                : tab === 'rank' ? `🏆 랭킹${myRank > 0 ? ` #${myRank}` : ''}`
                : `🎨 스킨 (${unlockedSkins.length}/${SKINS.length})`}
            </button>
          ))}
        </div>

        {/* 상점 */}
        {activeTab === 'store' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <div className={`${skin.theme.subtext} text-xs px-1 pb-1`}>
              클릭 {formatNumber(totalClicks)} · 총 {formatNumber(totalCookies)}
            </div>
            {UPGRADES.map(upgrade => {
              const owned = upgrades[upgrade.id] || 0
              const cost = getCost(upgrade, owned)
              const canAfford = cookies >= cost
              const progress = Math.min(cookies / cost, 1)
              return (
                <button key={upgrade.id} onClick={() => buyUpgrade(upgrade.id)} disabled={!canAfford}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left relative overflow-hidden ${
                    canAfford ? `${skin.theme.btn} ${skin.theme.btnHover}` : 'bg-white/5 border-white/10 opacity-60'
                  }`}
                >
                  <div className="absolute inset-0 bg-white/10 pointer-events-none" style={{ width: `${progress * 100}%`, transition: 'width 0.3s' }} />
                  <span className="text-3xl relative z-10">{upgrade.icon}</span>
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-white">{upgrade.name}</span>
                      {owned > 0 && <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">×{owned}</span>}
                    </div>
                    <div className={`${skin.theme.subtext} text-xs`}>{upgrade.description} · {upgrade.baseCps}/초</div>
                    <div className={`text-sm font-mono mt-0.5 ${canAfford ? skin.theme.text : skin.theme.subtext}`}>
                      {skin.emoji} {formatNumber(cost)}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* 랭킹 */}
        {activeTab === 'rank' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <div className={`${skin.theme.subtext} text-xs px-1 pb-1 flex items-center gap-1.5`}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              실시간 업데이트
            </div>
            {ranking.length === 0 ? (
              <div className={`${skin.theme.subtext} text-sm text-center py-8`}>데이터 없음</div>
            ) : ranking.map((entry, i) => {
              const isMe = entry.user_id === userId.current
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              return (
                <div key={entry.user_id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${
                    isMe ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span className="w-7 text-center text-base flex-shrink-0">
                    {medal ?? <span className={`${skin.theme.subtext} text-xs`}>{i + 1}</span>}
                  </span>
                  <span className={`flex-1 truncate font-medium ${isMe ? 'text-white' : 'text-white/80'}`}>
                    {entry.nickname || '익명의 제빵사'}
                    {isMe && <span className={`${skin.theme.subtext} text-xs ml-1`}>(나)</span>}
                  </span>
                  <span className={`${skin.theme.subtext} text-xs font-mono flex-shrink-0`}>
                    {skin.emoji} {formatNumber(entry.total_cookies)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* 스킨 */}
        {activeTab === 'skin' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className={`${skin.theme.subtext} text-xs px-1 pb-1`}>쿠키 & 테마 스킨 선택</div>
            {SKINS.map(s => {
              const unlocked = totalCookies >= s.unlockAt
              const active = activeSkinId === s.id
              return (
                <button key={s.id} onClick={() => unlocked && selectSkin(s.id)} disabled={!unlocked}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    active ? 'border-white/60 bg-white/20'
                    : unlocked ? `${skin.theme.btn} hover:bg-white/10`
                    : 'bg-white/5 border-white/10 opacity-50'
                  }`}
                >
                  <span className="text-4xl">{s.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {s.name}
                      {active && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">사용중</span>}
                      {!unlocked && <span className={`text-xs ${skin.theme.subtext}`}>🔒</span>}
                    </div>
                    <div className={`${skin.theme.subtext} text-xs`}>
                      {s.unlockAt === 0 ? '기본 스킨' : `총 ${formatNumber(s.unlockAt)}개 달성 시 해금`}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
