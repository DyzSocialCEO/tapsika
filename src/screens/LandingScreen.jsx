import { useState, useEffect } from 'react'
import { ArrowLeft, Crown, Medal, TrendingUp } from 'lucide-react'
import { getLeaderboard, getUserRank } from '../lib/supabase'

export default function LeaderboardScreen({ user, onNavigate }) {
  const [leaders, setLeaders] = useState([])
  const [userRank, setUserRank] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [user?.id])

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard(20)
      setLeaders(data)
      
      if (user?.id) {
        const rank = await getUserRank(user.id)
        setUserRank(rank)
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
    }
    setLoading(false)
  }

  const getJarEmoji = (level) => {
    switch (level) {
      case 'diamond': return '💎'
      case 'gold': return '🥇'
      case 'silver': return '🥈'
      default: return '🥉'
    }
  }

  // Pad leaders array for podium display
  const topThree = [
    leaders[1] || { displayName: '---', lifetimeSika: 0, jarLevel: 'bronze' },
    leaders[0] || { displayName: '---', lifetimeSika: 0, jarLevel: 'bronze' },
    leaders[2] || { displayName: '---', lifetimeSika: 0, jarLevel: 'bronze' },
  ]

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      {/* Header - Centered */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-center gap-3">
          <button 
            onClick={() => onNavigate('home')}
            className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <span className="text-xl">🏆</span>
          <h2 className="text-white font-bold text-lg">Leaderboard</h2>
        </div>
      </div>

      {/* Your Rank Card */}
      {userRank && (
        <div className="mx-4 mb-4 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/30 rounded-full flex items-center justify-center">
              <TrendingUp className="text-orange-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Your Rank</p>
              <p className="text-white text-2xl font-black">#{userRank}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Lifetime Sika</p>
            <p className="text-yellow-400 text-xl font-bold">{(user?.lifetimeSika || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {!loading && leaders.length >= 1 && (
        <div className="flex justify-center items-end gap-2 px-4 py-4 mb-2">
          {/* 2nd Place */}
          <div className="text-center flex-1 max-w-[100px]">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-gray-200 shadow-lg">
              <span className="text-2xl">{getJarEmoji(topThree[0]?.jarLevel)}</span>
            </div>
            <div className="bg-gradient-to-b from-gray-400 to-gray-500 rounded-t-xl pt-3 pb-4 px-2 h-24">
              <Medal className="text-white mx-auto mb-1" size={20} />
              <p className="text-white text-xs font-bold truncate">{topThree[0]?.displayName}</p>
              <p className="text-gray-200 text-xs">{(topThree[0]?.lifetimeSika || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="text-center flex-1 max-w-[110px] -mt-6">
            <div className="text-2xl mb-1">👑</div>
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-yellow-200 shadow-xl shadow-yellow-500/30">
              <span className="text-3xl">{getJarEmoji(topThree[1]?.jarLevel)}</span>
            </div>
            <div className="bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-t-xl pt-3 pb-4 px-2 h-28">
              <Crown className="text-white mx-auto mb-1" size={24} />
              <p className="text-white text-sm font-bold truncate">{topThree[1]?.displayName}</p>
              <p className="text-yellow-100 text-sm font-bold">{(topThree[1]?.lifetimeSika || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="text-center flex-1 max-w-[100px]">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-amber-500 shadow-lg">
              <span className="text-2xl">{getJarEmoji(topThree[2]?.jarLevel)}</span>
            </div>
            <div className="bg-gradient-to-b from-amber-600 to-amber-700 rounded-t-xl pt-3 pb-4 px-2 h-20">
              <Medal className="text-white mx-auto mb-1" size={18} />
              <p className="text-white text-xs font-bold truncate">{topThree[2]?.displayName}</p>
              <p className="text-amber-200 text-xs">{(topThree[2]?.lifetimeSika || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Rest of Leaderboard */}
      <div className="flex-1 bg-slate-800/50 rounded-t-3xl px-4 pt-4 overflow-y-auto">
        <p className="text-gray-400 text-sm mb-3">Top Savers</p>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 mt-3">Loading...</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {leaders.map((leader, index) => {
              const isYou = leader.userId === user?.id
              const rank = index + 1
              
              return (
                <div
                  key={leader.userId || index}
                  className={`flex items-center gap-3 p-3 rounded-2xl ${
                    isYou 
                      ? 'bg-orange-500/20 border border-orange-500/30' 
                      : 'bg-slate-700/50'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                    rank === 2 ? 'bg-gray-400 text-gray-800' :
                    rank === 3 ? 'bg-amber-600 text-amber-100' :
                    'bg-slate-600 text-slate-300'
                  }`}>
                    {rank}
                  </div>
                  
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-xl">
                    {getJarEmoji(leader.jarLevel)}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${isYou ? 'text-orange-400' : 'text-white'}`}>
                      {leader.displayName} {isYou && '(You)'}
                    </p>
                    <p className="text-gray-500 text-xs capitalize">{leader.jarLevel} Jar</p>
                  </div>
                  
                  {/* Score */}
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">{(leader.lifetimeSika || 0).toLocaleString()}</p>
                    <p className="text-gray-500 text-xs">Sika</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="bg-slate-800/80 px-4 py-3 border-t border-slate-700">
        <p className="text-gray-500 text-xs text-center">
          🏆 Top 100 savers monthly receive bonus vouchers!
        </p>
      </div>
    </div>
  )
}