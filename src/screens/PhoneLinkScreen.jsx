import { useState } from 'react'

export default function PhoneLinkScreen({ onVerified, onBack }) {
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendOTP = async () => {
    if (phone.length < 7) {
      setError('Enter a valid phone number')
      return
    }
    setError('')
    setLoading(true)
    
    // Simulate OTP send (replace with real SMS API later)
    setTimeout(() => {
      setLoading(false)
      setStep(2)
    }, 1500)
  }

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    
    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleVerify = async () => {
    const otpCode = otp.join('')
    if (otpCode.length < 4) {
      setError('Enter the 4-digit code')
      return
    }
    setError('')
    setLoading(true)

    // Simulate verification (replace with real verification later)
    setTimeout(() => {
      setLoading(false)
      onVerified(phone)
    }, 1500)
  }

  return (
    <div className="h-full bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white"
        >
          ←
        </button>
        <h2 className="text-white font-bold text-lg">Link Your Number</h2>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-3xl mx-auto flex items-center justify-center mb-4">
            <span className="text-4xl">{step === 1 ? '📱' : '🔐'}</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            {step === 1 ? 'Enter Phone Number' : 'Enter Verification Code'}
          </h3>
          <p className="text-gray-400 mt-2">
            {step === 1 
              ? 'Use the same number you save airtime with' 
              : `Code sent to +267 ${phone}`
            }
          </p>
        </div>

        {step === 1 && (
          <>
            {/* Phone Input */}
            <div className="bg-slate-800 rounded-2xl p-4 mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Phone Number</label>
              <div className="flex gap-3">
                <div className="bg-slate-700 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="text-xl">🇧🇼</span>
                  <span className="text-white font-medium">+267</span>
                </div>
                <input
                  type="tel"
                  placeholder="71 234 567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-slate-700 rounded-xl px-4 py-3 text-white text-lg placeholder-gray-500 outline-none focus:ring-2 focus:ring-orange-400"
                  maxLength={8}
                />
              </div>
            </div>

            {/* Info */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
              <p className="text-orange-200 text-sm">
                📱 This should match the number you use to save airtime via USSD
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* OTP Input */}
            <div className="flex gap-3 justify-center mb-6">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index]}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="w-14 h-16 bg-slate-700 rounded-xl text-center text-white text-2xl font-bold outline-none focus:ring-2 focus:ring-orange-400"
                />
              ))}
            </div>

            {/* Resend */}
            <p className="text-center text-gray-500 text-sm">
              Didn't receive it? <button className="text-orange-400 font-medium">Resend Code</button>
            </p>
          </>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}
      </div>

      {/* Button */}
      <div className="p-6">
        <button
          onClick={step === 1 ? handleSendOTP : handleVerify}
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {step === 1 ? 'Sending...' : 'Verifying...'}
            </span>
          ) : (
            step === 1 ? 'Send Verification Code' : 'Verify & Continue'
          )}
        </button>
      </div>
    </div>
  )
}