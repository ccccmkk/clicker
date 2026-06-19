'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { loadGameState, saveGameState, fetchRanking, supabase, type RankEntry } from '@/lib/supabase'
import { UPGRADES, CLICK_UPGRADES, COOKIE_SKINS, BG_THEMES, getCost, getTotalCps, getClickPower, formatNumber } from '@/lib/gameLogic'

type FloatingText = { id: number; x: number; y: number; text: string; color: string }
type GoldenCookie = { id: number; x: number; y: number }

function getUserId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('cookie_user_id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('cookie_user_id', id) }
  return id
}
function getSavedNickname() { return typeof window !== 'undefined' ? localStorage.getItem('cookie_nickname') || '' : '' }
function getSavedCookieSkin() { return typeof window !== 'undefined' ? localStorage.getItem('cookie_skin') || 'cookie' : 'cookie' }
function getSavedBgTheme() { return typeof window !== 'undefined' ? localStorage.getItem('cookie_bg') || 'home' : 'home' }

export default function ClickerGame() {
  const [cookies, setCookies] = useState(0)
  const [totalCookies, setTotalCookies] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [upgrades, setUpgrades] = useState<Record<string, number>>({})
  const [clickUpgrades, setClickUpgrades] = useState<Record<string, number>>({})
  const [floats, setFloats] = useState<FloatingText[]>([])
  const [cookieScale, setCookieScale] = useState(1)
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'remote' | 'local'>('idle')
  const [loadSource, setLoadSource] = useState<'remote' | 'local' | 'none'>('none')
  const [activeTab, setActiveTab] = useState<'auto' | 'click' | 'rank' | 'stat' | 'skin'>('auto')
  const [nickname, setNickname] = useState('')
  const [nicknameInput, setNicknameInput] = useState('')
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [editingNick, setEditingNick] = useState(false)
  const [ranking, setRanking] = useState<RankEntry[]>([])
  const [goldenCookie, setGoldenCookie] = useState<GoldenCookie | null>(null)
  const [activeCookieSkinId, setActiveCookieSkinId] = useState('cookie')
  const [activeBgThemeId, setActiveBgThemeId] = useState('home')

  const cookiesRef = useRef(0)
  const totalCookiesRef = useRef(0)
  const totalClicksRef = useRef(0)
  const upgradesRef = useRef<Record<string, number>>({})
  const clickUpgradesRef = useRef<Record<string, number>>({})
  const nicknameRef = useRef('')
  const floatId = useRef(0)
  const goldenId = useRef(0)
  const userId = useRef('')

  const cookieSkin = COOKIE_SKINS.find(s => s.id === activeCookieSkinId) ?? COOKIE_SKINS[0]
  const bgTheme = BG_THEMES.find(s => s.id === activeBgThemeId) ?? BG_THEMES[0]
  const skin = { ...bgTheme, emoji: cookieSkin.emoji, theme: { ...bgTheme.theme, cookieGrad: cookieSkin.grad } }

  useEffect(() => {
    userId.current = getUserId()
    setActiveCookieSkinId(getSavedCookieSkin())
    setActiveBgThemeId(getSavedBgTheme())
    const savedNick = getSavedNickname()
    if (!savedNick) { setShowNicknameModal(true) }
    else { nicknameRef.current = savedNick; setNickname(savedNick) }

    const timeout = setTimeout(() => setLoaded(true), 5000)
    loadGameState(userId.current).then(({ state, source }) => {
      clearTimeout(timeout)
      setLoadSource(source)
      if (state) {
        cookiesRef.current = state.cookies
        totalCookiesRef.current = state.total_cookies
        totalClicksRef.current = state.total_clicks
        upgradesRef.current = state.upgrades || {}
        clickUpgradesRef.current = state.click_upgrades || {}
        if (state.nickname && state.nickname !== '익명의 제빵사') {
          nicknameRef.current = state.nickname; setNickname(state.nickname)
          localStorage.setItem('cookie_nickname', state.nickname)
        }
        setCookies(state.cookies); setTotalCookies(state.total_cookies)
        setTotalClicks(state.total_clicks); setUpgrades(state.upgrades || {})
        setClickUpgrades(state.click_upgrades || {})
      }
      setLoaded(true)
    }).catch(() => { clearTimeout(timeout); setLoaded(true) })
  }, [])

  // CPS tick
  useEffect(() => {
    if (!loaded) return
    const interval = setInterval(() => {
      const cps = getTotalCps(upgradesRef.current)
      if (cps > 0) {
        const gain = cps / 20
        cookiesRef.current += gain; totalCookiesRef.current += gain
        setCookies(cookiesRef.current); setTotalCookies(totalCookiesRef.current)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [loaded])

  // Auto-save (5초마다 - 로컬 항상 저장, 원격 성공 시 표시)
  useEffect(() => {
    if (!loaded) return
    const interval = setInterval(async () => {
      setSaveStatus('saving')
      const result = await saveGameState({
        user_id: userId.current, nickname: nicknameRef.current,
        cookies: cookiesRef.current, total_cookies: totalCookiesRef.current,
        total_clicks: totalClicksRef.current, upgrades: upgradesRef.current,
        click_upgrades: clickUpgradesRef.current,
      })
      setSaveStatus(result)
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 5000)
    return () => clearInterval(interval)
  }, [loaded])

  // Realtime ranking + 15초 폴링 백업
  useEffect(() => {
    fetchRanking().then(setRanking)

    // Supabase Realtime (publication 등록 필요: alter publication supabase_realtime add table game_state)
    const channel = supabase.channel('ranking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        fetchRanking().then(setRanking)
      }).subscribe()

    // 15초마다 폴링 (realtime 미작동 시 백업)
    const poll = setInterval(() => fetchRanking().then(setRanking), 15000)

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [])

  // 황금쿠키 스케줄
  useEffect(() => {
    if (!loaded) return
    const schedule = (): ReturnType<typeof setTimeout> => {
      const delay = 40000 + Math.random() * 50000
      return setTimeout(() => {
        const id = goldenId.current++
        setGoldenCookie({ id, x: 10 + Math.random() * 75, y: 15 + Math.random() * 55 })
        setTimeout(() => setGoldenCookie(c => c?.id === id ? null : c), 10000)
        schedule()
      }, delay)
    }
    const t = schedule()
    return () => clearTimeout(t)
  }, [loaded])

  const spawnFloat = useCallback((x: number, y: number, text: string, color: string) => {
    const id = floatId.current++
    setFloats(f => [...f, { id, x, y, text, color }])
    setTimeout(() => setFloats(f => f.filter(t => t.id !== id)), 1000)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    const power = getClickPower(clickUpgradesRef.current)
    cookiesRef.current += power; totalCookiesRef.current += power; totalClicksRef.current += 1
    setCookies(cookiesRef.current); setTotalCookies(totalCookiesRef.current); setTotalClicks(totalClicksRef.current)
    setCookieScale(0.88); setTimeout(() => setCookieScale(1), 100)

    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
    let cx: number, cy: number
    if ('touches' in e && e.touches[0]) { cx = e.touches[0].clientX - rect.left; cy = e.touches[0].clientY - rect.top }
    else if ('clientX' in e) { cx = e.clientX - rect.left; cy = e.clientY - rect.top }
    else { cx = rect.width / 2; cy = rect.height / 2 }
    spawnFloat(cx, cy, `+${power > 1 ? formatNumber(power) : '1'}`, 'text-white')
  }, [spawnFloat])

  const handleGoldenClick = useCallback(() => {
    const bonus = Math.max(50, Math.floor(cookiesRef.current * 0.07 + getTotalCps(upgradesRef.current) * 30))
    cookiesRef.current += bonus; totalCookiesRef.current += bonus
    setCookies(cookiesRef.current); setTotalCookies(totalCookiesRef.current)
    setGoldenCookie(null)
    spawnFloat(50, 100, `✨ +${formatNumber(bonus)}`, 'text-yellow-300')
  }, [spawnFloat])

  const buyAutoUpgrade = useCallback((upgradeId: string) => {
    const upgrade = UPGRADES.find(u => u.id === upgradeId)
    if (!upgrade) return
    const owned = upgradesRef.current[upgradeId] || 0
    const cost = getCost(upgrade, owned)
    if (cookiesRef.current < cost) return
    cookiesRef.current -= cost
    upgradesRef.current = { ...upgradesRef.current, [upgradeId]: owned + 1 }
    setCookies(cookiesRef.current)
    const nu = { ...upgradesRef.current }; setUpgrades(nu)
  }, [])

  const buyClickUpgrade = useCallback((upgradeId: string) => {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId)
    if (!upgrade) return
    const owned = clickUpgradesRef.current[upgradeId] || 0
    const cost = getCost(upgrade, owned)
    if (cookiesRef.current < cost) return
    cookiesRef.current -= cost
    clickUpgradesRef.current = { ...clickUpgradesRef.current, [upgradeId]: owned + 1 }
    setCookies(cookiesRef.current); setClickUpgrades({ ...clickUpgradesRef.current })
  }, [])

  const confirmNickname = useCallback(async () => {
    const trimmed = nicknameInput.trim().slice(0, 16) || '익명의 제빵사'
    nicknameRef.current = trimmed; setNickname(trimmed)
    localStorage.setItem('cookie_nickname', trimmed)
    setShowNicknameModal(false); setEditingNick(false)
    await saveGameState({
      user_id: userId.current, nickname: trimmed,
      cookies: cookiesRef.current, total_cookies: totalCookiesRef.current,
      total_clicks: totalClicksRef.current, upgrades: upgradesRef.current,
      click_upgrades: clickUpgradesRef.current,
    })
  }, [nicknameInput])

  const selectCookieSkin = useCallback((id: string) => {
    setActiveCookieSkinId(id); localStorage.setItem('cookie_skin', id)
  }, [])
  const selectBgTheme = useCallback((id: string) => {
    setActiveBgThemeId(id); localStorage.setItem('cookie_bg', id)
  }, [])

  const cps = getTotalCps(upgradesRef.current)
  const clickPower = getClickPower(clickUpgradesRef.current)
  const myRank = ranking.findIndex(r => r.user_id === userId.current) + 1
  const unlockedCookieSkins = COOKIE_SKINS.filter(s => totalCookies >= s.unlockAt)
  const unlockedBgThemes = BG_THEMES.filter(s => totalCookies >= s.unlockAt)
  const now = Date.now()

  if (showNicknameModal) return (
    <div className="fixed inset-0 bg-amber-950 flex items-center justify-center p-6">
      <div className="bg-amber-900 border-2 border-amber-600 rounded-2xl p-8 w-full max-w-sm text-center space-y-5">
        <div className="text-6xl">🍪</div>
        <h1 className="text-2xl font-bold text-amber-200">쿠키 클리커</h1>
        <p className="text-amber-400 text-sm">쿠키 제국의 이름을 정해주세요!</p>
        <input autoFocus value={nicknameInput} onChange={e => setNicknameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirmNickname()} maxLength={16}
          placeholder="닉네임 입력 (최대 16자)"
          className="w-full bg-amber-800 border border-amber-600 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-600 outline-none focus:border-amber-400 text-center text-lg" />
        <button onClick={confirmNickname} className="w-full bg-amber-600 active:bg-amber-700 text-white font-bold py-3 rounded-xl text-lg">시작하기 🍪</button>
        <button onClick={() => { setNicknameInput('익명의 제빵사'); setTimeout(confirmNickname, 0) }} className="text-amber-600 text-sm">건너뛰기</button>
      </div>
    </div>
  )

  if (!loaded) return (
    <div className={`flex flex-col items-center justify-center h-screen gap-3 ${skin.theme.bg} ${skin.theme.text}`}>
      <div className="text-2xl animate-pulse">{skin.emoji} 로딩중...</div>
      <div className={`text-xs ${skin.theme.subtext}`}>서버에서 데이터 불러오는 중...</div>
    </div>
  )

  return (
    <div className={`flex flex-col h-screen ${skin.theme.bg} text-white overflow-hidden select-none`}>

      {/* 쿠키 영역 */}
      <div className="relative flex-none" style={{ height: '50vh' }}>

        {/* 커서: 쿠키 주변 원형 궤도 */}
        {(() => {
          const cursorCount = Math.min(upgrades['cursor'] || 0, 8)
          const radius = 82 // px, 쿠키(w-36=144px) 반지름 72px + 여유
          return Array.from({ length: cursorCount }).map((_, i) => {
            const speed = 0.4 + (i % 3) * 0.15
            const angle = (now / 1000) * speed + (i * (Math.PI * 2) / cursorCount)
            const cx = 50 + (radius / (window?.innerWidth ?? 390) * 100) * Math.cos(angle)
            const cy = 50 + (radius / ((window?.innerHeight ?? 680) * 0.5) * 100) * Math.sin(angle)
            const pointing = angle * (180 / Math.PI) + 90
            return (
              <span key={`cursor-${i}`} className="absolute pointer-events-none text-base leading-none"
                style={{ left: `${cx}%`, top: `${cy}%`, transform: `translate(-50%,-50%) rotate(${pointing}deg)`, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>
                👆
              </span>
            )
          })
        })()}

        {/* 황금 쿠키 */}
        {goldenCookie && (
          <button onClick={handleGoldenClick} className="absolute z-30 animate-bounce"
            style={{ left: `${goldenCookie.x}%`, top: `${goldenCookie.y}%`, transform: 'translate(-50%,-50%)' }}>
            <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 10px gold)' }}>✨</span>
          </button>
        )}

        {/* 플로팅 텍스트 */}
        {floats.map(f => (
          <span key={f.id} className={`absolute font-bold pointer-events-none animate-float z-40 ${f.color} text-lg`}
            style={{ left: f.x, top: f.y, transform: 'translate(-50%,-50%)' }}>
            {f.text}
          </span>
        ))}

        {/* 닉네임 */}
        <div className="absolute top-2 left-0 right-0 flex justify-center z-20">
          {editingNick ? (
            <div className={`flex gap-2 items-center ${skin.theme.panel} rounded-xl px-3 py-1 border ${skin.theme.border}`}>
              <input autoFocus value={nicknameInput} onChange={e => setNicknameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmNickname()} maxLength={16}
                className="bg-transparent text-sm outline-none w-28" placeholder="새 닉네임" />
              <button onClick={confirmNickname} className={`${skin.theme.text} font-bold text-sm`}>✓</button>
              <button onClick={() => setEditingNick(false)} className={`${skin.theme.subtext} text-sm`}>✕</button>
            </div>
          ) : (
            <button onClick={() => { setNicknameInput(nickname); setEditingNick(true) }}
              className={`${skin.theme.subtext} text-xs flex items-center gap-1`}>
              👤 {nickname} ✏️
            </button>
          )}
        </div>

        {/* 쿠키 수 + 스탯 */}
        <div className="absolute top-8 left-0 right-0 flex flex-col items-center z-10 pointer-events-none">
          <div className={`text-4xl font-bold ${skin.theme.text} drop-shadow-lg`}>{skin.emoji} {formatNumber(cookies)}</div>
          <div className={`${skin.theme.subtext} text-xs mt-0.5 flex gap-3`}>
            {cps > 0 && <span>자동 {formatNumber(cps)}/초</span>}
            <span>클릭 +{formatNumber(clickPower)}</span>
          </div>
        </div>

        {/* 쿠키 버튼 */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <button onClick={handleClick} onTouchStart={e => { e.preventDefault(); handleClick(e) }}
            style={{ transform: `scale(${cookieScale})`, transition: 'transform 0.08s' }}
            className={`relative w-36 h-36 rounded-full bg-gradient-to-br ${cookieSkin.grad} shadow-2xl active:brightness-90 border-4 border-white/20 flex items-center justify-center touch-none`}>
            <span className="text-7xl">{skin.emoji}</span>
          </button>
        </div>

        <div className={`absolute bottom-1 right-2 text-xs flex items-center gap-1`}>
          {saveStatus === 'saving' && <span className={`${skin.theme.subtext} animate-pulse`}>💾 저장중...</span>}
          {saveStatus === 'remote' && <span className="text-green-400">☁️ 저장됨</span>}
          {saveStatus === 'local' && <span className="text-yellow-500">⚠️ 로컬저장 (서버연결안됨)</span>}
          {loadSource === 'local' && saveStatus === 'idle' && <span className="text-yellow-600 text-xs">⚠️ 오프라인</span>}
        </div>
      </div>

      {/* 하단 패널 */}
      <div className={`flex-1 flex flex-col ${skin.theme.panel} border-t ${skin.theme.border} min-h-0`}>
        {/* 탭 */}
        <div className={`flex border-b ${skin.theme.border} flex-shrink-0 text-xs`}>
          {(['auto', 'click', 'rank', 'stat', 'skin'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 font-bold transition-colors ${activeTab === tab ? 'bg-white/10 text-white' : skin.theme.subtext}`}>
              {tab === 'auto' ? '🏭 자동'
                : tab === 'click' ? '👆 클릭'
                : tab === 'rank' ? `🏆${myRank > 0 ? ` #${myRank}` : ''}`
                : tab === 'stat' ? '📊'
                : `🎨`}
            </button>
          ))}
        </div>

        {/* 자동 생산 상점 */}
        {activeTab === 'auto' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <div className={`${skin.theme.subtext} text-xs px-1 pb-1`}>총 {formatNumber(totalCookies)} 생산</div>
            {UPGRADES.map(upgrade => {
              const owned = upgrades[upgrade.id] || 0
              const cost = getCost(upgrade, owned)
              const canAfford = cookies >= cost
              const progress = Math.min(cookies / cost, 1)
              const thisCps = upgrade.baseCps * (owned + 1)
              const displayIcons = Math.min(owned, 10)
              return (
                <button key={upgrade.id} onClick={() => buyAutoUpgrade(upgrade.id)} disabled={!canAfford}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left relative overflow-hidden ${canAfford ? `${skin.theme.btn} ${skin.theme.btnHover}` : 'bg-white/5 border-white/10 opacity-60'}`}>
                  <div className="absolute inset-0 bg-white/10 pointer-events-none" style={{ width: `${progress * 100}%`, transition: 'width 0.3s' }} />
                  <span className="text-3xl relative z-10">{upgrade.icon}</span>
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-white">{upgrade.name}</span>
                      {owned > 0 && <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">×{owned}</span>}
                    </div>
                    {/* 보유 건물 미니 이모지 시각화 */}
                    {displayIcons > 0 && (
                      <div className="flex flex-wrap gap-0.5 my-0.5">
                        {Array.from({ length: displayIcons }).map((_, i) => (
                          <span key={i} className="text-xs leading-none opacity-80">{upgrade.icon}</span>
                        ))}
                        {owned > 10 && <span className={`text-xs ${skin.theme.subtext}`}>+{owned - 10}</span>}
                      </div>
                    )}
                    <div className={`${skin.theme.subtext} text-xs flex gap-2`}>
                      <span>{upgrade.description}</span>
                      <span className="text-green-400">+{formatNumber(thisCps)}/초</span>
                    </div>
                    <div className={`text-sm font-mono mt-0.5 ${canAfford ? skin.theme.text : skin.theme.subtext}`}>{skin.emoji} {formatNumber(cost)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* 클릭 강화 상점 */}
        {activeTab === 'click' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <div className={`${skin.theme.subtext} text-xs px-1 pb-1`}>현재 클릭당 +{formatNumber(clickPower)} · 총 클릭 {formatNumber(totalClicks)}회</div>
            {CLICK_UPGRADES.map(upgrade => {
              const owned = clickUpgrades[upgrade.id] || 0
              const cost = getCost(upgrade, owned)
              const canAfford = cookies >= cost
              const progress = Math.min(cookies / cost, 1)
              const gainPerClick = upgrade.baseClickPower * (owned + 1)
              return (
                <button key={upgrade.id} onClick={() => buyClickUpgrade(upgrade.id)} disabled={!canAfford}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left relative overflow-hidden ${canAfford ? `${skin.theme.btn} ${skin.theme.btnHover}` : 'bg-white/5 border-white/10 opacity-60'}`}>
                  <div className="absolute inset-0 bg-white/10 pointer-events-none" style={{ width: `${progress * 100}%`, transition: 'width 0.3s' }} />
                  <span className="text-3xl relative z-10">{upgrade.icon}</span>
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-white">{upgrade.name}</span>
                      {owned > 0 && <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">×{owned}</span>}
                    </div>
                    <div className={`${skin.theme.subtext} text-xs flex gap-2`}>
                      <span>{upgrade.description}</span>
                      <span className="text-orange-400">클릭 +{formatNumber(gainPerClick)}</span>
                    </div>
                    <div className={`text-sm font-mono mt-0.5 ${canAfford ? skin.theme.text : skin.theme.subtext}`}>{skin.emoji} {formatNumber(cost)}</div>
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
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />실시간
            </div>
            {ranking.length === 0
              ? <div className={`${skin.theme.subtext} text-sm text-center py-8`}>데이터 없음</div>
              : ranking.map((entry, i) => {
                const isMe = entry.user_id === userId.current
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                return (
                  <div key={entry.user_id}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${isMe ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/10'}`}>
                    <span className="w-6 text-center text-base flex-shrink-0">
                      {medal ?? <span className={`${skin.theme.subtext} text-xs`}>{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${isMe ? 'text-white' : 'text-white/80'}`}>
                        {entry.nickname || '익명의 제빵사'}{isMe && <span className={`${skin.theme.subtext} text-xs ml-1`}>(나)</span>}
                      </div>
                      <div className={`${skin.theme.subtext} text-xs flex gap-2`}>
                        <span>🍪 {formatNumber(entry.total_cookies)}</span>
                        <span>👆 {formatNumber(entry.total_clicks)}회</span>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* 통계 */}
        {activeTab === 'stat' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className={`${skin.theme.subtext} text-xs px-1 pb-1 font-bold`}>내 통계</div>
            {[
              { label: '총 쿠키 생산', value: `🍪 ${formatNumber(totalCookies)}`, sub: '누적 생산량' },
              { label: '현재 쿠키', value: `🍪 ${formatNumber(cookies)}`, sub: '보유 중' },
              { label: '초당 생산 (CPS)', value: `${formatNumber(cps)}/초`, sub: `자동 생산 건물 합산` },
              { label: '클릭 파워', value: `+${formatNumber(clickPower)}/클릭`, sub: '클릭 업그레이드 합산' },
              { label: '총 클릭 수', value: `${formatNumber(totalClicks)}회`, sub: '손가락이 고생했어요' },
            ].map(item => (
              <div key={item.label} className={`flex items-center justify-between p-3 rounded-xl border bg-white/5 border-white/10`}>
                <div>
                  <div className="text-sm text-white font-medium">{item.label}</div>
                  <div className={`text-xs ${skin.theme.subtext}`}>{item.sub}</div>
                </div>
                <div className={`text-sm font-bold ${skin.theme.text}`}>{item.value}</div>
              </div>
            ))}
            <div className={`${skin.theme.subtext} text-xs px-1 pt-2 pb-1 font-bold`}>건물별 생산</div>
            {UPGRADES.filter(u => (upgrades[u.id] || 0) > 0).map(u => {
              const owned = upgrades[u.id] || 0
              const thisCps = u.baseCps * owned
              return (
                <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl border bg-white/5 border-white/10`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{u.icon}</span>
                    <div>
                      <div className="text-sm text-white">{u.name} ×{owned}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold text-green-400`}>+{formatNumber(thisCps)}/초</div>
                </div>
              )
            })}
            {Object.values(upgrades).every(v => !v) && (
              <div className={`${skin.theme.subtext} text-sm text-center py-4`}>아직 건물이 없어요</div>
            )}
          </div>
        )}

        {/* 스킨 */}
        {activeTab === 'skin' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* 쿠키 스킨 */}
            <div>
              <div className={`${skin.theme.subtext} text-xs px-1 pb-1.5 font-bold`}>🍪 쿠키 스킨</div>
              <div className="space-y-1.5">
                {COOKIE_SKINS.map(s => {
                  const unlocked = totalCookies >= s.unlockAt
                  const active = activeCookieSkinId === s.id
                  return (
                    <button key={s.id} onClick={() => unlocked && selectCookieSkin(s.id)} disabled={!unlocked}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${active ? 'border-white/60 bg-white/20' : unlocked ? `${skin.theme.btn}` : 'bg-white/5 border-white/10 opacity-50'}`}>
                      <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.grad} flex items-center justify-center text-xl flex-shrink-0`}>{s.emoji}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          {s.name}
                          {active && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">사용중</span>}
                          {!unlocked && <span className="text-xs">🔒</span>}
                        </div>
                        <div className={`${skin.theme.subtext} text-xs`}>
                          {s.unlockAt === 0 ? '기본 스킨' : `🍪 ${formatNumber(s.unlockAt)} 달성 시 해금`}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 배경 테마 */}
            <div>
              <div className={`${skin.theme.subtext} text-xs px-1 pb-1.5 font-bold`}>🏠 배경 테마</div>
              <div className="space-y-1.5">
                {BG_THEMES.map(s => {
                  const unlocked = totalCookies >= s.unlockAt
                  const active = activeBgThemeId === s.id
                  return (
                    <button key={s.id} onClick={() => unlocked && selectBgTheme(s.id)} disabled={!unlocked}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${active ? 'border-white/60 bg-white/20' : unlocked ? `${skin.theme.btn}` : 'bg-white/5 border-white/10 opacity-50'}`}>
                      <span className="text-3xl flex-shrink-0">{s.sceneEmoji}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          {s.name}
                          {active && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">사용중</span>}
                          {!unlocked && <span className="text-xs">🔒</span>}
                        </div>
                        <div className={`${skin.theme.subtext} text-xs`}>
                          {s.desc} {s.unlockAt > 0 && `· 🍪 ${formatNumber(s.unlockAt)} 해금`}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
