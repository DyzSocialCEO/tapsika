import { useState, useEffect } from 'react'
import { ArrowLeft, Copy, Check, Gift, Share2 } from 'lucide-react'
import { getReferralInfo, applyReferralCode } from '../lib/supabase'

export default function ReferralScreen({ user, refreshUser, onNavigate }) {
  const [referralInfo, setReferralInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showApplyCode, setShowApplyCode] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState(null)
  const [applySuccess, setApplySuccess] = useState(null)

  useEffect(() => {
    loadReferralInfo()
  }, [user?.id])

  const loadReferralInfo = async () => {
    if (!user?.id) return
    
    try {
      const info = await getReferralInfo(user.id)
      setReferralInfo(info)
    } catch (err) {
      console.error('Failed to load referral info:', err)
    }
    setLoading(false)
  }

  const referralCode = referralInfo?.referralCode || user?.referralCode || 'LOADING'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = referralCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    const shareText = `Join me on Tapsika! Save spare airtime & get real shopping vouchers 🛒\n\nUse my code: ${referralCode}\n\nDownload: t.me/TapsikaBot`
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Tapsika', text: shareText })
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleApplyCode = async () => {
    if (!codeInput.trim() || !user?.id) return
    
    setApplying(true)
    setApplyError(null)
    setApplySuccess(null)
    
    try {
      const result = await applyReferralCode(user.id, codeInput.trim())
      setApplySuccess(`Connected to ${result.referrerName}! You'll both earn bonuses.`)
      setCodeInput('')
      await refreshUser()
    } catch (err) {
      setApplyError(err.message || 'Invalid code')
    }
    
    setApplying(false)
  }

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
          <span className="text-xl">👥</span>
          <h2 className="text-white font-bold text-lg">Invite Friends</h2>
        </div>
      </div>

      {/* Hero */}
      <div className="text-center px-6 py-6">
        <div className="text-6xl mb-3">🎁</div>
        <h3 className="text-2xl font-black text-white mb-2">Earn 200 Sika!</h3>
        <p className="text-gray-400">For every friend who saves their first airtime</p>
      </div>

      {/* Referral Code Card */}
      <div className="mx-4 mb-4 bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <p className="text-gray-400 text-sm mb-3 text-center">Your Referral Code</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-900 rounded-xl p-4">
            <p className="text-2xl font-mono font-bold text-orange-400 text-center tracking-wider">
              {referralCode}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
              copied ? 'bg-green-500' : 'bg-orange-500'
            }`}
          >
            {copied ? <Check className="text-white" size={24} /> : <Copy className="text-white" size={24} />}
          </button>
        </div>
        
        <button
          onClick={handleShare}
          className="w-full mt-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Share2 size={20} />
          Share Invite Link
        </button>
      </div>

      {/* Bonus Structure */}
      <div className="px-4 mb-4">
        <p className="text-gray-400 text-sm mb-3">How you earn</p>
        <div className="space-y-2">
          {[
            { level: 'L1', label: 'Your direct invite', bonus: 200, color: 'from-green-500 to-green-600', desc: 'When they save first time' },
            { level: 'L2', label: 'Their invite saves', bonus: 50, color: 'from-blue-500 to-blue-600', desc: 'Friend of your friend' },
            { level: 'L3', label: '3rd level saves', bonus: 10, color: 'from-purple-500 to-purple-600', desc: '3 levels deep' },
          ].map(item => (
            <div key={item.level} className="bg-slate-800 rounded-xl p-3 flex items-center gap-3 border border-slate-700">
              <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center shrink-0`}>
                <span className="text-white font-bold text-sm">{item.level}</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
              <p className="text-green-400 font-bold">+{item.bonus}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {!loading && referralInfo && (
        <div className="mx-4 mb-4 bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <p className="text-gray-400 text-sm mb-3">Your Stats</p>
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-3xl font-black text-white">{referralInfo.totalReferrals}</p>
              <p className="text-gray-500 text-xs">Referrals</p>
            </div>
            <div className="w-px bg-slate-700"></div>
            <div className="text-center">
              <p className="text-3xl font-black text-yellow-400">{referralInfo.totalBonus}</p>
              <p className="text-gray-500 text-xs">Sika Earned</p>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-700 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-white font-bold">{referralInfo.byLevel[1] || 0}</p>
              <p className="text-gray-500 text-xs">Level 1</p>
            </div>
            <div>
              <p className="text-white font-bold">{referralInfo.byLevel[2] || 0}</p>
              <p className="text-gray-500 text-xs">Level 2</p>
            </div>
            <div>
              <p className="text-white font-bold">{referralInfo.byLevel[3] || 0}</p>
              <p className="text-gray-500 text-xs">Level 3</p>
            </div>
          </div>
        </div>
      )}

      {/* Apply Code Section */}
      <div className="px-4 mt-auto mb-4">
        {!showApplyCode ? (
          <button
            onClick={() => setShowApplyCode(true)}
            className="w-full bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Gift className="text-purple-400" size={24} />
              <span className="text-white">Have a referral code?</span>
            </div>
            <span className="text-gray-500">→</span>
          </button>
        ) : (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-white font-medium mb-3">Enter Referral Code</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="TAP123456"
                className="flex-1 bg-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-mono uppercase"
                maxLength={10}
              />
              <button
                onClick={handleApplyCode}
                disabled={applying || !codeInput.trim()}
                className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50"
              >
                {applying ? '...' : 'Apply'}
              </button>
            </div>
            
            {applyError && (
              <p className="text-red-400 text-sm mt-2">{applyError}</p>
            )}
            {applySuccess && (
              <p className="text-green-400 text-sm mt-2">{applySuccess}</p>
            )}
            
            <button
              onClick={() => {
                setShowApplyCode(false)
                setCodeInput('')
                setApplyError(null)
                setApplySuccess(null)
              }}
              className="text-slate-500 text-sm mt-3"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Pro Tip */}
      <div className="px-4 pb-4">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <p className="text-purple-300 text-sm">
            💡 <span className="font-medium">Pro tip:</span> Your friends earn too when they use your code!
          </p>
        </div>
      </div>
    </div>
  )
}