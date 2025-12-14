// Telegram Mini App SDK Helper

let tg = null

export function initTelegram() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    tg = window.Telegram.WebApp
    tg.ready()
    tg.expand()
    
    // Set header color to match app theme
    tg.setHeaderColor('#1e293b')
    tg.setBackgroundColor('#0f172a')
    
    return tg
  }
  return null
}

export function getTelegram() {
  return tg
}

export function isInTelegram() {
  // More robust check
  if (typeof window === 'undefined') return false
  
  const webApp = window.Telegram?.WebApp
  if (!webApp) return false
  
  // Check multiple indicators that we're in Telegram
  const hasUser = !!webApp.initDataUnsafe?.user
  const hasInitData = !!webApp.initData && webApp.initData.length > 0
  const hasPlatform = !!webApp.platform && webApp.platform !== 'unknown'
  
  return hasUser || hasInitData || hasPlatform
}

export function getTelegramUser() {
  // First, try to get real Telegram user
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp
    const user = webApp.initDataUnsafe?.user
    
    if (user && user.id) {
      console.log('✅ Telegram user detected:', user.id)
      return {
        id: user.id,
        username: user.username || '',
        first_name: user.first_name || 'User',
        last_name: user.last_name || '',
        language_code: user.language_code || 'en',
        is_premium: user.is_premium || false,
      }
    }
  }
  
  // Dev mode fallback - Use session-based unique ID
  // This ensures different browser tabs/sessions get different IDs
  let devId = sessionStorage.getItem('tapsika_dev_id')
  if (!devId) {
    // Generate a unique dev ID based on timestamp + random
    devId = 'dev_' + Date.now() + '_' + Math.floor(Math.random() * 10000)
    sessionStorage.setItem('tapsika_dev_id', devId)
  }
  
  // For database, we need a numeric ID
  // Use a hash of the devId string
  const numericId = Math.abs(hashCode(devId))
  
  console.log('⚠️ Dev mode - using ID:', numericId)
  
  return {
    id: numericId,
    username: 'dev_user',
    first_name: 'Dev User',
    last_name: '',
    language_code: 'en',
    is_premium: false,
    _isDev: true,
  }
}

// Simple hash function to convert string to number
function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

export function hapticFeedback(type = 'light') {
  if (!tg?.HapticFeedback) return
  
  switch (type) {
    case 'light':
      tg.HapticFeedback.impactOccurred('light')
      break
    case 'medium':
      tg.HapticFeedback.impactOccurred('medium')
      break
    case 'heavy':
      tg.HapticFeedback.impactOccurred('heavy')
      break
    case 'success':
      tg.HapticFeedback.notificationOccurred('success')
      break
    case 'warning':
      tg.HapticFeedback.notificationOccurred('warning')
      break
    case 'error':
      tg.HapticFeedback.notificationOccurred('error')
      break
    default:
      tg.HapticFeedback.impactOccurred('light')
  }
}

export function showAlert(message) {
  if (tg?.showAlert) {
    tg.showAlert(message)
  } else {
    alert(message)
  }
}

export function showConfirm(message, callback) {
  if (tg?.showConfirm) {
    tg.showConfirm(message, callback)
  } else {
    const result = confirm(message)
    callback(result)
  }
}

export function closeMiniApp() {
  if (tg?.close) {
    tg.close()
  }
}

export function openLink(url) {
  if (tg?.openLink) {
    tg.openLink(url)
  } else {
    window.open(url, '_blank')
  }
}

export function openTelegramLink(url) {
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url)
  } else {
    window.open(url, '_blank')
  }
}

// Share to Telegram
export function shareToTelegram(text) {
  const url = `https://t.me/share/url?url=${encodeURIComponent(text)}`
  openTelegramLink(url)
}

// Main button helpers
export function showMainButton(text, callback) {
  if (!tg?.MainButton) return
  
  tg.MainButton.text = text
  tg.MainButton.onClick(callback)
  tg.MainButton.show()
}

export function hideMainButton() {
  if (!tg?.MainButton) return
  tg.MainButton.hide()
}

export function setMainButtonLoading(loading) {
  if (!tg?.MainButton) return
  
  if (loading) {
    tg.MainButton.showProgress()
  } else {
    tg.MainButton.hideProgress()
  }
}