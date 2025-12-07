import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Heart, Coins } from 'lucide-react'
import { recordGamePlay, getPlaysToday } from '../lib/supabase'
import { hapticFeedback } from '../lib/telegram'

export default function GameScreen({ user, setUser, playsRemaining, setPlaysRemaining, refreshUser, onNavigate }) {
  const [gameState, setGameState] = useState('ready') // ready, playing, ended
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [items, setItems] = useState([])
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [jarFill, setJarFill] = useState(0)
  const [playerX, setPlayerX] = useState(50) // percentage from left
  const [saving, setSaving] = useState(false)
  const [instantVoucher, setInstantVoucher] = useState(null)
  const [comboCount, setComboCount] = useState(0)
  
  const gameRef = useRef(null)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const gameLoopRef = useRef(null)
  const spawnLoopRef = useRef(null)

  // Keep refs in sync
  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    livesRef.current = lives
  }, [lives])

  // Load plays on mount
  useEffect(() => {
    async function loadPlays() {
      if (user?.id) {
        try {
          const plays = await getPlaysToday(user.id)
          setPlaysRemaining(5 - plays)
        } catch (err) {
          console.error('Failed to load plays:', err)
        }
      }
    }
    loadPlays()
  }, [user?.id])

  // Item types with partner branding
  const itemTypes = {
    choppies: { emoji: '🛒', label: 'Choppies', points: 25, color: 'from-green-400 to-green-600', rarity: 0.12 },
    shoprite: { emoji: '🏪', label: 'Shoprite', points: 20, color: 'from-red-400 to-red-600', rarity: 0.12 },
    shell: { emoji: '⛽', label: 'Shell', points: 15, color: 'from-yellow-400 to-yellow-600', rarity: 0.08 },
    pep: { emoji: '👕', label: 'PEP', points: 15, color: 'from-blue-400 to-blue-600', rarity: 0.08 },
    spar: { emoji: '🛍️', label: 'Spar', points: 20, color: 'from-red-500 to-red-700', rarity: 0.08 },
    coin: { emoji: '💰', label: 'Coin', points: 5, color: 'from-amber-300 to-amber-500', rarity: 0.22 },
    star: { emoji: '⭐', label: 'Star Bonus', points: 50, color: 'from-purple-400 to-pink-500', rarity: 0.05 },
    data: { emoji: '📶', label: 'Data Boost', points: 30, color: 'from-cyan-400 to-blue-500', rarity: 0.05 },
    skull: { emoji: '💀', label: 'Debt', points: -25, color: 'from-gray-600 to-gray-800', rarity: 0.10, isHazard: true },
    bill: { emoji: '📄', label: 'Bill', points: 0, color: 'from-red-700 to-red-900', rarity: 0.06, isObstacle: true },
    traffic: { emoji: '🚗', label: 'Traffic', points: 0, color: 'from-gray-500 to-gray-700', rarity: 0.04, isObstacle: true },
  }

  // Start game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
      if (spawnLoopRef.current) clearInterval(spawnLoopRef.current)
      return
    }

    // Spawn items
    spawnLoopRef.current = setInterval(() => {
      const rand = Math.random()
      let cumulative = 0
      let selectedType = 'coin'
      
      for (const [type, config] of Object.entries(itemTypes)) {
        cumulative += config.rarity
        if (rand <= cumulative) {
          selectedType = type
          break
        }
      }

      const item = itemTypes[selectedType]
      const newItem = {
        id: Date.now() + Math.random(),
        type: selectedType,
        ...item,
        x: Math.random() * 70 + 15, // 15-85% from left
        y: -8,
        speed: 1.8 + Math.random() * 1.2,
        rotation: Math.random() * 20 - 10,
      }

      setItems(prev => [...prev, newItem])
    }, 600)

    // Move items and check collisions
    gameLoopRef.current = setInterval(() => {
      setItems(prev => {
        const stillAlive = []
        
        for (const item of prev) {
          const newY = item.y + item.speed
          
          // Check if in collection zone (bottom area)
          if (newY > 75 && newY < 90) {
            const playerLeft = playerX - 14
            const playerRight = playerX + 14
            
            if (item.x >= playerLeft && item.x <= playerRight) {
              // COLLISION!
              if (item.isObstacle) {
                setLives(l => {
                  const newLives = l - 1
                  hapticFeedback('error')
                  if (newLives <= 0) {
                    setTimeout(() => endGame(), 50)
                  }
                  return newLives
                })
                setComboCount(0)
              } else if (item.isHazard) {
                setScore(s => Math.max(0, s + item.points))
                setComboCount(0)
                hapticFeedback('warning')
              } else {
                // Good item collected!
                const comboBonus = Math.floor(comboCount / 3) * 5
                const totalPoints = item.points + comboBonus
                setScore(s => s + totalPoints)
                setJarFill(j => Math.min(100, j + totalPoints / 3))
                setComboCount(c => c + 1)
                hapticFeedback(item.points >= 30 ? 'success' : 'light')
                
                // Rare instant voucher (0.5% chance on partner items)
                if (!['coin', 'star', 'data'].includes(item.type) && Math.random() < 0.005) {
                  setInstantVoucher(item)
                }
              }
              continue // Don't add to stillAlive
            }
          }
          
          // Keep if still on screen
          if (newY < 105) {
            stillAlive.push({ ...item, y: newY })
          }
        }
        
        return stillAlive
      })
    }, 45)

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
      if (spawnLoopRef.current) clearInterval(spawnLoopRef.current)
    }
  }, [gameState, playerX])

  // Touch controls
  const handleTouchMove = (e) => {
    if (gameState !== 'playing') return
    e.preventDefault()
    
    const rect = gameRef.current?.getBoundingClientRect()
    if (rect) {
      const touchX = e.touches[0].clientX
      const relativeX = ((touchX - rect.left) / rect.width) * 100
      setPlayerX(Math.max(12, Math.min(88, relativeX)))
    }
  }

  const handleMouseMove = (e) => {
    if (gameState !== 'playing') return
    
    const rect = gameRef.current?.getBoundingClientRect()
    if (rect) {
      const relativeX = ((e.clientX - rect.left) / rect.width) * 100
      setPlayerX(Math.max(12, Math.min(88, relativeX)))
    }
  }

  const calculateCoinsEarned = (finalScore) => {
    if (finalScore <= 0) return 0
    if (finalScore <= 50) return Math.floor(finalScore * 0.8)
    if (finalScore <= 100) return Math.floor(finalScore * 1.0)
    if (finalScore <= 200) return Math.floor(finalScore * 1.3)
    if (finalScore <= 300) return Math.floor(finalScore * 1.5)
    return Math.floor(finalScore * 1.8)
  }

  const endGame = async () => {
    setGameState('ended')
    if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    if (spawnLoopRef.current) clearInterval(spawnLoopRef.current)
    
    const finalScore = Math.max(0, scoreRef.current)
    const earned = calculateCoinsEarned(finalScore)
    setCoinsEarned(earned)

    if (user?.id) {
      setSaving(true)
      try {
        const result = await recordGamePlay(user.id, finalScore, earned)
        if (result.balance) {
          setUser(prev => ({
            ...prev,
            gameCoins: result.balance.game_coins || 0,
            lifetimeGameCoins: result.balance.lifetime_game_coins || 0
          }))
        }
        if (typeof result.playsRemaining === 'number') {
          setPlaysRemaining(result.playsRemaining)
        }
      } catch (err) {
        console.error('Failed to save game:', err)
      }
      setSaving(false)
    }
  }

  const startGame = () => {
    if (playsRemaining <= 0) return

    setGameState('playing')
    setScore(0)
    scoreRef.current = 0
    setLives(3)
    livesRef.current = 3
    setItems([])
    setCoinsEarned(0)
    setJarFill(0)
    setPlayerX(50)
    setInstantVoucher(null)
    setComboCount(0)
  }

  return (
    <div className="h-full bg-gradient-to-b from-sky-400 via-sky-500 to-emerald-400 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 bg-gradient-to-b from-black/30 to-transparent">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="w-9 h-9 bg-white/20 backdrop-blur rounded-full flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h2 className="text-white font-bold text-lg drop-shadow-lg">TapSika Run</h2>
          <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1">
            <span className="text-amber-300 font-bold text-sm">{user?.gameCoins || 0}</span>
            <Coins size={14} className="text-amber-300" />
          </div>
        </div>
      </div>

      {/* Game Stats Bar */}
      <div className="px-4 py-2 flex justify-between items-center">
        {/* Lives */}
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <Heart
              key={i}
              size={22}
              className={`drop-shadow ${i <= lives ? 'text-red-500 fill-red-500' : 'text-white/30'}`}
            />
          ))}
        </div>

        {/* Score + Combo */}
        <div className="flex items-center gap-2">
          {comboCount >= 3 && (
            <span className="bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              x{Math.floor(comboCount / 3) + 1}
            </span>
          )}
          <div className="bg-white/30 backdrop-blur rounded-full px-4 py-1">
            <span className="text-white font-bold drop-shadow">{score} pts</span>
          </div>
        </div>

        {/* Jar Fill */}
        <div className="flex items-center gap-1">
          <span className="text-xl drop-shadow">🏺</span>
          <div className="w-12 h-3 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 transition-all duration-200"
              style={{ width: `${jarFill}%` }}
            />
          </div>
        </div>
      </div>

      {/* Runs remaining */}
      <div className="text-center pb-1">
        <span className="text-white/70 text-xs drop-shadow">Runs: {playsRemaining}/5</span>
      </div>

      {/* Game Area */}
      <div
        ref={gameRef}
        className="flex-1 relative overflow-hidden touch-none"
        onTouchMove={handleTouchMove}
        onMouseMove={handleMouseMove}
        style={{ touchAction: 'none' }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[5%] left-[10%] text-4xl opacity-60 animate-pulse">☁️</div>
          <div className="absolute top-[15%] right-[15%] text-3xl opacity-50">☁️</div>
          <div className="absolute top-[25%] left-[60%] text-2xl opacity-40">☁️</div>
          <div className="absolute top-[8%] left-[40%] text-xl opacity-30">🌤️</div>
        </div>

        {/* Path/Road */}
        <div className="absolute bottom-0 left-[10%] right-[10%] h-[25%] bg-gradient-to-t from-emerald-600 via-emerald-500 to-transparent rounded-t-3xl">
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-2 h-full bg-white/20 rounded-full" />
        </div>

        {/* Falling Items */}
        {items.map(item => (
          <div
            key={item.id}
            className={`absolute w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg border-2 border-white/30`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
            }}
          >
            <span className="text-2xl drop-shadow">{item.emoji}</span>
          </div>
        ))}

        {/* Player Character */}
        <div
          className="absolute bottom-[18%] transition-all duration-75 ease-out"
          style={{ left: `${playerX}%`, transform: 'translateX(-50%)' }}
        >
          {/* Character */}
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-xl border-4 border-orange-300">
              <span className="text-3xl">🏃</span>
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-orange-400 rounded-full blur-xl opacity-30 -z-10" />
            {/* Collection zone hint */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1.5 bg-orange-400/40 rounded-full blur-sm" />
          </div>
        </div>

        {/* Ready Screen */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-6 text-center max-w-sm w-full border border-slate-700 shadow-2xl">
              <div className="text-7xl mb-3 animate-bounce">🏃</div>
              <h3 className="text-3xl font-black text-white mb-1">TapSika Run</h3>
              <p className="text-gray-400 text-sm mb-4">
                Navigate through life! Collect vouchers, avoid obstacles!
              </p>

              {/* Item Legend */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                <div className="bg-slate-700/50 rounded-xl p-2 border border-slate-600">
                  <span className="text-2xl">🛒</span>
                  <p className="text-green-400 text-xs font-bold">+25</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-2 border border-slate-600">
                  <span className="text-2xl">💰</span>
                  <p className="text-amber-400 text-xs font-bold">+5</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-2 border border-slate-600">
                  <span className="text-2xl">💀</span>
                  <p className="text-red-400 text-xs font-bold">-25</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-2 border border-slate-600">
                  <span className="text-2xl">📄</span>
                  <p className="text-red-400 text-xs font-bold">-❤️</p>
                </div>
              </div>

              <p className="text-gray-500 text-xs mb-4">👆 Drag left/right to move</p>

              {playsRemaining > 0 ? (
                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-orange-500/40 active:scale-95 transition-transform"
                >
                  🏃 START RUN ({playsRemaining} left)
                </button>
              ) : (
                <div className="bg-slate-700 rounded-2xl p-4">
                  <p className="text-gray-300 font-bold">No runs left today!</p>
                  <p className="text-gray-500 text-sm mt-1">Come back tomorrow ⏰</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'ended' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-6 text-center max-w-sm w-full border border-slate-700 shadow-2xl">
              <div className="text-6xl mb-2">
                {score >= 300 ? '🏆' : score >= 200 ? '🥇' : score >= 100 ? '🎉' : score >= 50 ? '👍' : '💪'}
              </div>
              <h3 className="text-2xl font-black text-white mb-1">
                {score >= 300 ? 'LEGENDARY!' : score >= 200 ? 'AMAZING!' : score >= 100 ? 'Great Run!' : score >= 50 ? 'Good Job!' : 'Keep Going!'}
              </h3>

              <div className="bg-slate-700/50 rounded-2xl p-4 my-4 border border-slate-600">
                <div className="flex justify-between items-center border-b border-slate-600 pb-3 mb-3">
                  <span className="text-gray-400">Final Score</span>
                  <span className="text-white text-2xl font-black">{score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Coins Earned</span>
                  <span className="text-amber-400 text-2xl font-black">+{coinsEarned} 🪙</span>
                </div>
              </div>

              {saving ? (
                <p className="text-gray-400 mb-4 animate-pulse">Saving...</p>
              ) : (
                <p className="text-green-400 text-sm mb-4">✓ Coins added to balance!</p>
              )}

              {/* Instant Voucher */}
              {instantVoucher && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 mb-4 border-2 border-green-400 animate-pulse">
                  <p className="text-white font-black text-lg">🎁 INSTANT VOUCHER!</p>
                  <p className="text-white/90">P10 {instantVoucher.label} voucher!</p>
                </div>
              )}

              {playsRemaining > 0 ? (
                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-orange-500/40 active:scale-95 transition-transform mb-3"
                >
                  🏃 RUN AGAIN ({playsRemaining} left)
                </button>
              ) : (
                <div className="bg-slate-700 rounded-2xl p-3 mb-3">
                  <p className="text-gray-300 text-sm">No runs left today!</p>
                </div>
              )}

              <button
                onClick={() => onNavigate('home')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom instruction bar */}
      {gameState === 'playing' && (
        <div className="bg-gradient-to-t from-black/40 to-transparent py-3 text-center">
          <p className="text-white/90 text-sm font-medium drop-shadow">
            👆 Drag to move • Collect vouchers • Avoid bills!
          </p>
        </div>
      )}

      {/* Jar Shake Teaser */}
      <div className="bg-slate-900 px-4 py-2 flex items-center justify-center gap-2">
        <span className="text-lg">🏺✨</span>
        <span className="text-gray-400 text-xs">Earn coins for the monthly Jar Shake!</span>
      </div>
    </div>
  )
}