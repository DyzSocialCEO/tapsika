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
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initDataUnsafe?.user
}

export function getTelegramUser() {
  if (isInTelegram()) {
    const user = window.Telegram.WebApp.initDataUnsafe.user
    return {
      id: user.id,
      username: user.username || '',
      first_name: user.first_name || 'User',
      last_name: user.last_name || '',
      language_code: user.language_code || 'en',
      is_premium: user.is_premium || false,
    }
  }
  
  // Dev mode fallback - FIXED ID so data persists
  return {
    id: 999999999,
    username: 'dev_user',
    first_name: 'Dev User',
    last_name: '',
    language_code: 'en',
    is_premium: false,
  }
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