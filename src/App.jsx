import { useState, useEffect } from 'react'
import { Home, Gamepad2, Gift, Trophy, Users, User } from 'lucide-react'
import { getOrCreateUser, getUserProfile, getPlaysToday } from './lib/supabase'
import { initTelegram, getTelegramUser, isInTelegram } from './lib/telegram'

// Screens
import SplashScreen from './screens/SplashScreen'
import HomeScreen from './screens/HomeScreen'
import GameScreen from './screens/GameScreen'
import RedeemScreen from './screens/RedeemScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'
import ReferralScreen from './screens/ReferralScreen'
import ProfileScreen from './screens/ProfileScreen'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playsRemaining, setPlaysRemaining] = useState(5)

  // Initialize app
  useEffect(() => {
    async function init() {
      try {
        // Initialize Telegram SDK
        initTelegram()
        
        // Get Telegram user data
        const tgUser = getTelegramUser()
        
        // Get or create user in database
        const dbUser = await getOrCreateUser(
          tgUser.id,
          tgUser.username,
          tgUser.first_name
        )
        
        // Get full profile with balances
        const profile = await getUserProfile(dbUser.id)
        
        // Get plays remaining today
        const playsToday = await getPlaysToday(dbUser.id)
        setPlaysRemaining(5 - playsToday)
        
        // Set user state with all data
        setUser({
          id: profile.id,
          name: profile.display_name || profile.telegram_username || 'Tapsika User',
          phone: profile.phone_number || '+267 XX XXX XXX',
          telegramId: profile.telegram_id,
          referralCode: profile.referral_code,
          // Savings data
          airtimeSaved: parseFloat(profile.balances?.airtime_saved || 0),
          voucherValue: parseFloat(profile.balances?.airtime_saved || 0) * 0.8,
          // Sika (from savings)
          sika: profile.balances?.sika_balance || 0,
          lifetimeSika: profile.balances?.lifetime_sika || 0,
          // Game Coins (from games)
          gameCoins: profile.balances?.game_coins || 0,
          lifetimeGameCoins: profile.balances?.lifetime_game_coins || 0,
          // Jar
          jarLevel: profile.balances?.jar_level || 'bronze',
          jarResets: profile.balances?.jar_resets || 0,
          // Streak
          streak: profile.streaks?.current_streak || 0,
          longestStreak: profile.streaks?.longest_streak || 0,
          savesThisMonth: profile.streaks?.saves_this_month || 0,
          amountThisMonth: parseFloat(profile.streaks?.amount_this_month || 0)
        })
        
        setLoading(false)
      } catch (err) {
        console.error('Init error:', err)
        setError(err.message)
        setLoading(false)
      }
    }
    
    init()
  }, [])

  // Auto-advance from splash
  useEffect(() => {
    if (currentScreen === 'splash' && !loading && !error) {
      const timer = setTimeout(() => setCurrentScreen('home'), 2500)
      return () => clearTimeout(timer)
    }
  }, [currentScreen, loading, error])

  // Refresh user data
  const refreshUser = async () => {
    if (!user?.id) return
    
    try {
      const profile = await getUserProfile(user.id)
      const playsToday = await getPlaysToday(user.id)
      setPlaysRemaining(5 - playsToday)
      
      setUser(prev => ({
        ...prev,
        airtimeSaved: parseFloat(profile.balances?.airtime_saved || 0),
        voucherValue: parseFloat(profile.balances?.airtime_saved || 0) * 0.8,
        sika: profile.balances?.sika_balance || 0,
        lifetimeSika: profile.balances?.lifetime_sika || 0,
        gameCoins: profile.balances?.game_coins || 0,
        lifetimeGameCoins: profile.balances?.lifetime_game_coins || 0,
        jarLevel: profile.balances?.jar_level || 'bronze',
        streak: profile.streaks?.current_streak || 0,
        savesThisMonth: profile.streaks?.saves_this_month || 0,
        amountThisMonth: parseFloat(profile.streaks?.amount_this_month || 0)
      }))
    } catch (err) {
      console.error('Refresh error:', err)
    }
  }

  // Show splash while loading
  if (currentScreen === 'splash' || loading) {
    return <SplashScreen error={error} />
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500 to-red-600 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <div className="text-white text-xl font-bold mb-2">Oops!</div>
          <div className="text-white/80 mb-6">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-red-600 font-bold px-6 py-3 rounded-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Screen props
  const screenProps = { 
    user, 
    setUser, 
    refreshUser,
    playsRemaining,
    setPlaysRemaining,
    onNavigate: setCurrentScreen
  }

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen {...screenProps} />
      case 'game':
        return <GameScreen {...screenProps} />
      case 'redeem':
        return <RedeemScreen {...screenProps} />
      case 'leaderboard':
        return <LeaderboardScreen {...screenProps} />
      case 'referral':
        return <ReferralScreen {...screenProps} />
      case 'profile':
        return <ProfileScreen {...screenProps} />
      default:
        return <HomeScreen {...screenProps} />
    }
  }

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'game', icon: Gamepad2, label: 'Play' },
    { id: 'redeem', icon: Gift, label: 'Redeem' },
    { id: 'leaderboard', icon: Trophy, label: 'Ranks' },
    { id: 'referral', icon: Users, label: 'Invite' },
  ]

  return (
    <div className="min-h-screen w-full max-w-[430px] mx-auto bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col relative" style={{ height: '100dvh' }}>
      {/* Dev mode banner */}
      {!isInTelegram() && (
        <div className="bg-amber-500 text-black text-center py-1 text-xs font-medium shrink-0">
          Dev Mode — Not in Telegram
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        {renderScreen()}
      </div>

      {/* Bottom navigation */}
      <nav className="bg-slate-800/95 backdrop-blur-lg border-t border-slate-700 px-4 py-2 flex justify-around items-center shrink-0 w-full">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = currentScreen === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-500/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}