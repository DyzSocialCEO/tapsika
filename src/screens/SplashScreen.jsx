import { useState, useEffect } from 'react'

export default function SplashScreen({ error }) {
  const [pulse, setPulse] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 via-orange-400 to-yellow-400 flex flex-col items-center justify-center">
      {/* Logo */}
      <div className={`transition-transform duration-1000 ${pulse ? 'scale-100' : 'scale-105'}`}>
        <div className="w-36 h-36 relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-yellow-300/50 blur-2xl rounded-full scale-150"></div>
          
          {/* Jar Shape */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-32 bg-gradient-to-b from-amber-200/90 to-amber-100/70 rounded-b-[2rem] rounded-t-lg border-4 border-amber-300 relative overflow-hidden shadow-2xl">
              {/* Coins inside */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-yellow-400 via-yellow-300 to-transparent">
                <div className="absolute bottom-2 left-2 w-5 h-5 bg-yellow-500 rounded-full border-2 border-yellow-600 shadow-inner"></div>
                <div className="absolute bottom-5 right-3 w-5 h-5 bg-yellow-500 rounded-full border-2 border-yellow-600 shadow-inner"></div>
                <div className="absolute bottom-3 left-1/2 w-5 h-5 bg-yellow-500 rounded-full border-2 border-yellow-600 shadow-inner"></div>
                <div className="absolute bottom-8 left-4 w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-500 shadow-inner"></div>
                <div className="absolute bottom-6 right-5 w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-500 shadow-inner"></div>
              </div>
              
              {/* Glass reflection */}
              <div className="absolute top-0 left-2 w-3 h-full bg-gradient-to-b from-white/40 to-transparent rounded-full"></div>
              
              {/* Jar lid */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-gradient-to-b from-amber-500 to-amber-700 rounded-full shadow-lg"></div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-3 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>
            </div>
          </div>
          
          {/* Sparkles */}
          <div className="absolute top-0 right-0 text-3xl animate-pulse">✨</div>
          <div className="absolute bottom-6 -left-2 text-2xl animate-pulse" style={{ animationDelay: '0.3s' }}>⭐</div>
          <div className="absolute top-10 -right-3 text-xl animate-pulse" style={{ animationDelay: '0.6s' }}>💫</div>
        </div>
      </div>

      {/* Brand Name */}
      <h1 
        className="text-5xl font-black text-white mt-8 tracking-tight"
        style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.2)' }}
      >
        TAPSIKA
      </h1>
      <p className="text-white/90 text-lg mt-2 font-medium">
        Spare airtime. Real groceries.
      </p>

      {/* Loading dots or error */}
      {error ? (
        <div className="mt-8 bg-red-500/20 border border-red-300/30 rounded-xl px-6 py-3">
          <p className="text-white font-medium">{error}</p>
        </div>
      ) : (
        <div className="flex gap-2 mt-10">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      )}

      {/* Tagline */}
      <p className="absolute bottom-8 text-white/60 text-sm">
        Save. Play. Earn.
      </p>
    </div>
  )
}