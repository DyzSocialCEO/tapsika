import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Heart, Coins, Clock } from 'lucide-react'
import { recordGamePlay, getPlaysToday } from '../lib/supabase'
import { hapticFeedback } from '../lib/telegram'

export default function GameScreen({ user, setUser, playsRemaining, setPlaysRemaining, refreshUser, onNavigate }) {
  const [gameState, setGameState] = useState('ready') // ready, playing, won, lost
  const [lives, setLives] = useState(3)
  const [timeLeft, setTimeLeft] = useState(25)
  const [maze, setMaze] = useState([])
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 })
  const [voucherPos, setVoucherPos] = useState({ x: 0, y: 0 })
  const [bombs, setBombs] = useState([])
  const [currentPrize, setCurrentPrize] = useState(null)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [saving, setSaving] = useState(false)
  const [reachedVoucher, setReachedVoucher] = useState(false)
  const [hitEffect, setHitEffect] = useState(false)
  const [moveCount, setMoveCount] = useState(0)
  
  const timerRef = useRef(null)
  const bombMoveRef = useRef(null)
  const livesRef = useRef(3)

  useEffect(() => {
    livesRef.current = lives
  }, [lives])

  // Partner prizes
  const prizes = [
    { id: 'choppies', emoji: '🛒', label: 'Choppies', bonus: 15, color: 'from-green-400 to-green-600' },
    { id: 'shoprite', emoji: '🏪', label: 'Shoprite', bonus: 12, color: 'from-red-400 to-red-600' },
    { id: 'shell', emoji: '⛽', label: 'Shell', bonus: 10, color: 'from-yellow-400 to-yellow-600' },
    { id: 'pep', emoji: '👕', label: 'PEP', bonus: 10, color: 'from-blue-400 to-blue-600' },
    { id: 'spar', emoji: '🛍️', label: 'Spar', bonus: 12, color: 'from-orange-400 to-orange-600' },
  ]

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
    
    // Set random prize for display
    setCurrentPrize(prizes[Math.floor(Math.random() * prizes.length)])
  }, [user?.id])

  // Generate maze using recursive backtracking
  const generateMaze = (width, height) => {
    // Initialize grid with all walls
    const grid = Array(height).fill(null).map(() => 
      Array(width).fill(1) // 1 = wall
    )
    
    // Carve paths using recursive backtracking
    const carve = (x, y) => {
      grid[y][x] = 0 // 0 = path
      
      const directions = [
        { dx: 0, dy: -2 }, // up
        { dx: 2, dy: 0 },  // right
        { dx: 0, dy: 2 },  // down
        { dx: -2, dy: 0 }, // left
      ].sort(() => Math.random() - 0.5)
      
      for (const { dx, dy } of directions) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === 1) {
          grid[y + dy/2][x + dx/2] = 0 // Remove wall between
          carve(nx, ny)
        }
      }
    }
    
    // Start from top-left area
    carve(1, 1)
    
    // Ensure start and end are clear
    grid[1][1] = 0
    grid[height - 2][width - 2] = 0
    
    // Add some extra paths for easier navigation (30% of dead ends)
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        if (grid[y][x] === 0 && Math.random() < 0.3) {
          const neighbors = [
            { nx: x, ny: y - 1 },
            { nx: x + 1, ny: y },
            { nx: x, ny: y + 1 },
            { nx: x - 1, ny: y },
          ]
          const wallNeighbor = neighbors.find(n => 
            n.nx > 0 && n.nx < width - 1 && n.ny > 0 && n.ny < height - 1 && grid[n.ny][n.nx] === 1
          )
          if (wallNeighbor) {
            grid[wallNeighbor.ny][wallNeighbor.nx] = 0
          }
        }
      }
    }
    
    return grid
  }

  // Generate bomb positions and directions
  const generateBombs = (maze, numBombs, playerStart, voucherEnd) => {
    const bombs = []
    const height = maze.length
    const width = maze[0].length
    
    // Find valid path cells for bombs
    const pathCells = []
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (maze[y][x] === 0) {
          // Not too close to start or end
          const distFromStart = Math.abs(x - playerStart.x) + Math.abs(y - playerStart.y)
          const distFromEnd = Math.abs(x - voucherEnd.x) + Math.abs(y - voucherEnd.y)
          if (distFromStart > 3 && distFromEnd > 2) {
            pathCells.push({ x, y })
          }
        }
      }
    }
    
    // Place bombs
    const shuffled = pathCells.sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(numBombs, shuffled.length); i++) {
      const pos = shuffled[i]
      
      // Determine movement direction based on available space
      const canMoveHorizontal = maze[pos.y][pos.x - 1] === 0 || maze[pos.y][pos.x + 1] === 0
      const canMoveVertical = maze[pos.y - 1]?.[pos.x] === 0 || maze[pos.y + 1]?.[pos.x] === 0
      
      let direction
      if (canMoveHorizontal && canMoveVertical) {
        direction = Math.random() < 0.5 ? 'horizontal' : 'vertical'
      } else if (canMoveHorizontal) {
        direction = 'horizontal'
      } else if (canMoveVertical) {
        direction = 'vertical'
      } else {
        direction = 'stationary'
      }
      
      bombs.push({
        id: i,
        x: pos.x,
        y: pos.y,
        direction,
        moveDir: 1, // 1 or -1
        speed: 0.8 + Math.random() * 0.4,
      })
    }
    
    return bombs
  }

  // Move bombs
  useEffect(() => {
    if (gameState !== 'playing') return

    bombMoveRef.current = setInterval(() => {
      setBombs(prev => prev.map(bomb => {
        if (bomb.direction === 'stationary') return bomb
        
        let newX = bomb.x
        let newY = bomb.y
        
        if (bomb.direction === 'horizontal') {
          newX = bomb.x + bomb.moveDir * 0.15
        } else {
          newY = bomb.y + bomb.moveDir * 0.15
        }
        
        // Check wall collision
        const checkX = Math.round(newX)
        const checkY = Math.round(newY)
        
        if (maze[checkY]?.[checkX] === 1) {
          // Hit wall, reverse direction
          return { ...bomb, moveDir: bomb.moveDir * -1 }
        }
        
        return { ...bomb, x: newX, y: newY }
      }))
      
      // Check player collision with bombs
      setBombs(currentBombs => {
        for (const bomb of currentBombs) {
          const dist = Math.sqrt(
            Math.pow(bomb.x - playerPos.x, 2) + 
            Math.pow(bomb.y - playerPos.y, 2)
          )
          if (dist < 0.7) {
            // Hit!
            hapticFeedback('error')
            setHitEffect(true)
            setTimeout(() => setHitEffect(false), 300)
            
            setLives(l => {
              const newLives = l - 1
              if (newLives <= 0) {
                setTimeout(() => loseGame(), 100)
              }
              return newLives
            })
            
            // Reset player to start
            setPlayerPos({ x: 1, y: 1 })
          }
        }
        return currentBombs
      })
    }, 50)

    return () => {
      if (bombMoveRef.current) clearInterval(bombMoveRef.current)
    }
  }, [gameState, maze, playerPos])

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          loseGame()
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameState])

  // Handle tile tap
  const handleTileTap = (x, y) => {
    if (gameState !== 'playing') return
    if (maze[y]?.[x] !== 0) return // Can't tap walls
    
    // Check if adjacent to player
    const dx = Math.abs(x - playerPos.x)
    const dy = Math.abs(y - playerPos.y)
    
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      hapticFeedback('light')
      setPlayerPos({ x, y })
      setMoveCount(m => m + 1)
      
      // Check if reached voucher
      if (x === voucherPos.x && y === voucherPos.y) {
        setReachedVoucher(true)
      }
    }
  }

  // Handle voucher collection tap
  const handleCollectVoucher = () => {
    if (!reachedVoucher) return
    hapticFeedback('success')
    winGame()
  }

  const winGame = async () => {
    setGameState('won')
    if (timerRef.current) clearInterval(timerRef.current)
    if (bombMoveRef.current) clearInterval(bombMoveRef.current)
    
    const earned = 100 + (timeLeft * 5) + (lives * 20)
    setCoinsEarned(earned)

    if (user?.id) {
      setSaving(true)
      try {
        const result = await recordGamePlay(user.id, earned, earned)
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

  const loseGame = async () => {
    setGameState('lost')
    if (timerRef.current) clearInterval(timerRef.current)
    if (bombMoveRef.current) clearInterval(bombMoveRef.current)
    
    const earned = Math.floor(moveCount * 2)
    setCoinsEarned(earned)

    if (user?.id) {
      setSaving(true)
      try {
        const result = await recordGamePlay(user.id, 0, earned)
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

    // Generate maze (9x9 for mobile)
    const newMaze = generateMaze(9, 9)
    setMaze(newMaze)
    
    // Set positions
    const start = { x: 1, y: 1 }
    const end = { x: 7, y: 7 }
    setPlayerPos(start)
    setVoucherPos(end)
    
    // Generate bombs (3-4 for 30% win rate)
    const numBombs = 3 + Math.floor(Math.random() * 2)
    setBombs(generateBombs(newMaze, numBombs, start, end))
    
    // Set random prize
    setCurrentPrize(prizes[Math.floor(Math.random() * prizes.length)])
    
    // Reset state
    setGameState('playing')
    setLives(3)
    livesRef.current = 3
    setTimeLeft(25)
    setReachedVoucher(false)
    setCoinsEarned(0)
    setMoveCount(0)
    setHitEffect(false)
  }

  // Calculate cell size based on screen
  const cellSize = Math.floor((Math.min(window.innerWidth, 400) - 32) / 9)

  return (
    <div className={`h-full bg-gradient-to-b from-slate-900 via-indigo-900 to-slate-900 flex flex-col overflow-hidden ${hitEffect ? 'animate-pulse bg-red-900' : ''}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 bg-gradient-to-b from-black/40 to-transparent">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="w-9 h-9 bg-white/10 backdrop-blur rounded-full flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h2 className="text-white font-bold text-lg">🎯 Sika Hunt</h2>
          <div className="bg-white/10 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1">
            <span className="text-amber-400 font-bold text-sm">{user?.gameCoins || 0}</span>
            <Coins size={14} className="text-amber-400" />
          </div>
        </div>
      </div>

      {/* Game Stats */}
      {gameState === 'playing' && (
        <div className="px-4 py-2 flex justify-between items-center">
          {/* Lives */}
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <Heart
                key={i}
                size={22}
                className={`transition-all ${i <= lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
              />
            ))}
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full ${
            timeLeft <= 10 ? 'bg-red-500/40 animate-pulse' : 'bg-white/10'
          }`}>
            <Clock size={16} className={timeLeft <= 10 ? 'text-red-300' : 'text-white/70'} />
            <span className={`font-bold text-xl ${timeLeft <= 10 ? 'text-red-300' : 'text-white'}`}>
              {timeLeft}
            </span>
          </div>

          {/* Prize preview */}
          {currentPrize && (
            <div className={`bg-gradient-to-r ${currentPrize.color} rounded-full px-3 py-1`}>
              <span className="text-white font-bold text-sm">+{currentPrize.bonus}%</span>
            </div>
          )}
        </div>
      )}

      {/* Prize Display */}
      {gameState === 'playing' && currentPrize && (
        <div className="text-center pb-2">
          <span className="text-white/60 text-sm">
            Prize: <span className="text-white font-bold">{currentPrize.emoji} {currentPrize.label} +{currentPrize.bonus}%</span>
          </span>
        </div>
      )}

      {/* Plays remaining */}
      <div className="text-center pb-2">
        <span className="text-white/40 text-xs">Hunts: {playsRemaining}/5</span>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {gameState === 'ready' && (
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-5 text-center max-w-sm w-full border border-slate-700 shadow-2xl">
            <div className="text-6xl mb-3">🎯</div>
            <h3 className="text-2xl font-black text-white mb-1">Sika Hunt</h3>
            <p className="text-gray-400 text-sm mb-4">
              Navigate the maze! Dodge bombs! Grab the voucher!
            </p>

            {/* Prize Preview */}
            {currentPrize && (
              <div className={`bg-gradient-to-r ${currentPrize.color} rounded-2xl p-4 mb-4`}>
                <p className="text-white/80 text-sm">Today's Prize</p>
                <p className="text-white text-3xl font-black">{currentPrize.emoji} +{currentPrize.bonus}%</p>
                <p className="text-white font-bold">{currentPrize.label} Bonus</p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-slate-700/50 rounded-xl p-3 mb-4 text-left">
              <ul className="text-gray-300 text-xs space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">👆</span>
                  <span>TAP adjacent tiles to move</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400">💣</span>
                  <span>Avoid moving bombs!</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">🎁</span>
                  <span>Reach & TAP voucher to WIN!</span>
                </li>
              </ul>
            </div>

            {playsRemaining > 0 ? (
              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
              >
                🎯 START HUNT ({playsRemaining} left)
              </button>
            ) : (
              <div className="bg-slate-700 rounded-2xl p-4">
                <p className="text-gray-300 font-bold">No hunts left today!</p>
                <p className="text-gray-500 text-sm mt-1">Come back tomorrow ⏰</p>
              </div>
            )}
          </div>
        )}

        {/* MAZE GAME */}
        {gameState === 'playing' && maze.length > 0 && (
          <div className="relative">
            {/* Maze Grid */}
            <div 
              className="grid gap-0 rounded-xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20"
              style={{ 
                gridTemplateColumns: `repeat(9, ${cellSize}px)`,
              }}
            >
              {maze.map((row, y) => 
                row.map((cell, x) => {
                  const isPlayer = playerPos.x === x && playerPos.y === y
                  const isVoucher = voucherPos.x === x && voucherPos.y === y
                  const isWall = cell === 1
                  const isAdjacent = !isWall && (
                    (Math.abs(x - playerPos.x) === 1 && y === playerPos.y) ||
                    (Math.abs(y - playerPos.y) === 1 && x === playerPos.x)
                  )
                  
                  return (
                    <div
                      key={`${x}-${y}`}
                      onClick={() => handleTileTap(x, y)}
                      className={`
                        flex items-center justify-center transition-all
                        ${isWall ? 'bg-slate-800' : 'bg-indigo-900/50'}
                        ${isAdjacent && !isVoucher ? 'bg-indigo-700/50 cursor-pointer active:bg-indigo-600' : ''}
                        ${isPlayer ? 'bg-green-500/30' : ''}
                        ${isVoucher && !isPlayer ? 'bg-amber-500/20' : ''}
                      `}
                      style={{ 
                        width: cellSize, 
                        height: cellSize,
                      }}
                    >
                      {isPlayer && !reachedVoucher && (
                        <span className="text-2xl animate-pulse">🏃</span>
                      )}
                      {isVoucher && !isPlayer && currentPrize && (
                        <span className="text-2xl animate-bounce">{currentPrize.emoji}</span>
                      )}
                      {isVoucher && isPlayer && reachedVoucher && (
                        <div 
                          onClick={handleCollectVoucher}
                          className="absolute inset-0 flex items-center justify-center z-20"
                        >
                          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-3 animate-pulse shadow-xl shadow-orange-500/50 cursor-pointer active:scale-95">
                            <span className="text-3xl">{currentPrize?.emoji}</span>
                            <p className="text-white text-xs font-bold">TAP!</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Bombs overlay */}
            {bombs.map(bomb => (
              <div
                key={bomb.id}
                className="absolute pointer-events-none transition-all duration-75"
                style={{
                  left: bomb.x * cellSize,
                  top: bomb.y * cellSize,
                  width: cellSize,
                  height: cellSize,
                }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl animate-pulse drop-shadow-lg">💣</span>
                </div>
              </div>
            ))}

            {/* Reached voucher overlay */}
            {reachedVoucher && (
              <div 
                className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl"
                onClick={handleCollectVoucher}
              >
                <div className="bg-gradient-to-b from-amber-500 to-orange-600 rounded-3xl p-6 text-center animate-bounce cursor-pointer active:scale-95 shadow-2xl">
                  <span className="text-5xl">{currentPrize?.emoji}</span>
                  <p className="text-white font-black text-xl mt-2">TAP TO COLLECT!</p>
                  <p className="text-white/80 text-sm">+{currentPrize?.bonus}% {currentPrize?.label}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WIN Screen */}
        {gameState === 'won' && (
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-5 text-center max-w-sm w-full border border-green-500/50 shadow-2xl">
            <div className="text-6xl mb-2">🎉</div>
            <h3 className="text-2xl font-black text-green-400 mb-1">HUNT COMPLETE!</h3>
            
            {currentPrize && (
              <div className={`bg-gradient-to-r ${currentPrize.color} rounded-2xl p-4 my-4`}>
                <p className="text-white/80 text-sm">You Won</p>
                <p className="text-white text-4xl font-black">{currentPrize.emoji} +{currentPrize.bonus}%</p>
                <p className="text-white font-bold">{currentPrize.label} Bonus UNLOCKED!</p>
              </div>
            )}

            <div className="bg-slate-700/50 rounded-xl p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Coins Earned</span>
                <span className="text-amber-400 text-xl font-black">+{coinsEarned} 🪙</span>
              </div>
            </div>

            {saving ? (
              <p className="text-gray-400 mb-3 text-sm animate-pulse">Saving...</p>
            ) : (
              <p className="text-green-400 text-sm mb-3">✓ Bonus unlocked for this week!</p>
            )}

            {playsRemaining > 0 ? (
              <button
                onClick={startGame}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-2xl active:scale-95 transition-transform mb-2"
              >
                🎯 HUNT AGAIN ({playsRemaining} left)
              </button>
            ) : (
              <div className="bg-slate-700 rounded-2xl p-3 mb-2">
                <p className="text-gray-300 text-sm">No hunts left today!</p>
              </div>
            )}

            <button
              onClick={() => onNavigate('home')}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Back to Home
            </button>
          </div>
        )}

        {/* LOSE Screen */}
        {gameState === 'lost' && (
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-5 text-center max-w-sm w-full border border-red-500/50 shadow-2xl">
            <div className="text-6xl mb-2">💥</div>
            <h3 className="text-2xl font-black text-red-400 mb-1">
              {timeLeft <= 0 ? 'TIME\'S UP!' : 'BUSTED!'}
            </h3>
            <p className="text-gray-400 mb-4">
              {timeLeft <= 0 ? 'You ran out of time!' : 'The bombs got you!'}
            </p>

            {currentPrize && (
              <div className="bg-slate-700/50 rounded-2xl p-4 mb-4 opacity-50">
                <p className="text-gray-400 text-sm">Missed Prize</p>
                <p className="text-gray-300 text-2xl">{currentPrize.emoji} +{currentPrize.bonus}%</p>
              </div>
            )}

            <div className="bg-slate-700/50 rounded-xl p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Consolation Coins</span>
                <span className="text-amber-400 font-bold">+{coinsEarned} 🪙</span>
              </div>
            </div>

            {saving ? (
              <p className="text-gray-400 mb-3 text-sm animate-pulse">Saving...</p>
            ) : (
              <p className="text-gray-500 text-sm mb-3">Better luck next time!</p>
            )}

            {playsRemaining > 0 ? (
              <button
                onClick={startGame}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-2xl active:scale-95 transition-transform mb-2"
              >
                🎯 TRY AGAIN ({playsRemaining} left)
              </button>
            ) : (
              <div className="bg-slate-700 rounded-2xl p-3 mb-2">
                <p className="text-gray-300 text-sm">No hunts left today!</p>
              </div>
            )}

            <button
              onClick={() => onNavigate('home')}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      {gameState === 'playing' && !reachedVoucher && (
        <div className="bg-slate-900/80 px-4 py-3 text-center border-t border-white/5">
          <p className="text-gray-400 text-sm">👆 Tap adjacent tiles to move</p>
        </div>
      )}
    </div>
  )
}