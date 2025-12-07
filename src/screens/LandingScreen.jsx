export default function LandingScreen({ onLinkPhone }) {
    return (
      <div className="h-full bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
        {/* Header */}
        <div className="pt-12 pb-6 text-center">
          <div className="text-6xl mb-4">🏺</div>
          <h1 className="text-3xl font-black text-white">TAPSIKA</h1>
          <p className="text-orange-400 font-medium mt-1">Save. Play. Win.</p>
        </div>
  
        {/* Features */}
        <div className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {/* Feature 1 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl">
                💰
              </div>
              <div>
                <h3 className="text-white font-bold">Save Airtime</h3>
                <p className="text-gray-400 text-sm">Dial *123# to save airtime & earn points</p>
              </div>
            </div>
  
            {/* Feature 2 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-2xl">
                🎮
              </div>
              <div>
                <h3 className="text-white font-bold">Play Games</h3>
                <p className="text-gray-400 text-sm">Fun mini-games to earn bonus points</p>
              </div>
            </div>
  
            {/* Feature 3 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-xl flex items-center justify-center text-2xl">
                🎁
              </div>
              <div>
                <h3 className="text-white font-bold">Win Vouchers</h3>
                <p className="text-gray-400 text-sm">Redeem points for Shoprite, Choppies & more</p>
              </div>
            </div>
          </div>
  
          {/* How it works */}
          <div className="mt-6 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
            <h4 className="text-orange-400 font-bold mb-2">How it works:</h4>
            <ol className="text-gray-300 text-sm space-y-1">
              <li>1. Link your phone number below</li>
              <li>2. Save airtime via USSD (*123#)</li>
              <li>3. Earn 100 points per P1 saved</li>
              <li>4. Play games for bonus points</li>
              <li>5. Redeem at 2000 points!</li>
            </ol>
          </div>
        </div>
  
        {/* CTA Button */}
        <div className="p-6">
          <button
            onClick={onLinkPhone}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform"
          >
            Link Phone Number →
          </button>
          <p className="text-center text-gray-500 text-xs mt-3">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    )
  }