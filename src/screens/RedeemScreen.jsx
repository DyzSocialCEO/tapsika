import { useState } from 'react'
import { ArrowLeft, ShoppingBag, Fuel, Phone, Check, X, AlertCircle } from 'lucide-react'
import { redeemVoucher } from '../lib/supabase'

export default function RedeemScreen({ user, refreshUser, onNavigate }) {
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const airtimeSaved = user?.airtimeSaved || 0
  const voucherValue = airtimeSaved * 0.8
  const canRedeem = airtimeSaved >= 20

  const partners = [
    { id: 'shoprite', name: 'Shoprite', icon: '🛒', color: 'from-red-500 to-red-600', desc: 'Groceries & more' },
    { id: 'choppies', name: 'Choppies', icon: '🏪', color: 'from-green-500 to-green-600', desc: 'Everyday essentials' },
    { id: 'shell', name: 'Shell', icon: '⛽', color: 'from-yellow-500 to-yellow-600', desc: 'Fuel & convenience' },
    { id: 'airtime', name: 'Airtime', icon: '📱', color: 'from-blue-500 to-blue-600', desc: 'Mobile top-up' },
  ]

  const handleSelectPartner = (partner) => {
    if (!canRedeem) return
    setSelectedPartner(partner)
    setConfirming(true)
  }

  const handleConfirmRedeem = async () => {
    if (!selectedPartner || !user?.id) return
    
    setRedeeming(true)
    setError(null)
    
    try {
      const res = await redeemVoucher(user.id, selectedPartner.id)
      setResult(res)
      await refreshUser()
    } catch (err) {
      setError(err.message || 'Redemption failed')
    }
    
    setRedeeming(false)
  }

  const handleClose = () => {
    setConfirming(false)
    setSelectedPartner(null)
    setResult(null)
    setError(null)
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
          <h2 className="text-white font-bold text-lg">Redeem Rewards</h2>
        </div>
      </div>

      {/* Points Balance Card */}
      <div className="mx-4 mb-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl p-5 shadow-lg shadow-orange-500/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-orange-100 text-sm">Airtime Saved</p>
            <p className="text-white text-3xl font-black">P{airtimeSaved.toFixed(2)}</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">🎁</span>
          </div>
        </div>
        
        <div className="bg-black/20 rounded-xl p-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-orange-100 text-sm">Voucher Value (80%)</p>
              <p className="text-white text-2xl font-bold">P{voucherValue.toFixed(2)}</p>
            </div>
            {canRedeem ? (
              <div className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                ✓ Ready!
              </div>
            ) : (
              <div className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                Min P20
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Minimum Notice */}
      {!canRedeem && (
        <div className="mx-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-white font-medium">Save more to redeem</p>
            <p className="text-slate-400 text-sm mt-1">
              Need P20 minimum. You're P{(20 - airtimeSaved).toFixed(2)} away!
            </p>
          </div>
        </div>
      )}

      {/* Partner Selection */}
      <div className="px-4 flex-1">
        <p className="text-gray-400 text-sm mb-3">Choose your reward</p>
        <div className="grid grid-cols-2 gap-3">
          {partners.map(partner => (
            <button
              key={partner.id}
              onClick={() => handleSelectPartner(partner)}
              disabled={!canRedeem}
              className={`bg-slate-800 rounded-2xl p-4 border border-slate-700 text-left transition-all ${
                canRedeem ? 'hover:border-orange-500 active:scale-95' : 'opacity-50'
              }`}
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${partner.color} rounded-2xl flex items-center justify-center mb-3 shadow-lg`}>
                <span className="text-3xl">{partner.icon}</span>
              </div>
              <p className="text-white font-bold">{partner.name}</p>
              <p className="text-gray-500 text-xs">{partner.desc}</p>
              <div className="mt-2">
                <p className="text-green-400 font-bold">P{voucherValue.toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="px-4 py-4 mt-auto">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <p className="text-white font-semibold text-sm mb-2">💡 How it works</p>
          <ul className="text-slate-400 text-xs space-y-1">
            <li>• Save airtime → Get 80% back as voucher</li>
            <li>• Vouchers valid for 30 days</li>
            <li>• Use at any partner store</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirming && selectedPartner && !result && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white text-lg font-bold">Confirm Redemption</h2>
              <button onClick={handleClose} className="text-slate-400">
                <X size={24} />
              </button>
            </div>
            
            <div className={`w-20 h-20 bg-gradient-to-br ${selectedPartner.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <span className="text-4xl">{selectedPartner.icon}</span>
            </div>
            
            <div className="text-center mb-6">
              <p className="text-white text-xl font-bold">{selectedPartner.name} Voucher</p>
              <p className="text-green-400 text-3xl font-black mt-2">P{voucherValue.toFixed(2)}</p>
            </div>
            
            <div className="bg-slate-700 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Your savings</span>
                <span className="text-white">P{airtimeSaved.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Voucher rate</span>
                <span className="text-white">80%</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-600">
                <span className="text-slate-400">You receive</span>
                <span className="text-green-400 font-bold">P{voucherValue.toFixed(2)}</span>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm text-center">
                {error}
              </div>
            )}
            
            <button
              onClick={handleConfirmRedeem}
              disabled={redeeming}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
            >
              {redeeming ? 'Processing...' : 'Confirm Redemption'}
            </button>
            
            <p className="text-slate-500 text-xs text-center mt-4">
              Your savings will reset after redemption
            </p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {result && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl w-full max-w-sm p-6 text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
              <Check className="text-white" size={40} />
            </div>
            
            <h2 className="text-white text-2xl font-bold mb-2">Success! 🎉</h2>
            <p className="text-slate-400 mb-6">Your voucher is ready</p>
            
            <div className="bg-slate-700 rounded-xl p-4 mb-4">
              <p className="text-slate-400 text-sm mb-1">Voucher Code</p>
              <p className="text-white text-2xl font-mono font-bold tracking-widest">
                {result.voucherCode}
              </p>
            </div>
            
            <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Value</span>
                <span className="text-green-400 font-bold">P{result.voucherValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Expires</span>
                <span className="text-white">{new Date(result.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform"
            >
              Done
            </button>
            
            <p className="text-slate-500 text-xs mt-4">Show this code at checkout</p>
          </div>
        </div>
      )}
    </div>
  )
}