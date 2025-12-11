import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Heart, Coins, Clock, Package } from 'lucide-react'
import { recordGamePlay, getPlaysToday } from '../lib/supabase'
import { hapticFeedback } from '../lib/telegram'

export default function GameScreen({ user, setUser, playsRemaining, setPlaysRemaining, refreshUser, onNavigate }) {
  const [gameState, setGameState] = useState('ready') // ready, playing, ended
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [timeLeft, setTimeLeft] = useState(60)
  const [items, setItems] = useState([])
  const [currentOrder, setCurrentOrder] = useState(null)
  const [orderNumber, setOrderNumber] = useState(0)
  const [orderProgress, setOrderProgress] = useState({})
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [orderStartTime, setOrderStartTime] = useState(null)
  const [ordersCompleted, setOrdersCompleted] = useState(0)
  const [accuracy, setAccuracy] = useState({ correct: 0, wrong: 0 })
  const [saving, setSaving] = useState(false)
  const [floatingTexts, setFloatingTexts] = useState([])
  const [comboCount, setComboCount] = useState(0)
  
  const gameRef = useRef(null)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const gameLoopRef = useRef(null)
  const spawnLoopRef = useRef(null)
  const timerRef = useRef(null)

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

  // Partner items
  const partnerItems = {
    choppies: { emoji: '🛒', label: 'Choppies', color: 'from-green-400 to-green-600', points: 10 },
    shoprite: { emoji: '🏪', label: 'Shoprite', color: 'from-red-400 to-red-600', points: 10 },
    shell: { emoji: '⛽', label: 'Shell', color: 'from-yellow-400 to-yellow-600', points: 10 },
    pep: { emoji: '👕', label: 'PEP', color: 'from-blue-400 to-blue-600', points: 10 },
    spar: { emoji: '🛍️', label: 'Spar', color: 'from-orange-400 to-orange-600', points: 10 },
    coin: { emoji: '💰', label: 'Coins', color: 'from-amber-300 to-amber-500', points: 5 },
    star: { emoji: '⭐', label: 'Bonus', color: 'from-purple-400 to-pink-500', points: 20 },
  }

  // Trap items
  const trapItems = {
    expired_choppies: { emoji: '🛒', label: 'Expired', color: 'from-green-900 to-gray-800', points: -20, isTrap: true, looksLike: 'choppies', hasX: true },
    expired_shoprite: { emoji: '🏪', label: 'Expired', color: 'from-red-900 to-gray-800', points: -20, isTrap: true, looksLike: 'shoprite', hasX: true },
    expired_shell: { emoji: '⛽', label: 'Expired', color: 'from-yellow-900 to-gray-800', points: -20, isTrap: true, looksLike: 'shell', hasX: true },
    decoy_gold: { emoji: '💎', label: 'Decoy', color: 'from-yellow-300 to-amber-400', points: -25, isTrap: true, isDecoy: true },
    wrong_brand: { emoji: '🏬', label: 'Generic', color: 'from-gray-500 to-gray-700', points: -15, isTrap: true },
  }

  // Generate order based on order number
  const generateOrder = (orderNum) => {
    const partnerKeys = ['choppies', 'shoprite', 'shell', 'pep', 'spar']
    let types, totalItems
    
    if (orderNum === 1) {
      types = 1
      totalItems = 3
    } else if (orderNum === 2) {
      types = 2
      totalItems = 5
    } else if (orderNum === 3) {
      types = 2
      totalItems = 6
    } else if (orderNum === 4) {
      types = 3
      totalItems = 7
    } else {
      types = Math.min(4, 3 + Math.floor((orderNum - 4) / 2))
      totalItems = Math.min(10, 7 + orderNum - 4)
    }

    // Shuffle and pick types
    const shuffled = [...partnerKeys].sort(() => Math.random() - 0.5)
    const selectedTypes = shuffled.slice(0, types)
    
    // Distribute items
    const order = {}
    let remaining = totalItems
    
    selectedTypes.forEach((type, index) => {
      if (index === selectedTypes.length - 1) {
        order[type] = remaining
      } else {
        const amount = Math.max(1, Math.floor(remaining / (selectedTypes.length - index)) + Math.floor(Math.random() * 2) - 1)
        order[type] = amount
        remaining -= amount
      }
    })

    return order
  }

  // Add floating text effect
  const addFloatingText = (x, y, text, isPositive) => {
    const id = Date.now() + Math.random()
    setFloatingTexts(prev => [...prev, { id, x, y, text, isPositive }])
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id))
    }, 1000)
  }

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          endGame()
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameState])

  // Item spawning
  useEffect(() => {
    if (gameState !== 'playing' || !currentOrder) return

    const getSpawnRate = () => {
      if (orderNumber <= 1) return 950
      if (orderNumber <= 2) return 850
      if (orderNumber <= 3) return 750
      if (orderNumber <= 4) return 650
      return Math.max(450, 650 - (orderNumber - 4) * 40)
    }

    const getFallSpeed = () => {
      if (orderNumber <= 1) return 1.0
      if (orderNumber <= 2) return 1.3
      if (orderNumber <= 3) return 1.6
      if (orderNumber <= 4) return 1.9
      return Math.min(3.0, 1.9 + (orderNumber - 4) * 0.15)
    }

    spawnLoopRef.current = setInterval(() => {
      // Decide what to spawn
      let itemType, itemData
      const rand = Math.random()
      
      // Trap probability increases with order number
      const trapChance = Math.min(0.22, 0.03 + orderNumber * 0.025)
      
      if (rand < trapChance && orderNumber >= 2) {
        // Spawn trap
        const trapKeys = Object.keys(trapItems)
        const trapKey = trapKeys[Math.floor(Math.random() * trapKeys.length)]
        itemType = trapKey
        itemData = { ...trapItems[trapKey], type: trapKey }
      } else {
        // Spawn regular item - weighted toward order items
        const orderKeys = Object.keys(currentOrder)
        const allKeys = Object.keys(partnerItems)
        
        // 65% chance to spawn order item, 35% other
        if (Math.random() < 0.65) {
          itemType = orderKeys[Math.floor(Math.random() * orderKeys.length)]
        } else {
          itemType = allKeys[Math.floor(Math.random() * allKeys.length)]
        }
        itemData = { ...partnerItems[itemType], type: itemType }
      }

      const newItem = {
        id: Date.now() + Math.random(),
        ...itemData,
        x: Math.random() * 75 + 12.5,
        y: -12,
        speed: getFallSpeed() + Math.random() * 0.4,
        rotation: Math.random() * 20 - 10,
        wobble: Math.random() * 2 - 1,
        scale: 0.85 + Math.random() * 0.15,
      }

      setItems(prev => [...prev, newItem])
    }, getSpawnRate())

    return () => {
      if (spawnLoopRef.current) clearInterval(spawnLoopRef.current)
    }
  }, [gameState, currentOrder, orderNumber])

  // Move items with wobble effect (like fruit falling)
  useEffect(() => {
    if (gameState !== 'playing') return

    gameLoopRef.current = setInterval(() => {
      setItems(prev => {
        return prev
          .map(item => ({
            ...item,
            y: item.y + item.speed,
            x: item.x + Math.sin(item.y / 10) * item.wobble * 0.3,
            rotation: item.rotation + item.wobble * 0.5,
          }))
          .filter(item => {
            if (item.y > 105) {
              // Penalty for missing needed items
              if (currentOrder && currentOrder[item.type] && !item.isTrap) {
                const progress = orderProgress[item.type] || 0
                if (progress < currentOrder[item.type]) {
                  setScore(s => Math.max(0, s - 3))
                }
              }
              return false
            }
            return true
          })
      })
    }, 45)

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [gameState, currentOrder, orderProgress])

  // Handle item tap
  const handleItemTap = (item, e) => {
    e.stopPropagation()
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top

    // Remove item with pop animation
    setItems(prev => prev.filter(i => i.id !== item.id))

    // Check if trap
    if (item.isTrap) {
      hapticFeedback('error')
      setLives(l => {
        const newLives = l - 1
        if (newLives <= 0) {
          setTimeout(() => endGame(), 100)
        }
        return newLives
      })
      setScore(s => Math.max(0, s + item.points))
      setAccuracy(a => ({ ...a, wrong: a.wrong + 1 }))
      setComboCount(0)
      addFloatingText(x, y, `${item.points} 💥`, false)
      return
    }

    // Check if in order
    if (currentOrder && currentOrder[item.type]) {
      const currentProgress = orderProgress[item.type] || 0
      const needed = currentOrder[item.type]

      if (currentProgress < needed) {
        // Correct tap!
        hapticFeedback('success')
        const newProgress = { ...orderProgress, [item.type]: currentProgress + 1 }
        setOrderProgress(newProgress)
        
        // Combo bonus
        const comboBonus = Math.floor(comboCount / 3) * 2
        const points = item.points + comboBonus
        setScore(s => s + points)
        setAccuracy(a => ({ ...a, correct: a.correct + 1 }))
        setComboCount(c => c + 1)
        addFloatingText(x, y, `+${points}`, true)

        // Check if order complete
        const orderComplete = Object.keys(currentOrder).every(
          key => newProgress[key] >= currentOrder[key]
        )

        if (orderComplete) {
          completeOrder()
        }
      } else {
        // Over-fill penalty!
        hapticFeedback('warning')
        setScore(s => Math.max(0, s - 10))
        setAccuracy(a => ({ ...a, wrong: a.wrong + 1 }))
        setComboCount(0)
        addFloatingText(x, y, '-10 📦', false)
      }
    } else {
      // Wrong item (not in order)
      hapticFeedback('warning')
      setScore(s => Math.max(0, s - 15))
      setAccuracy(a => ({ ...a, wrong: a.wrong + 1 }))
      setComboCount(0)
      addFloatingText(x, y, '-15 ❌', false)
    }
  }

  const completeOrder = () => {
    hapticFeedback('success')
    
    // Calculate time bonus
    const timeTaken = (Date.now() - orderStartTime) / 1000
    let timeBonus = 0
    if (timeTaken < 8) timeBonus = 50
    else if (timeTaken < 15) timeBonus = 25
    else if (timeTaken < 25) timeBonus = 10

    const orderBonus = 50 + timeBonus
    setScore(s => s + orderBonus)
    setOrdersCompleted(o => o + 1)

    // Show completion
    addFloatingText(window.innerWidth / 2, window.innerHeight / 3, `+${orderBonus} ✅`, true)

    // Next order
    setTimeout(() => {
      const nextOrderNum = orderNumber + 1
      setOrderNumber(nextOrderNum)
      setCurrentOrder(generateOrder(nextOrderNum))
      setOrderProgress({})
      setOrderStartTime(Date.now())
    }, 600)
  }

  const calculateCoinsEarned = (finalScore, orders) => {
    if (finalScore <= 0) return 0
    const base = Math.floor(finalScore * 0.5)
    const orderBonus = orders * 25
    return base + orderBonus
  }

  const endGame = async () => {
    setGameState('ended')
    if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    if (spawnLoopRef.current) clearInterval(spawnLoopRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    
    const finalScore = Math.max(0, scoreRef.current)
    const earned = calculateCoinsEarned(finalScore, ordersCompleted)
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
    setTimeLeft(60)
    setItems([])
    setOrderNumber(1)
    setCurrentOrder(generateOrder(1))
    setOrderProgress({})
    setOrderStartTime(Date.now())
    setOrdersCompleted(0)
    setAccuracy({ correct: 0, wrong: 0 })
    setCoinsEarned(0)
    setFloatingTexts([])
    setComboCount(0)
  }

  const getAccuracyPercent = () => {
    const total = accuracy.correct + accuracy.wrong
    if (total === 0) return 100
    return Math.round((accuracy.correct / total) * 100)
  }

  return (
    <div className="h-full bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 bg-gradient-to-b from-black/40 to-transparent">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="w-9 h-9 bg-white/10 backdrop-blur rounded-full flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h2 className="text-white font-bold text-lg">Fill The Order</h2>
          <div className="bg-white/10 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1">
            <span className="text-amber-400 font-bold text-sm">{user?.gameCoins || 0}</span>
            <Coins size={14} className="text-amber-400" />
          </div>
        </div>
      </div>

      {/* Game Stats */}
      <div className="px-4 py-2 flex justify-between items-center">
        {/* Lives */}
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <Heart
              key={i}
              size={20}
              className={`transition-all ${i <= lives ? 'text-red-500 fill-red-500 scale-100' : 'text-gray-600 scale-75'}`}
            />
          ))}
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
          timeLeft <= 10 ? 'bg-red-500/40 animate-pulse' : 'bg-white/10'
        }`}>
          <Clock size={14} className={timeLeft <= 10 ? 'text-red-300' : 'text-white/70'} />
          <span className={`font-bold text-lg ${timeLeft <= 10 ? 'text-red-300' : 'text-white'}`}>
            {timeLeft}
          </span>
        </div>

        {/* Score */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full px-3 py-1 border border-amber-500/30">
          <span className="text-amber-300 font-bold">{score}</span>
        </div>
      </div>

      {/* Current Order Display */}
      {gameState === 'playing' && currentOrder && (
        <div className="mx-4 mb-2 bg-white/5 backdrop-blur rounded-2xl p-3 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm flex items-center gap-1.5">
              <Package size={14} />
              Order #{orderNumber}
            </span>
            {comboCount >= 3 && (
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                🔥 x{Math.floor(comboCount / 3) + 1}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(currentOrder).map(([type, needed]) => {
              const item = partnerItems[type]
              const progress = orderProgress[type] || 0
              const complete = progress >= needed
              return (
                <div 
                  key={type}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                    complete 
                      ? 'bg-green-500/30 border-2 border-green-400/60 scale-105' 
                      : 'bg-white/10 border border-white/20'
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex flex-col">
                    <span className={`font-bold text-sm ${complete ? 'text-green-300' : 'text-white'}`}>
                      {progress}/{needed}
                    </span>
                  </div>
                  {complete && <span className="text-green-400 text-lg">✓</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plays remaining */}
      <div className="text-center pb-1">
        <span className="text-white/40 text-xs">Plays: {playsRemaining}/5</span>
      </div>

      {/* Game Area */}
      <div
        ref={gameRef}
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: 'manipulation' }}
      >
        {/* Subtle background grid */}
        <div className="absolute inset-0 opacity-5">
          <div className="h-full w-full" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }} />
        </div>

        {/* Falling Items */}
        {items.map(item => (
          <div
            key={item.id}
            onClick={(e) => handleItemTap(item, e)}
            className={`absolute cursor-pointer active:scale-75 transition-transform duration-100`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
            }}
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg border-2 relative ${
              item.isTrap && item.hasX ? 'border-red-400/60 opacity-90' : 
              item.isDecoy ? 'border-yellow-300 shadow-yellow-400/40' : 
              'border-white/30'
            }`}>
              <span className="text-2xl drop-shadow-md">{item.emoji}</span>
              {item.hasX && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-red-300">
                  <span className="text-white text-xs font-bold">✕</span>
                </div>
              )}
              {item.isDecoy && (
                <div className="absolute -top-1 -right-1 text-yellow-300 text-sm animate-pulse">✨</div>
              )}
            </div>
          </div>
        ))}

        {/* Floating Texts */}
        {floatingTexts.map(ft => (
          <div
            key={ft.id}
            className={`absolute pointer-events-none font-black text-lg z-50 ${
              ft.isPositive ? 'text-green-400' : 'text-red-400'
            }`}
            style={{
              left: ft.x,
              top: ft.y,
              transform: 'translate(-50%, -50%)',
              animation: 'floatUp 1s ease-out forwards',
            }}
          >
            {ft.text}
          </div>
        ))}

        {/* Ready Screen */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-5 text-center max-w-sm w-full border border-slate-700 shadow-2xl">
              <div className="text-5xl mb-2">📦</div>
              <h3 className="text-2xl font-black text-white mb-1">Fill The Order</h3>
              <p className="text-gray-400 text-sm mb-3">
                Tap correct items to complete orders!
              </p>

              {/* How to play */}
              <div className="bg-slate-700/50 rounded-xl p-3 mb-3 text-left">
                <p className="text-white/90 text-sm font-semibold mb-2">📋 How to play:</p>
                <ul className="text-gray-300 text-xs space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Tap items shown in the order</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">✕</span>
                    <span>Avoid items with ❌ (expired)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠</span>
                    <span>Don't tap ✨ decoys — they're traps!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">⏱</span>
                    <span>Complete orders fast for bonus!</span>
                  </li>
                </ul>
              </div>

              {/* Item Legend */}
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                <div className="bg-green-500/20 rounded-lg p-1.5 border border-green-500/30">
                  <span className="text-lg">🛒</span>
                  <p className="text-green-400 text-xs font-bold">+10</p>
                </div>
                <div className="bg-amber-500/20 rounded-lg p-1.5 border border-amber-500/30">
                  <span className="text-lg">⭐</span>
                  <p className="text-amber-400 text-xs font-bold">+20</p>
                </div>
                <div className="bg-red-500/20 rounded-lg p-1.5 border border-red-500/30">
                  <span className="text-lg">🛒❌</span>
                  <p className="text-red-400 text-xs font-bold">-20</p>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-1.5 border border-yellow-500/30">
                  <span className="text-lg">💎✨</span>
                  <p className="text-yellow-400 text-xs font-bold">TRAP</p>
                </div>
              </div>

              {playsRemaining > 0 ? (
                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-green-500/30 active:scale-95 transition-transform"
                >
                  📦 START ({playsRemaining} plays left)
                </button>
              ) : (
                <div className="bg-slate-700 rounded-2xl p-4">
                  <p className="text-gray-300 font-bold">No plays left today!</p>
                  <p className="text-gray-500 text-sm mt-1">Come back tomorrow ⏰</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'ended' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-5 text-center max-w-sm w-full border border-slate-700 shadow-2xl">
              <div className="text-5xl mb-2">
                {ordersCompleted >= 5 ? '🏆' : ordersCompleted >= 3 ? '🎉' : ordersCompleted >= 1 ? '👍' : '💪'}
              </div>
              <h3 className="text-2xl font-black text-white mb-1">
                {ordersCompleted >= 5 ? 'SUPERSTAR!' : ordersCompleted >= 3 ? 'Great Job!' : ordersCompleted >= 1 ? 'Good Try!' : 'Keep Going!'}
              </h3>

              <div className="bg-slate-700/50 rounded-2xl p-4 my-3 border border-slate-600">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-left">
                    <span className="text-gray-400 text-xs">Orders</span>
                    <p className="text-white text-xl font-black">{ordersCompleted} 📦</p>
                  </div>
                  <div className="text-left">
                    <span className="text-gray-400 text-xs">Accuracy</span>
                    <p className="text-white text-xl font-black">{getAccuracyPercent()}%</p>
                  </div>
                  <div className="text-left">
                    <span className="text-gray-400 text-xs">Score</span>
                    <p className="text-white text-xl font-black">{score}</p>
                  </div>
                  <div className="text-left">
                    <span className="text-gray-400 text-xs">Coins</span>
                    <p className="text-amber-400 text-xl font-black">+{coinsEarned} 🪙</p>
                  </div>
                </div>
              </div>

              {saving ? (
                <p className="text-gray-400 mb-3 text-sm animate-pulse">Saving...</p>
              ) : (
                <p className="text-green-400 text-sm mb-3">✓ Coins added!</p>
              )}

              {playsRemaining > 0 ? (
                <button
                  onClick={startGame}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 active:scale-95 transition-transform mb-2"
                >
                  📦 PLAY AGAIN ({playsRemaining} left)
                </button>
              ) : (
                <div className="bg-slate-700 rounded-2xl p-3 mb-2">
                  <p className="text-gray-300 text-sm">No plays left!</p>
                </div>
              )}

              <button
                onClick={() => onNavigate('home')}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-slate-900/80 px-4 py-2 flex items-center justify-center gap-2 border-t border-white/5">
        <span className="text-lg">🏺</span>
        <span className="text-gray-500 text-xs">Earn coins for the monthly Jar Shake!</span>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -200%) scale(1.3); }
        }
      `}</style>
    </div>
  )
}