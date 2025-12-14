import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Heart, Coins, Clock, Volume2, VolumeX } from 'lucide-react'
import { recordGamePlay, getPlaysToday } from '../lib/supabase'
import { hapticFeedback } from '../lib/telegram'

// ============ AUDIO ENGINE ============
class AudioEngine {
  constructor() {
    this.ctx = null
    this.enabled = true
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  // Soft tap sound for movement
  playStep() {
    if (!this.enabled || !this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime)
    gain.gain.exponentialDecayTo = 0.01
    gain.gain.setTargetAtTime(0.01, this.ctx.currentTime, 0.05)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.1)
  }

  // Danger heartbeat
  playHeartbeat() {
    if (!this.enabled || !this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.frequency.value = 60
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime)
    gain.gain.setTargetAtTime(0.01, this.ctx.currentTime, 0.1)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.2)
  }

  // Explosion sound
  playExplosion() {
    if (!this.enabled || !this.ctx) return
    const bufferSize = this.ctx.sampleRate * 0.3
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
    }
    const source = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    source.buffer = buffer
    source.connect(gain)
    gain.connect(this.ctx.destination)
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime)
    source.start()
  }

  // Collect voucher ding
  playCollect() {
    if (!this.enabled || !this.ctx) return
    const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const startTime = this.ctx.currentTime + i * 0.1
      gain.gain.setValueAtTime(0.2, startTime)
      gain.gain.setTargetAtTime(0.01, startTime + 0.1, 0.1)
      osc.start(startTime)
      osc.stop(startTime + 0.3)
    })
  }

  // Victory fanfare
  playVictory() {
    if (!this.enabled || !this.ctx) return
    const melody = [523, 659, 784, 1047, 784, 1047]
    melody.forEach((freq, i) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.frequency.value = freq
      osc.type = 'triangle'
      const startTime = this.ctx.currentTime + i * 0.15
      gain.gain.setValueAtTime(0.25, startTime)
      gain.gain.setTargetAtTime(0.01, startTime + 0.12, 0.05)
      osc.start(startTime)
      osc.stop(startTime + 0.3)
    })
  }

  // Lose sound
  playLose() {
    if (!this.enabled || !this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.frequency.setValueAtTime(400, this.ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.5)
    osc.type = 'sawtooth'
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
    gain.gain.setTargetAtTime(0.01, this.ctx.currentTime + 0.3, 0.1)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.6)
  }

  // Timer tick
  playTick() {
    if (!this.enabled || !this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.frequency.value = 1000
    osc.type = 'square'
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime)
    gain.gain.setTargetAtTime(0.01, this.ctx.currentTime, 0.02)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.05)
  }

  toggle() {
    this.enabled = !this.enabled
    return this.enabled
  }
}

const audio = new AudioEngine()

// ============ PARTICLE SYSTEM ============
const Particles = ({ particles }) => (
  <>
    {particles.map(p => (
      <div
        key={p.id}
        className="absolute pointer-events-none z-50"
        style={{
          left: p.x,
          top: p.y,
          transform: `translate(-50%, -50%) scale(${p.scale})`,
          opacity: p.opacity,
          transition: 'all 0.05s linear',
        }}
      >
        <span className="text-2xl">{p.emoji}</span>
      </div>
    ))}
  </>
)

// ============ MAIN GAME COMPONENT ============
export default function GameScreen({ user, setUser, playsRemaining, setPlaysRemaining, refreshUser, onNavigate }) {
  const [gameState, setGameState] = useState('ready') // ready, playing, won, lost, collecting
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
  const [moveCount, setMoveCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [visitedTiles, setVisitedTiles] = useState(new Set())
  const [particles, setParticles] = useState([])
  
  // Visual effects states
  const [screenShake, setScreenShake] = useState(false)
  const [dangerLevel, setDangerLevel] = useState(0) // 0-3 based on bomb proximity
  const [faceState, setFaceState] = useState('happy') // happy, worried, scared, hurt, excited
  const [showCollectAnimation, setShowCollectAnimation] = useState(false)
  
  const timerRef = useRef(null)
  const bombMoveRef = useRef(null)
  const livesRef = useRef(3)
  const playerPosRef = useRef({ x: 1, y: 1 })

  useEffect(() => {
    livesRef.current = lives
  }, [lives])

  useEffect(() => {
    playerPosRef.current = playerPos
  }, [playerPos])

  // Partner prizes
  const prizes = [
    { id: 'choppies', emoji: '🛒', label: 'Choppies', bonus: 15, color: 'from-green-400 to-green-600', bgColor: 'bg-green-500' },
    { id: 'shoprite', emoji: '🏪', label: 'Shoprite', bonus: 12, color: 'from-red-400 to-red-600', bgColor: 'bg-red-500' },
    { id: 'shell', emoji: '⛽', label: 'Shell', bonus: 10, color: 'from-yellow-400 to-yellow-600', bgColor: 'bg-yellow-500' },
    { id: 'pep', emoji: '👕', label: 'PEP', bonus: 10, color: 'from-blue-400 to-blue-600', bgColor: 'bg-blue-500' },
    { id: 'spar', emoji: '🛍️', label: 'Spar', bonus: 12, color: 'from-orange-400 to-orange-600', bgColor: 'bg-orange-500' },
  ]

  // Face emoji based on state
  const getFaceEmoji = () => {
    switch (faceState) {
      case 'hurt': return '😵'
      case 'scared': return '😱'
      case 'worried': return '😰'
      case 'excited': return '🤩'
      default: return '😊'
    }
  }

  // Spawn confetti particles
  const spawnConfetti = (x, y, count = 20) => {
    const emojis = ['🎉', '✨', '⭐', '🌟', '💫', '🎊']
    const newParticles = []
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: x + (Math.random() - 0.5) * 200,
        y: y + (Math.random() - 0.5) * 200,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        scale: 0.5 + Math.random() * 1,
        opacity: 1,
      })
    }
    setParticles(prev => [...prev, ...newParticles])
    
    // Animate particles
    let frame = 0
    const animate = () => {
      frame++
      setParticles(prev => prev.map(p => ({
        ...p,
        y: p.y + 3,
        opacity: Math.max(0, p.opacity - 0.02),
        scale: p.scale * 0.98,
      })).filter(p => p.opacity > 0))
      if (frame < 60) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }

  // Spawn explosion particles
  const spawnExplosion = (x, y) => {
    const newParticles = []
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2
      newParticles.push({
        id: Date.now() + i,
        x: x,
        y: y,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        emoji: '💥',
        scale: 1,
        opacity: 1,
      })
    }
    setParticles(prev => [...prev, ...newParticles])
    
    let frame = 0
    const animate = () => {
      frame++
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + (p.vx || 0),
        y: p.y + (p.vy || 0),
        opacity: Math.max(0, p.opacity - 0.05),
        scale: p.scale * 0.95,
      })).filter(p => p.opacity > 0))
      if (frame < 30) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }

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
    setCurrentPrize(prizes[Math.floor(Math.random() * prizes.length)])
  }, [user?.id])

  // Generate maze
  const generateMaze = (width, height) => {
    const grid = Array(height).fill(null).map(() => Array(width).fill(1))
    
    const carve = (x, y) => {
      grid[y][x] = 0
      const directions = [
        { dx: 0, dy: -2 },
        { dx: 2, dy: 0 },
        { dx: 0, dy: 2 },
        { dx: -2, dy: 0 },
      ].sort(() => Math.random() - 0.5)
      
      for (const { dx, dy } of directions) {
        const nx = x + dx
        const ny = y + dy
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === 1) {
          grid[y + dy/2][x + dx/2] = 0
          carve(nx, ny)
        }
      }
    }
    
    carve(1, 1)
    grid[1][1] = 0
    grid[height - 2][width - 2] = 0
    
    // Add extra paths
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        if (grid[y][x] === 0 && Math.random() < 0.35) {
          const neighbors = [
            { nx: x, ny: y - 1 },
            { nx: x + 1, ny: y },
            { nx: x, ny: y + 1 },
            { nx: x - 1, ny: y },
          ]
          const wallNeighbor = neighbors.find(n => 
            n.nx > 0 && n.nx < width - 1 && n.ny > 0 && n.ny < height - 1 && grid[n.ny][n.nx] === 1
          )
          if (wallNeighbor) grid[wallNeighbor.ny][wallNeighbor.nx] = 0
        }
      }
    }
    
    return grid
  }

  // Generate bombs
  const generateBombs = (maze, numBombs, playerStart, voucherEnd) => {
    const bombs = []
    const height = maze.length
    const width = maze[0].length
    const pathCells = []
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (maze[y][x] === 0) {
          const distFromStart = Math.abs(x - playerStart.x) + Math.abs(y - playerStart.y)
          const distFromEnd = Math.abs(x - voucherEnd.x) + Math.abs(y - voucherEnd.y)
          if (distFromStart > 3 && distFromEnd > 2) {
            pathCells.push({ x, y })
          }
        }
      }
    }
    
    const shuffled = pathCells.sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(numBombs, shuffled.length); i++) {
      const pos = shuffled[i]
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
        moveDir: 1,
        glowing: false,
      })
    }
    
    return bombs
  }

  // Move bombs and check danger
  useEffect(() => {
    if (gameState !== 'playing') return

    bombMoveRef.current = setInterval(() => {
      setBombs(prev => {
        const updated = prev.map(bomb => {
          if (bomb.direction === 'stationary') return bomb
          
          let newX = bomb.x
          let newY = bomb.y
          
          if (bomb.direction === 'horizontal') {
            newX = bomb.x + bomb.moveDir * 0.12
          } else {
            newY = bomb.y + bomb.moveDir * 0.12
          }
          
          const checkX = Math.round(newX)
          const checkY = Math.round(newY)
          
          if (maze[checkY]?.[checkX] === 1) {
            return { ...bomb, moveDir: bomb.moveDir * -1 }
          }
          
          // Check distance to player for glow effect
          const dist = Math.sqrt(
            Math.pow(newX - playerPosRef.current.x, 2) + 
            Math.pow(newY - playerPosRef.current.y, 2)
          )
          
          return { ...bomb, x: newX, y: newY, glowing: dist < 2 }
        })

        // Calculate danger level
        let minDist = 999
        for (const bomb of updated) {
          const dist = Math.sqrt(
            Math.pow(bomb.x - playerPosRef.current.x, 2) + 
            Math.pow(bomb.y - playerPosRef.current.y, 2)
          )
          if (dist < minDist) minDist = dist
        }

        if (minDist < 1.2) {
          setDangerLevel(3)
          setFaceState('scared')
        } else if (minDist < 2) {
          setDangerLevel(2)
          setFaceState('worried')
          audio.playHeartbeat()
        } else if (minDist < 3) {
          setDangerLevel(1)
          setFaceState('worried')
        } else {
          setDangerLevel(0)
          setFaceState('happy')
        }

        // Check collision
        for (const bomb of updated) {
          const dist = Math.sqrt(
            Math.pow(bomb.x - playerPosRef.current.x, 2) + 
            Math.pow(bomb.y - playerPosRef.current.y, 2)
          )
          if (dist < 0.7) {
            hapticFeedback('error')
            audio.playExplosion()
            setScreenShake(true)
            setFaceState('hurt')
            setTimeout(() => setScreenShake(false), 300)
            setTimeout(() => setFaceState('happy'), 500)
            
            // Explosion particles
            const cellSize = Math.floor((Math.min(window.innerWidth, 400) - 32) / 9)
            spawnExplosion(bomb.x * cellSize + 50, bomb.y * cellSize + 200)
            
            setLives(l => {
              const newLives = l - 1
              if (newLives <= 0) {
                setTimeout(() => loseGame(), 100)
              }
              return newLives
            })
            setPlayerPos({ x: 1, y: 1 })
            playerPosRef.current = { x: 1, y: 1 }
            break
          }
        }
        
        return updated
      })
    }, 50)

    return () => {
      if (bombMoveRef.current) clearInterval(bombMoveRef.current)
    }
  }, [gameState, maze])

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 10) audio.playTick()
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
    if (gameState !== 'playing' || reachedVoucher) return
    if (maze[y]?.[x] !== 0) return
    
    const dx = Math.abs(x - playerPos.x)
    const dy = Math.abs(y - playerPos.y)
    
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      audio.init()
      audio.playStep()
      hapticFeedback('light')
      
      setPlayerPos({ x, y })
      playerPosRef.current = { x, y }
      setMoveCount(m => m + 1)
      setVisitedTiles(prev => new Set([...prev, `${x},${y}`]))
      
      if (x === voucherPos.x && y === voucherPos.y) {
        setReachedVoucher(true)
        setFaceState('excited')
        audio.playCollect()
      }
    }
  }

  // Handle voucher collection
  const handleCollectVoucher = () => {
    if (!reachedVoucher) return
    
    setShowCollectAnimation(true)
    audio.playVictory()
    hapticFeedback('success')
    
    // Confetti explosion
    spawnConfetti(window.innerWidth / 2, window.innerHeight / 2, 30)
    
    setTimeout(() => {
      winGame()
    }, 1500)
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
    audio.playLose()
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
    
    audio.init()
    
    const newMaze = generateMaze(9, 9)
    setMaze(newMaze)
    
    const start = { x: 1, y: 1 }
    const end = { x: 7, y: 7 }
    setPlayerPos(start)
    playerPosRef.current = start
    setVoucherPos(end)
    
    const numBombs = 3 + Math.floor(Math.random() * 2)
    setBombs(generateBombs(newMaze, numBombs, start, end))
    
    setCurrentPrize(prizes[Math.floor(Math.random() * prizes.length)])
    
    setGameState('playing')
    setLives(3)
    livesRef.current = 3
    setTimeLeft(25)
    setReachedVoucher(false)
    setCoinsEarned(0)
    setMoveCount(0)
    setVisitedTiles(new Set(['1,1']))
    setDangerLevel(0)
    setFaceState('happy')
    setShowCollectAnimation(false)
    setParticles([])
  }

  const toggleSound = () => {
    const enabled = audio.toggle()
    setSoundEnabled(enabled)
  }

  const cellSize = Math.floor((Math.min(window.innerWidth, 400) - 32) / 9)

  return (
    <div 
      className={`h-full bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950 flex flex-col overflow-hidden transition-all duration-100 ${
        screenShake ? 'animate-shake' : ''
      } ${dangerLevel >= 2 ? 'bg-red-950/30' : ''}`}
      style={{
        animation: screenShake ? 'shake 0.3s ease-in-out' : 'none'
      }}
    >
      {/* Particles */}
      <Particles particles={particles} />

      {/* CSS */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(255,0,0,0.5); }
          50% { box-shadow: 0 0 25px rgba(255,0,0,0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes spotlight {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .pulse-glow { animation: pulse-glow 0.5s ease-in-out infinite; }
        .float { animation: float 1s ease-in-out infinite; }
        .spotlight { animation: spotlight 1s ease-in-out infinite; }
      `}</style>

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
          <button
            onClick={toggleSound}
            className="w-9 h-9 bg-white/10 backdrop-blur rounded-full flex items-center justify-center"
          >
            {soundEnabled ? <Volume2 size={16} className="text-white" /> : <VolumeX size={16} className="text-white/50" />}
          </button>
          <div className="bg-white/10 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1">
            <span className="text-amber-400 font-bold text-sm">{user?.gameCoins || 0}</span>
            <Coins size={14} className="text-amber-400" />
          </div>
        </div>
      </div>

      {/* Game Stats */}
      {gameState === 'playing' && (
        <div className="px-4 py-2 flex justify-between items-center">
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <Heart
                key={i}
                size={22}
                className={`transition-all duration-300 ${i <= lives ? 'text-red-500 fill-red-500 scale-100' : 'text-gray-700 scale-75'}`}
              />
            ))}
          </div>

          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
            timeLeft <= 10 ? 'bg-red-500/40 animate-pulse' : 'bg-white/10'
          }`}>
            <Clock size={16} className={timeLeft <= 10 ? 'text-red-300' : 'text-white/70'} />
            <span className={`font-bold text-xl ${timeLeft <= 10 ? 'text-red-300' : 'text-white'}`}>
              {timeLeft}
            </span>
          </div>

          {currentPrize && (
            <div className={`bg-gradient-to-r ${currentPrize.color} rounded-full px-3 py-1 shadow-lg`}>
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

      <div className="text-center pb-2">
        <span className="text-white/40 text-xs">Hunts: {playsRemaining}/5</span>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        
        {/* READY SCREEN */}
        {gameState === 'ready' && (
          <div className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-5 text-center max-w-sm w-full border border-purple-500/30 shadow-2xl shadow-purple-500/20">
            <div className="text-6xl mb-3 float">🎯</div>
            <h3 className="text-2xl font-black text-white mb-1">Sika Hunt</h3>
            <p className="text-purple-300/70 text-sm mb-4">
              Navigate the maze! Dodge bombs! Grab the voucher!
            </p>

            {currentPrize && (
              <div className={`bg-gradient-to-r ${currentPrize.color} rounded-2xl p-4 mb-4 shadow-lg`}>
                <p className="text-white/80 text-sm">Today's Prize</p>
                <p className="text-white text-4xl font-black">{currentPrize.emoji} +{currentPrize.bonus}%</p>
                <p className="text-white font-bold">{currentPrize.label} Bonus</p>
              </div>
            )}

            <div className="bg-purple-900/30 rounded-xl p-3 mb-4 text-left border border-purple-500/20">
              <ul className="text-purple-200/80 text-xs space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-2xl">😊</span>
                  <span>TAP adjacent tiles to move</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-2xl">💣</span>
                  <span>Avoid the moving bombs!</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-2xl">{currentPrize?.emoji}</span>
                  <span>Reach & TAP voucher to WIN!</span>
                </li>
              </ul>
            </div>

            {playsRemaining > 0 ? (
              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-orange-500/40 active:scale-95 transition-transform"
              >
                🎯 START HUNT ({playsRemaining} left)
              </button>
            ) : (
              <div className="bg-slate-700/50 rounded-2xl p-4">
                <p className="text-gray-300 font-bold">No hunts left today!</p>
                <p className="text-gray-500 text-sm mt-1">Come back tomorrow ⏰</p>
              </div>
            )}
          </div>
        )}

        {/* GAME MAZE */}
        {gameState === 'playing' && maze.length > 0 && (
          <div className="relative">
            <div 
              className="grid gap-0 rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-2xl shadow-purple-500/30"
              style={{ gridTemplateColumns: `repeat(9, ${cellSize}px)` }}
            >
              {maze.map((row, y) => 
                row.map((cell, x) => {
                  const isPlayer = playerPos.x === x && playerPos.y === y
                  const isVoucher = voucherPos.x === x && voucherPos.y === y
                  const isWall = cell === 1
                  const isVisited = visitedTiles.has(`${x},${y}`)
                  const isAdjacent = !isWall && !isVoucher && (
                    (Math.abs(x - playerPos.x) === 1 && y === playerPos.y) ||
                    (Math.abs(y - playerPos.y) === 1 && x === playerPos.x)
                  )
                  const isStart = x === 1 && y === 1
                  
                  return (
                    <div
                      key={`${x}-${y}`}
                      onClick={() => handleTileTap(x, y)}
                      className={`
                        flex items-center justify-center transition-all duration-150 relative
                        ${isWall ? 'bg-gradient-to-br from-slate-800 to-slate-900' : ''}
                        ${!isWall && !isVoucher ? 'bg-indigo-900/40' : ''}
                        ${isAdjacent ? 'bg-indigo-600/50 cursor-pointer hover:bg-indigo-500/60 active:bg-indigo-400/70' : ''}
                        ${isPlayer && !reachedVoucher ? 'bg-cyan-500/30' : ''}
                        ${isVoucher && !isPlayer ? 'bg-amber-500/20' : ''}
                        ${isVisited && !isPlayer && !isVoucher ? 'bg-cyan-900/30' : ''}
                        ${isStart && !isPlayer ? 'bg-green-900/30' : ''}
                      `}
                      style={{ width: cellSize, height: cellSize }}
                    >
                      {/* Wall texture */}
                      {isWall && (
                        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-slate-600/50 to-transparent" />
                      )}
                      
                      {/* Visited trail */}
                      {isVisited && !isPlayer && !isVoucher && (
                        <div className="absolute w-2 h-2 bg-cyan-400/30 rounded-full" />
                      )}
                      
                      {/* Player with dynamic face */}
                      {isPlayer && !reachedVoucher && (
                        <span className={`text-2xl transition-all duration-200 ${
                          dangerLevel >= 2 ? 'scale-110' : ''
                        }`}>
                          {getFaceEmoji()}
                        </span>
                      )}
                      
                      {/* Voucher with spotlight */}
                      {isVoucher && !isPlayer && currentPrize && (
                        <div className="relative">
                          <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl spotlight" style={{ width: cellSize * 1.5, height: cellSize * 1.5, left: -cellSize * 0.25, top: -cellSize * 0.25 }} />
                          <span className="text-2xl float relative z-10">{currentPrize.emoji}</span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Bombs */}
            {bombs.map(bomb => (
              <div
                key={bomb.id}
                className={`absolute pointer-events-none transition-all duration-75 ${bomb.glowing ? 'pulse-glow' : ''}`}
                style={{
                  left: bomb.x * cellSize,
                  top: bomb.y * cellSize,
                  width: cellSize,
                  height: cellSize,
                }}
              >
                <div className={`w-full h-full flex items-center justify-center ${bomb.glowing ? 'scale-125' : ''} transition-transform`}>
                  <span className="text-2xl drop-shadow-lg">💣</span>
                  {bomb.glowing && (
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-md" />
                  )}
                </div>
              </div>
            ))}

            {/* Collection overlay */}
            {reachedVoucher && !showCollectAnimation && (
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl cursor-pointer"
                onClick={handleCollectVoucher}
              >
                <div className="bg-gradient-to-b from-amber-400 to-orange-600 rounded-3xl p-6 text-center shadow-2xl shadow-orange-500/50 active:scale-95 transition-transform">
                  <div className="text-6xl mb-2 float">{currentPrize?.emoji}</div>
                  <p className="text-white font-black text-xl">TAP TO COLLECT!</p>
                  <p className="text-white/80 text-sm">+{currentPrize?.bonus}% {currentPrize?.label}</p>
                </div>
              </div>
            )}

            {/* Collection animation */}
            {showCollectAnimation && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 rounded-xl">
                <div className="text-center animate-bounce">
                  <div className="text-8xl mb-4">{currentPrize?.emoji}</div>
                  <p className="text-amber-400 font-black text-2xl">+{currentPrize?.bonus}% BONUS!</p>
                  <p className="text-white text-lg">{currentPrize?.label}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WIN SCREEN */}
        {gameState === 'won' && (
          <div className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-5 text-center max-w-sm w-full border border-green-500/50 shadow-2xl shadow-green-500/20">
            <div className="text-6xl mb-2">🎉</div>
            <h3 className="text-2xl font-black text-green-400 mb-1">HUNT COMPLETE!</h3>
            
            {currentPrize && (
              <div className={`bg-gradient-to-r ${currentPrize.color} rounded-2xl p-4 my-4 shadow-lg`}>
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
              <p className="text-green-400 text-sm mb-3">✓ Bonus unlocked for redemption!</p>
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

            <button onClick={() => onNavigate('home')} className="text-gray-400 hover:text-white transition-colors text-sm">
              Back to Home
            </button>
          </div>
        )}

        {/* LOSE SCREEN */}
        {gameState === 'lost' && (
          <div className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-5 text-center max-w-sm w-full border border-red-500/50 shadow-2xl shadow-red-500/20">
            <div className="text-6xl mb-2">😵</div>
            <h3 className="text-2xl font-black text-red-400 mb-1">
              {timeLeft <= 0 ? "TIME'S UP!" : 'BUSTED!'}
            </h3>
            <p className="text-gray-400 mb-4">
              {timeLeft <= 0 ? 'You ran out of time!' : 'The bombs got you!'}
            </p>

            {currentPrize && (
              <div className="bg-slate-700/30 rounded-2xl p-4 mb-4 opacity-60">
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

            <button onClick={() => onNavigate('home')} className="text-gray-400 hover:text-white transition-colors text-sm">
              Back to Home
            </button>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      {gameState === 'playing' && !reachedVoucher && (
        <div className={`px-4 py-3 text-center border-t transition-all ${
          dangerLevel >= 2 ? 'bg-red-900/30 border-red-500/30' : 'bg-slate-900/80 border-white/5'
        }`}>
          <p className={`text-sm ${dangerLevel >= 2 ? 'text-red-300' : 'text-gray-400'}`}>
            {dangerLevel >= 2 ? '⚠️ DANGER! Bomb nearby!' : '👆 Tap adjacent tiles to move'}
          </p>
        </div>
      )}
    </div>
  )
}