import { useState } from 'react'
import { HelpCircle, X, Flame, Wallet, Coins, ChevronRight } from 'lucide-react'

export default function HomeScreen({ user, onNavigate }) {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [coinAnimation, setCoinAnimation] = useState(false)

  // Calculate jar fill percentage (max P1000)
  const maxSavings = 1000
  const fillPercentage = Math.min(((user?.airtimeSaved || 0) / maxSavings) * 100, 100)

  // Jar level details
  const jarLevels = {
    bronze: { color: 'from-orange-400 to-orange-600', badge: '🥉', next: 'Silver', target: 50 },
    silver: { color: 'from-gray-300 to-gray-500', badge: '🥈', next: 'Gold', target: 200 },
    gold: { color: 'from-yellow-400 to-yellow-600', badge: '🥇', next: 'Diamond', target: 500 },
    diamond: { color: 'from-cyan-400 to-purple-500', badge: '💎', next: 'Max', target: 1000 }
  }

  const currentJar = jarLevels[user?.jarLevel || 'bronze']
  const progressToNext = Math.min((user?.airtimeSaved || 0) / currentJar.target * 100, 100)

  const triggerCoin = () => {
    setCoinAnimation(true)
    setTimeout(() => setCoinAnimation(false), 600)
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
            <span className="text-xl">🏺</span>
          </div>
          <div>
            <p className="text-white font-bold">{user?.name || 'Tapsika User'}</p>
            <p className="text-gray-400 text-xs capitalize">{user?.jarLevel || 'Bronze'} Jar</p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('profile')} 
          className="w-10 h-10 bg-slate-700/80 rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors"
        >
          <span className="text-xl">👤</span>
        </button>
      </div>

      {/* Points Display */}
      <div className="text-center py-2">
        <p className="text-gray-400 text-sm">Your Savings</p>
        <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
          P{(user?.airtimeSaved || 0).toFixed(2)}
        </p>
        <p className="text-green-400 text-sm mt-1">
          = P{(user?.voucherValue || 0).toFixed(2)} voucher value
        </p>
      </div>

      {/* Streak Badge */}
      <div className="flex justify-center mb-2">
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-orange-500/30 rounded-full px-4 py-1.5 flex items-center gap-2">
          <Flame size={18} className="text-orange-400" />
          <span className="text-orange-400 font-bold text-sm">{user?.streak || 0} Day Streak!</span>
        </div>
      </div>

      {/* THE JAR - Main Visual */}
      <div className="flex-1 flex items-center justify-center relative py-4" onClick={triggerCoin}>
        <div className="relative">
          {/* Jar Glow */}
          <div className={`absolute inset-0 bg-gradient-to-t ${currentJar.color} opacity-20 blur-3xl rounded-full scale-150`}></div>
          
          {/* Jar Container */}
          <div className="w-52 h-60 relative">
            {/* Jar Body */}
            <div className="absolute inset-x-4 top-8 bottom-0 bg-gradient-to-b from-white/20 to-white/5 rounded-b-[3rem] rounded-t-xl border-2 border-white/30 overflow-hidden backdrop-blur-sm">
              {/* Fill Level */}
              <div 
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${currentJar.color} transition-all duration-1000 ease-out`}
                style={{ height: `${fillPercentage}%` }}
              >
                {/* Coins inside */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-500 shadow-lg"
                      style={{
                        left: `${10 + (i * 12) % 75}%`,
                        bottom: `${5 + (i * 15) % 60}%`,
                        transform: `rotate(${i * 25}deg)`,
                        opacity: fillPercentage > 10 ? 1 : 0.3
                      }}
                    >
                      <span className="text-[10px] text-yellow-700 font-bold absolute inset-0 flex items-center justify-center">$</span>
                    </div>
                  ))}
                </div>
                
                {/* Shine effect on fill */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
              
              {/* Glass reflection */}
              <div className="absolute top-0 left-3 w-4 h-full bg-gradient-to-b from-white/30 to-transparent rounded-full"></div>
              
              {/* Empty state text */}
              {fillPercentage < 5 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white/40 text-sm font-medium">Start saving!</p>
                </div>
              )}
            </div>
            
            {/* Jar Lid */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <div className="w-32 h-7 bg-gradient-to-b from-amber-500 to-amber-700 rounded-full border-2 border-amber-400 shadow-lg"></div>
              <div className="w-24 h-4 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full mx-auto -mt-1"></div>
            </div>

            {/* Falling Coin Animation */}
            {coinAnimation && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-yellow-500 flex items-center justify-center shadow-lg">
                  <span className="text-yellow-700 font-bold text-sm">$</span>
                </div>
              </div>
            )}
          </div>

          {/* Level Badge */}
          <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r ${currentJar.color} rounded-full px-4 py-1 border-2 border-white/30 shadow-lg`}>
            <span className="text-white font-bold text-sm">{currentJar.badge} {user?.jarLevel || 'Bronze'}</span>
          </div>
        </div>
      </div>

      {/* Progress to Next Level */}
      <div className="px-6 mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Progress to {currentJar.next}</span>
          <span className="text-orange-400 font-bold">P{(user?.airtimeSaved || 0).toFixed(0)}/P{currentJar.target}</span>
        </div>
        <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${currentJar.color} rounded-full transition-all duration-500`}
            style={{ width: `${progressToNext}%` }}
          ></div>
        </div>
      </div>

      {/* Currency Cards */}
      <div className="px-4 mb-3 grid grid-cols-2 gap-3">
        {/* Sika Card */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400/20 rounded-full -mr-10 -mt-10"></div>
          <Wallet size={20} className="text-purple-300 mb-1" />
          <p className="text-purple-200 text-xs">Sika Balance</p>
          <p className="text-white text-xl font-black">{(user?.sika || 0).toLocaleString()}</p>
          <p className="text-purple-300 text-xs">From savings</p>
        </div>

        {/* Game Coins Card */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/20 rounded-full -mr-10 -mt-10"></div>
          <Coins size={20} className="text-amber-200 mb-1" />
          <p className="text-amber-100 text-xs">Game Coins</p>
          <p className="text-white text-xl font-black">{(user?.gameCoins || 0).toLocaleString()}</p>
          <p className="text-amber-200 text-xs">For Jar Shake</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mb-4">
        <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-3 border border-slate-700">
          <div className="flex justify-around">
            {[
              { icon: '🎮', label: 'Play', screen: 'game', color: 'from-green-400 to-emerald-500' },
              { icon: '🎁', label: 'Redeem', screen: 'redeem', color: 'from-purple-400 to-pink-500' },
              { icon: '🏆', label: 'Ranks', screen: 'leaderboard', color: 'from-blue-400 to-cyan-500' },
              { icon: '👥', label: 'Invite', screen: 'referral', color: 'from-orange-400 to-yellow-500' },
            ].map(item => (
              <button
                key={item.screen}
                onClick={() => onNavigate(item.screen)}
                className="flex flex-col items-center gap-1 px-2 py-1"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95`}>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <span className="text-gray-400 text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jar Shake Teaser */}
      <div className="px-4 mb-4">
        <button 
          onClick={() => onNavigate('game')}
          className="w-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">🏺✨</div>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Jar Shake Event</p>
              <p className="text-gray-400 text-xs">
                {(user?.gameCoins || 0) >= 2500 && (user?.amountThisMonth || 0) >= 20
                  ? '✅ You qualify! Enter now'
                  : `Need ${Math.max(0, 2500 - (user?.gameCoins || 0))} coins & P${Math.max(0, 20 - (user?.amountThisMonth || 0)).toFixed(0)} saved`
                }
              </p>
            </div>
          </div>
          <ChevronRight className="text-yellow-500" size={20} />
        </button>
      </div>

      {/* How It Works Button */}
      <div className="px-4 mb-4">
        <button 
          onClick={() => setShowHowItWorks(true)}
          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <HelpCircle size={18} />
          <span className="text-sm font-medium">How Tapsika Works</span>
        </button>
      </div>

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl w-full max-w-sm max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-white text-lg font-bold">How Tapsika Works</h2>
              <button onClick={() => setShowHowItWorks(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
              {[
                { num: '1', title: 'Save Airtime', desc: 'Dial *123*SAVE# to save up to P5/day of spare airtime.' },
                { num: '2', title: 'Earn Sika', desc: 'Every P1 saved = 100 Sika. Watch your jar fill up!' },
                { num: '3', title: 'Play Games', desc: 'Play Coin Catch daily to earn Game Coins for monthly Jar Shake.' },
                { num: '4', title: 'Redeem Vouchers', desc: 'Get 80% of your savings as vouchers at Choppies, Shoprite & more!' },
              ].map(step => (
                <div key={step.num} className="flex gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{step.title}</h3>
                    <p className="text-slate-400 text-sm mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
              
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 mt-4">
                <p className="text-white font-semibold mb-1">💡 Example</p>
                <p className="text-slate-300 text-sm">Save P100 airtime → Get P80 shopping voucher</p>
                <p className="text-green-400 text-sm font-medium mt-2">Spare airtime. Real groceries.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}