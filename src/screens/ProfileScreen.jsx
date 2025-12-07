import { ArrowLeft, Bell, Globe, HelpCircle, FileText, LogOut } from 'lucide-react'

export default function ProfileScreen({ user, onNavigate }) {
  const jarLevelEmoji = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    diamond: '💎'
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-4">
        <button 
          onClick={() => onNavigate('home')}
          className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h2 className="text-white font-bold text-lg">Profile</h2>
      </div>

      {/* Profile Card */}
      <div className="mx-4 mb-4 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-3xl p-5 border border-orange-500/30">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center border-4 border-white/20 shadow-lg shadow-orange-500/30">
            <span className="text-4xl">😊</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-xl">{user?.name || 'Tapsika User'}</p>
            <p className="text-gray-400 text-sm">{user?.phone || '+267 XX XXX XXX'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`bg-gradient-to-r ${
                user?.jarLevel === 'diamond' ? 'from-cyan-400 to-purple-500' :
                user?.jarLevel === 'gold' ? 'from-yellow-400 to-yellow-600' :
                user?.jarLevel === 'silver' ? 'from-gray-300 to-gray-500' :
                'from-orange-400 to-orange-600'
              } text-white text-xs px-2.5 py-1 rounded-full font-bold capitalize`}>
                {jarLevelEmoji[user?.jarLevel || 'bronze']} {user?.jarLevel || 'Bronze'}
              </span>
              <span className="bg-orange-500/30 text-orange-400 text-xs px-2.5 py-1 rounded-full font-bold">
                🔥 {user?.streak || 0} Days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mx-4 mb-4">
        {[
          { label: 'Total Saved', value: `P${(user?.airtimeSaved || 0).toFixed(0)}`, icon: '💰' },
          { label: 'Lifetime Sika', value: (user?.lifetimeSika || 0).toLocaleString(), icon: '🪙' },
          { label: 'Game Coins', value: (user?.gameCoins || 0).toLocaleString(), icon: '🎮' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
            <span className="text-2xl block mb-1">{stat.icon}</span>
            <p className="text-white font-bold">{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="mx-4 mb-4 bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <p className="text-gray-400 text-sm mb-3">Activity Stats</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs">Longest Streak</p>
            <p className="text-white font-bold text-lg">{user?.longestStreak || 0} days 🔥</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Saves This Month</p>
            <p className="text-white font-bold text-lg">{user?.savesThisMonth || 0}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Saved This Month</p>
            <p className="text-white font-bold text-lg">P{(user?.amountThisMonth || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Jar Resets</p>
            <p className="text-white font-bold text-lg">{user?.jarResets || 0}</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="mx-4 space-y-2 flex-1">
        {[
          { icon: Bell, label: 'Notifications', value: 'On', color: 'text-blue-400' },
          { icon: Globe, label: 'Language', value: 'English', color: 'text-green-400' },
          { icon: HelpCircle, label: 'Help & FAQ', value: '', color: 'text-yellow-400' },
          { icon: FileText, label: 'Terms & Privacy', value: '', color: 'text-purple-400' },
        ].map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              className="w-full bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className={item.color} size={20} />
                <span className="text-white">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">{item.value}</span>
                <span className="text-gray-500">→</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Referral Code */}
      <div className="mx-4 my-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <p className="text-gray-400 text-xs mb-1">Your Referral Code</p>
        <p className="text-orange-400 font-mono font-bold text-lg">{user?.referralCode || 'TAP000000'}</p>
      </div>

      {/* Logout */}
      <div className="mx-4 mb-6">
        <button className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors">
          <LogOut size={20} />
          Log Out
        </button>
      </div>

      {/* Version */}
      <div className="text-center pb-4">
        <p className="text-gray-600 text-xs">Tapsika v1.0.0</p>
      </div>
    </div>
  )
}