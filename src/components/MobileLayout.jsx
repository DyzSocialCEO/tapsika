export default function MobileLayout({ children }) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-2 sm:p-4">
        {/* Mobile Container - Locked to phone size */}
        <div className="w-full max-w-[430px] h-[100dvh] sm:h-[90vh] sm:max-h-[932px] bg-gradient-to-b from-slate-900 to-slate-800 sm:rounded-3xl overflow-hidden relative flex flex-col">
          {children}
        </div>
      </div>
    )
  }