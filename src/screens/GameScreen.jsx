import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Coins } from 'lucide-react'
import { recordGamePlay, getPlaysToday } from '../lib/supabase'
import { hapticFeedback } from '../lib/telegram'

export default function GameScreen({ user, setUser, playsRemaining, setPlaysRemaining, refreshUser, onNavigate }) {
  const [gameState, setGameState] = useState('ready') // ready, playing, ended
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [coins, setCoins] = useState([])
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [saving, setSaving] = useState(false)
  const scoreRef = useRef(0)

  // Keep score ref in sync
  useEffect(() => {
    scoreRef.current = score
  }, [score])

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

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return
    
    if (timeLeft <= 0) {
      endGame()
      return
    }
    
    const timer = setInterval(() => {
      setTimeLeft(t => t - 1)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [gameState, timeLeft])

  // Spawn coins
  useEffect(() => {
    if (gameState !== 'playing') return
    
    const spawner = setInterval(() => {
      const rand = Math.random()
      let type = 'silver'
      if (rand > 0.95) type = 'diamond'
      else if (rand > 0.85) type = 'skull'
      else if (rand > 0.60) type = 'gold'
      
      const newCoin = {
        id: Date.now() + Math.random(),
        x: Math.random() * 75 + 10,
        y: 0,
        type
      }
      setCoins(prev => [...prev, newCoin])
    }, 600)

    return () => clearInterval(spawner)
  }, [gameState])

  // Move coins down
  useEffect(() => {
    if (gameState !== 'playing') return

    const mover = setInterval(() => {
      setCoins(prev => 
        prev
          .map(coin => ({ ...coin, y: coin.y + 3 }))
          .filter(coin => coin.y < 100)
      )
    }, 50)

    return () => clearInterval(mover)
  }, [gameState])

  const getCoinValue = (type) => {
    switch(type) {
      case 'diamond': return 30
      case 'gold': return 15
      case 'silver': return 5
      case 'skull': return -10
      default: return 0
    }
  }

  const getCoinStyle = (type) => {
    switch(type) {
      case 'diamond':
        return {
          bg: 'bg-gradient-to-br from-cyan-300 to-purple-500',
          border: 'border-cyan-400',
          shadow: 'shadow-cyan-400/50',
          label: '30'
        }
      case 'gold':
        return {
          bg: 'bg-gradient-to-br from-yellow-300 to-yellow-500',
          border: 'border-yellow-400',
          shadow: 'shadow-yellow-400/50',
          label: '15'
        }
      case 'skull':
        return {
          bg: 'bg-gradient-to-br from-red-500 to-red-700',
          border: 'border-red-400',
          shadow: 'shadow-red-500/50',
          label: '💀'
        }
      default: // silver
        return {
          bg: 'bg-gradient-to-br from-gray-200 to-gray-400',
          border: 'border-gray-300',
          shadow: 'shadow-gray-400/30',
          label: '5'
        }
    }
  }

  const collectCoin = (e, coinId, type) => {
    e.preventDefault()
    e.stopPropagation()
    
    setCoins(prev => prev.filter(c => c.id !== coinId))
    
    const points = getCoinValue(type)
    setScore(prev => Math.max(0, prev + points))
    
    // Haptic feedback
    if (type === 'skull') {
      hapticFeedback('error')
    } else if (type === 'diamond') {
      hapticFeedback('success')
    } else {
      hapticFeedback('light')
    }
  }

  const calculateCoinsEarned = (finalScore) => {
    if (finalScore <= 0) return 0
    if (finalScore <= 50) return Math.floor(finalScore * 0.6)
    if (finalScore <= 100) return Math.floor(finalScore * 0.8)
    if (finalScore <= 150) return Math.floor(finalScore * 1.0)
    if (finalScore <= 200) return Math.floor(finalScore * 1.2)
    return Math.floor(finalScore * 1.5)
  }

  const endGame = async () => {
    setGameState('ended')
    const finalScore = Math.max(0, scoreRef.current)
    const earned = calculateCoinsEarned(finalScore)
    setCoinsEarned(earned)
    
    if (earned > 0 && user?.id) {
      setSaving(true)
      try {
        console.log('Saving game result:', { userId: user.id, score: finalScore, earned })
        const result = await recordGamePlay(user.id, finalScore, earned)
        console.log('Save result:', result)
        
        // Update user state with new balance
        if (result.balance) {
          setUser(prev => ({
            ...prev,
            gameCoins: result.balance.game_coins || 0,
            lifetimeGameCoins: result.balance.lifetime_game_coins || 0
          }))
        }
        
        // Update plays remaining
        if (typeof result.playsRemaining === 'number') {
          setPlaysRemaining(result.playsRemaining)
        }
        
        console.log('State updated successfully')
      } catch (err) {
        console.error('Failed to save game:', err)
        // Show error to user
        alert(`Failed to save: ${err.message}. Check console for details.`)
      }
      setSaving(false)
    }
  }

  const startGame = () => {
    if (playsRemaining <= 0) return
    
    setGameState('playing')
    setScore(0)
    scoreRef.current = 0
    setTimeLeft(30)
    setCoins([])
    setCoinsEarned(0)
  }

  return (
    <div className="h-full bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => onNavigate('home')} 
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h2 className="text-white font-bold text-lg">Coin Catch</h2>
        <div className="bg-white/10 rounded-full px-3 py-1.5 flex items-center gap-1">
          <span className="text-amber-400 font-bold">{user?.gameCoins || 0}</span>
          <Coins size={16} className="text-amber-400" />
        </div>
      </div>

      {/* Plays remaining */}
      <div className="flex justify-center mb-2">
        <div className="bg-slate-800/80 rounded-full px-4 py-1">
          <span className="text-gray-400 text-sm">Plays today: </span>
          <span className="text-white font-bold">{playsRemaining}/5</span>
        </div>
      </div>

      {/* Score & Timer */}
      <div className="flex justify-around px-6 py-3">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Score</p>
          <p className={`text-4xl font-black ${score < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
            {score}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Time</p>
          <p className={`text-4xl font-black ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </p>
        </div>
      </div>

      {/* Game Area */}
      <div 
        className="flex-1 relative mx-4 mb-4 rounded-3xl bg-gradient-to-b from-slate-800/50 to-slate-900/80 border border-slate-700/50 overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        {/* Ready State */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            {/* Coin Icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-yellow-500/30 border-4 border-yellow-400">
              <span className="text-5xl">🪙</span>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">Coin Catch!</h3>
            <p className="text-gray-400 text-center mb-4 text-sm">
              Tap coins to collect • Avoid skulls!
            </p>
            
            {/* Coin types legend */}
            <div className="grid grid-cols-2 gap-2 mb-6 w-full max-w-xs">
              {[
                { type: 'silver', label: 'Silver', value: '+5', color: 'bg-gray-400/20 border-gray-400/30' },
                { type: 'gold', label: 'Gold', value: '+15', color: 'bg-yellow-500/20 border-yellow-500/30' },
                { type: 'diamond', label: 'Diamond', value: '+30', color: 'bg-cyan-500/20 border-cyan-500/30' },
                { type: 'skull', label: 'Skull', value: '-10', color: 'bg-red-500/20 border-red-500/30' },
              ].map(item => (
                <div key={item.type} className={`flex items-center gap-2 ${item.color} border rounded-full px-3 py-1.5`}>
                  <div className={`w-6 h-6 rounded-full ${getCoinStyle(item.type).bg} flex items-center justify-center text-xs font-bold border ${getCoinStyle(item.type).border}`}>
                    {getCoinStyle(item.type).label}
                  </div>
                  <span className={`text-xs ${item.type === 'skull' ? 'text-red-400' : 'text-white'}`}>{item.value}</span>
                </div>
              ))}
            </div>
            
            {playsRemaining > 0 ? (
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold px-10 py-4 rounded-2xl text-lg shadow-lg shadow-green-500/30 active:scale-95 transition-transform"
              >
                Start Game 🎮
              </button>
            ) : (
              <div className="text-center">
                <div className="bg-slate-700/80 text-gray-400 font-bold px-8 py-4 rounded-2xl">
                  No plays left today 😢
                </div>
                <p className="text-red-400 text-sm mt-3">Come back tomorrow!</p>
              </div>
            )}
          </div>
        )}

        {/* Playing State */}
        {gameState === 'playing' && (
          <>
            {coins.map(coin => {
              const style = getCoinStyle(coin.type)
              return (
                <button
                  key={coin.id}
                  onPointerDown={(e) => collectCoin(e, coin.id, coin.type)}
                  className={`absolute w-14 h-14 rounded-full flex items-center justify-center font-bold shadow-lg border-2 transition-transform active:scale-75 ${style.bg} ${style.border} ${style.shadow}`}
                  style={{ 
                    left: `${coin.x}%`, 
                    top: `${coin.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className={`text-lg ${coin.type === 'skull' ? 'text-white' : coin.type === 'diamond' ? 'text-white' : coin.type === 'gold' ? 'text-yellow-800' : 'text-gray-600'}`}>
                    {style.label}
                  </span>
                </button>
              )
            })}
          </>
        )}

        {/* Ended State */}
        {gameState === 'ended' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-6">
            <div className="text-6xl mb-4">
              {score >= 150 ? '🏆' : score >= 75 ? '🎉' : score > 0 ? '👏' : '😅'}
            </div>
            <h3 className="text-3xl font-black text-white mb-2">
              {score >= 150 ? 'Amazing!' : score >= 75 ? 'Great Job!' : score > 0 ? 'Nice Try!' : 'Oops!'}
            </h3>
            
            <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-xs mb-5">
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-700">
                <span className="text-slate-400">Final Score</span>
                <span className="text-white font-bold text-2xl">{score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Coins Earned</span>
                <span className="text-amber-400 font-bold text-2xl flex items-center gap-1">
                  +{coinsEarned} <Coins size={20} />
                </span>
              </div>
            </div>
            
            <p className="text-gray-400 mb-4 text-sm">
              {saving ? 'Saving...' : coinsEarned > 0 ? 'Coins added to your balance!' : 'Try to score higher!'}
            </p>
            
            {playsRemaining > 0 ? (
              <button
                onClick={startGame}
                className="w-full max-w-xs bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-4 rounded-2xl text-lg active:scale-95 transition-transform"
              >
                Play Again ({playsRemaining} left)
              </button>
            ) : (
              <div className="w-full max-w-xs bg-slate-700 text-gray-400 font-bold py-4 rounded-2xl text-center">
                No plays left today
              </div>
            )}
            
            <button
              onClick={() => onNavigate('home')}
              className="mt-3 text-gray-400 font-medium"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="px-6 pb-4 text-center">
        <p className="text-gray-500 text-xs">
          🪙 Earn coins for the monthly Jar Shake event!
        </p>
      </div>
    </div>
  )
}