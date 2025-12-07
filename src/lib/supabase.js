import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// USER MANAGEMENT
// ============================================

export async function getOrCreateUser(telegramId, username, displayName) {
  // Check if user exists
  let { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user:', error)
    throw error
  }

  // Create new user if doesn't exist
  if (!user) {
    const referralCode = 'TAP' + telegramId.toString().slice(-6)
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        telegram_username: username,
        display_name: displayName || username || 'Tapsika User',
        referral_code: referralCode
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating user:', createError)
      throw createError
    }

    user = newUser

    // Create initial balance record
    await supabase
      .from('balances')
      .insert({
        user_id: user.id,
        airtime_saved: 0,
        sika_balance: 0,
        lifetime_sika: 0,
        game_coins: 0,
        lifetime_game_coins: 0,
        jar_level: 'bronze'
      })

    // Create initial streak record
    await supabase
      .from('streaks')
      .insert({
        user_id: user.id,
        current_streak: 0,
        longest_streak: 0,
        saves_this_month: 0,
        amount_this_month: 0,
        month_year: new Date().toISOString().slice(0, 7)
      })
  }

  return user
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      balances (*),
      streaks (*)
    `)
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    throw error
  }

  return data
}

// ============================================
// BALANCE MANAGEMENT
// ============================================

export async function getUserBalance(userId) {
  const { data, error } = await supabase
    .from('balances')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching balance:', error)
    throw error
  }

  return data
}

// Add GAME COINS (from playing games)
export async function addGameCoins(userId, coins, description = 'Game coins earned') {
  // Get current balance
  const { data: balance, error: fetchError } = await supabase
    .from('balances')
    .select('game_coins, lifetime_game_coins')
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    console.error('Error fetching balance:', fetchError)
    throw fetchError
  }

  const newGameCoins = (balance.game_coins || 0) + coins
  const newLifetimeCoins = (balance.lifetime_game_coins || 0) + coins

  // Update balance
  const { data: updated, error: updateError } = await supabase
    .from('balances')
    .update({
      game_coins: newGameCoins,
      lifetime_game_coins: newLifetimeCoins,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating game coins:', updateError)
    throw updateError
  }

  // Record transaction
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'game_earn',
      game_coins_amount: coins,
      description: description
    })

  return updated
}

// Add SIKA (from referrals, bonuses)
export async function addSika(userId, sika, description = 'Sika earned') {
  // Get current balance
  const { data: balance, error: fetchError } = await supabase
    .from('balances')
    .select('sika_balance, lifetime_sika')
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    console.error('Error fetching balance:', fetchError)
    throw fetchError
  }

  const newSika = (balance.sika_balance || 0) + sika
  const newLifetimeSika = (balance.lifetime_sika || 0) + sika

  // Update balance
  const { data: updated, error: updateError } = await supabase
    .from('balances')
    .update({
      sika_balance: newSika,
      lifetime_sika: newLifetimeSika,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating sika:', updateError)
    throw updateError
  }

  // Record transaction
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'referral_bonus',
      sika_amount: sika,
      description: description
    })

  return updated
}

// Record AIRTIME SAVE (from USSD)
export async function recordSave(userId, amount) {
  const sika = Math.floor(amount * 100) // P1 = 100 Sika

  // Get current balance
  const { data: balance, error: fetchError } = await supabase
    .from('balances')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    console.error('Error fetching balance:', fetchError)
    throw fetchError
  }

  const newAirtimeSaved = parseFloat(balance.airtime_saved || 0) + amount
  const newSika = (balance.sika_balance || 0) + sika
  const newLifetimeSika = (balance.lifetime_sika || 0) + sika

  // Determine jar level
  let jarLevel = 'bronze'
  if (newAirtimeSaved >= 500) jarLevel = 'diamond'
  else if (newAirtimeSaved >= 200) jarLevel = 'gold'
  else if (newAirtimeSaved >= 50) jarLevel = 'silver'

  // Update balance
  const { data: updated, error: updateError } = await supabase
    .from('balances')
    .update({
      airtime_saved: newAirtimeSaved,
      sika_balance: newSika,
      lifetime_sika: newLifetimeSika,
      jar_level: jarLevel,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating balance:', updateError)
    throw updateError
  }

  // Record transaction
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'save',
      airtime_amount: amount,
      sika_amount: sika,
      description: `Saved P${amount.toFixed(2)} airtime`
    })

  // Update streak
  await updateStreak(userId, amount)

  return updated
}

// ============================================
// STREAK MANAGEMENT
// ============================================

export async function updateStreak(userId, amount = 0) {
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().toISOString().slice(0, 7)

  const { data: streak, error: fetchError } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching streak:', fetchError)
    throw fetchError
  }

  let newStreak = 1
  let longestStreak = streak?.longest_streak || 0
  let savesThisMonth = streak?.saves_this_month || 0
  let amountThisMonth = parseFloat(streak?.amount_this_month || 0)

  // Check if same month
  if (streak?.month_year === currentMonth) {
    savesThisMonth += 1
    amountThisMonth += amount
  } else {
    // New month, reset
    savesThisMonth = 1
    amountThisMonth = amount
  }

  // Check streak
  if (streak?.last_save_date) {
    const lastSave = new Date(streak.last_save_date)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate - lastSave) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      // Consecutive day
      newStreak = (streak.current_streak || 0) + 1
    } else if (diffDays === 0) {
      // Same day, keep streak
      newStreak = streak.current_streak || 1
    }
    // else: streak resets to 1
  }

  if (newStreak > longestStreak) {
    longestStreak = newStreak
  }

  const updateData = {
    current_streak: newStreak,
    longest_streak: longestStreak,
    last_save_date: today,
    saves_this_month: savesThisMonth,
    amount_this_month: amountThisMonth,
    month_year: currentMonth,
    updated_at: new Date().toISOString()
  }

  if (streak) {
    await supabase
      .from('streaks')
      .update(updateData)
      .eq('user_id', userId)
  } else {
    await supabase
      .from('streaks')
      .insert({ user_id: userId, ...updateData })
  }

  return { current_streak: newStreak, longest_streak: longestStreak }
}

export async function getStreak(userId) {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching streak:', error)
  }

  return data
}

// ============================================
// GAME PLAYS
// ============================================

export async function getPlaysToday(userId) {
  const today = new Date().toISOString().split('T')[0]

  const { count, error } = await supabase
    .from('game_plays')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('play_date', today)

  if (error) {
    console.error('Error fetching plays:', error)
    return 0
  }

  return count || 0
}

export async function recordGamePlay(userId, score, coinsEarned) {
  const today = new Date().toISOString().split('T')[0]
  
  // Get current plays
  const playsToday = await getPlaysToday(userId)
  console.log('Plays today before:', playsToday)

  if (playsToday >= 5) {
    throw new Error('Daily play limit reached')
  }

  // Record the play
  const { data: playData, error: playError } = await supabase
    .from('game_plays')
    .insert({
      user_id: userId,
      game_type: 'coin_catch',
      score: score,
      coins_earned: coinsEarned,
      play_date: today,
      play_number: playsToday + 1
    })
    .select()
    .single()

  if (playError) {
    console.error('Error recording play:', playError)
    throw new Error(`Failed to record play: ${playError.message}`)
  }
  
  console.log('Play recorded:', playData)

  // Add coins to balance
  const balance = await addGameCoins(userId, coinsEarned, `Coin Catch: scored ${score}`)
  console.log('Balance after adding coins:', balance)

  // Calculate remaining plays (we just used one, so subtract from 5)
  const newPlaysRemaining = 5 - (playsToday + 1)
  console.log('Plays remaining:', newPlaysRemaining)

  return {
    balance,
    playsRemaining: newPlaysRemaining
  }
}

// ============================================
// REFERRALS
// ============================================

export async function getReferralInfo(userId) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single()

  if (userError) {
    console.error('Error fetching user:', userError)
    throw userError
  }

  // Get referral counts by level
  const { data: referrals, error: refError } = await supabase
    .from('referrals')
    .select('level, sika_bonus')
    .eq('referrer_id', userId)

  if (refError) {
    console.error('Error fetching referrals:', refError)
  }

  const byLevel = { 1: 0, 2: 0, 3: 0 }
  let totalBonus = 0

  if (referrals) {
    referrals.forEach(ref => {
      byLevel[ref.level] = (byLevel[ref.level] || 0) + 1
      totalBonus += ref.sika_bonus || 0
    })
  }

  return {
    referralCode: user.referral_code,
    totalReferrals: referrals?.length || 0,
    byLevel,
    totalBonus
  }
}

export async function applyReferralCode(userId, code) {
  // Find referrer by code
  const { data: referrer, error: findError } = await supabase
    .from('users')
    .select('id, display_name, referred_by')
    .eq('referral_code', code.toUpperCase())
    .single()

  if (findError || !referrer) {
    throw new Error('Invalid referral code')
  }

  if (referrer.id === userId) {
    throw new Error('Cannot refer yourself')
  }

  // Check if already referred
  const { data: user } = await supabase
    .from('users')
    .select('referred_by')
    .eq('id', userId)
    .single()

  if (user?.referred_by) {
    throw new Error('Already used a referral code')
  }

  // Update user's referred_by
  await supabase
    .from('users')
    .update({ referred_by: referrer.id })
    .eq('id', userId)

  // Create level 1 referral (bonus paid when new user saves)
  await supabase
    .from('referrals')
    .insert({
      referrer_id: referrer.id,
      referred_id: userId,
      level: 1,
      original_referrer_id: referrer.id,
      sika_bonus: 0,
      bonus_paid: false
    })

  // Create level 2 referral if referrer was also referred
  if (referrer.referred_by) {
    await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.referred_by,
        referred_id: userId,
        level: 2,
        original_referrer_id: referrer.referred_by,
        sika_bonus: 0,
        bonus_paid: false
      })

    // Check for level 3
    const { data: level2Referrer } = await supabase
      .from('users')
      .select('referred_by')
      .eq('id', referrer.referred_by)
      .single()

    if (level2Referrer?.referred_by) {
      await supabase
        .from('referrals')
        .insert({
          referrer_id: level2Referrer.referred_by,
          referred_id: userId,
          level: 3,
          original_referrer_id: level2Referrer.referred_by,
          sika_bonus: 0,
          bonus_paid: false
        })
    }
  }

  return { referrerName: referrer.display_name }
}

export async function processReferralBonuses(userId) {
  // Get unpaid referrals where this user is the referred
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_id', userId)
    .eq('bonus_paid', false)

  if (error || !referrals?.length) return

  const bonuses = { 1: 200, 2: 50, 3: 10 }

  for (const ref of referrals) {
    const bonus = bonuses[ref.level] || 0
    
    // Pay the referrer
    await addSika(ref.referrer_id, bonus, `Level ${ref.level} referral bonus`)

    // Mark as paid
    await supabase
      .from('referrals')
      .update({
        sika_bonus: bonus,
        bonus_paid: true,
        bonus_paid_at: new Date().toISOString()
      })
      .eq('id', ref.id)
  }
}

// ============================================
// JAR SHAKE
// ============================================

export async function getJarShakeEligibility(userId) {
  const { data: balance } = await supabase
    .from('balances')
    .select('game_coins')
    .eq('user_id', userId)
    .single()

  const { data: streak } = await supabase
    .from('streaks')
    .select('amount_this_month')
    .eq('user_id', userId)
    .single()

  const gameCoins = balance?.game_coins || 0
  const savingsThisMonth = parseFloat(streak?.amount_this_month || 0)

  const eligible = gameCoins >= 2500 && savingsThisMonth >= 20

  return {
    eligible,
    gameCoins,
    savingsThisMonth,
    coinsNeeded: Math.max(0, 2500 - gameCoins),
    savingsNeeded: Math.max(0, 20 - savingsThisMonth)
  }
}

export async function enterJarShake(userId, eventId) {
  const eligibility = await getJarShakeEligibility(userId)
  
  if (!eligibility.eligible) {
    throw new Error('Not eligible for Jar Shake')
  }

  // Check if already entered
  const { data: existing } = await supabase
    .from('jar_shake_entries')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    throw new Error('Already entered this Jar Shake')
  }

  // Deduct coins
  const { data: balance } = await supabase
    .from('balances')
    .select('game_coins')
    .eq('user_id', userId)
    .single()

  await supabase
    .from('balances')
    .update({
      game_coins: balance.game_coins - 2500,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  // Record transaction
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'game_spend',
      game_coins_amount: -2500,
      description: 'Jar Shake entry'
    })

  // Calculate reward tier (simplified - in production, compare against all entries)
  const tiers = ['bronze', 'silver', 'gold', 'diamond', 'platinum']
  const rewards = { bronze: 2, silver: 5, gold: 15, diamond: 30, platinum: 100 }
  
  // Random tier weighted toward lower tiers
  const rand = Math.random()
  let tier = 'bronze'
  if (rand > 0.99) tier = 'platinum'
  else if (rand > 0.95) tier = 'diamond'
  else if (rand > 0.85) tier = 'gold'
  else if (rand > 0.60) tier = 'silver'

  const rewardAmount = rewards[tier]

  // Create entry
  const { data: entry, error } = await supabase
    .from('jar_shake_entries')
    .insert({
      event_id: eventId,
      user_id: userId,
      coins_spent: 2500,
      savings_this_month: eligibility.savingsThisMonth,
      reward_tier: tier,
      reward_amount: rewardAmount,
      reward_type: tier === 'bronze' || tier === 'silver' ? 'airtime' : 'voucher'
    })
    .select()
    .single()

  if (error) throw error

  return entry
}

// ============================================
// VOUCHERS & REDEMPTION
// ============================================

export async function getVoucherValue(userId) {
  const { data: balance } = await supabase
    .from('balances')
    .select('airtime_saved')
    .eq('user_id', userId)
    .single()

  const saved = parseFloat(balance?.airtime_saved || 0)
  const voucherValue = saved * 0.8 // 80% return

  return {
    airtimeSaved: saved,
    voucherValue: voucherValue,
    canRedeem: saved >= 20 // Minimum P20 to redeem
  }
}

export async function redeemVoucher(userId, partnerId) {
  const voucherInfo = await getVoucherValue(userId)
  
  if (!voucherInfo.canRedeem) {
    throw new Error('Minimum P20 savings required to redeem')
  }

  // Generate voucher code
  const voucherCode = 'TAP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()

  // Create redemption record
  const { data: redemption, error } = await supabase
    .from('redemptions')
    .insert({
      user_id: userId,
      voucher_id: partnerId,
      sika_spent: Math.floor(voucherInfo.airtimeSaved * 100),
      voucher_value: voucherInfo.voucherValue,
      voucher_code: voucherCode,
      status: 'issued',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    })
    .select()
    .single()

  if (error) throw error

  // Reset user's savings (they've redeemed)
  await supabase
    .from('balances')
    .update({
      airtime_saved: 0,
      sika_balance: 0,
      jar_level: 'bronze',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  // Record transaction
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'redeem',
      airtime_amount: -voucherInfo.airtimeSaved,
      sika_amount: -Math.floor(voucherInfo.airtimeSaved * 100),
      description: `Redeemed P${voucherInfo.voucherValue.toFixed(2)} voucher`
    })

  return {
    voucherCode,
    voucherValue: voucherInfo.voucherValue,
    expiresAt: redemption.expires_at
  }
}

// ============================================
// LEADERBOARD
// ============================================

export async function getLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from('balances')
    .select(`
      user_id,
      lifetime_sika,
      lifetime_game_coins,
      jar_level,
      users (display_name, telegram_username)
    `)
    .order('lifetime_sika', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching leaderboard:', error)
    throw error
  }

  return data.map((entry, index) => ({
    rank: index + 1,
    userId: entry.user_id,
    displayName: entry.users?.display_name || entry.users?.telegram_username || 'Anonymous',
    lifetimeSika: entry.lifetime_sika || 0,
    lifetimeCoins: entry.lifetime_game_coins || 0,
    jarLevel: entry.jar_level
  }))
}

export async function getUserRank(userId) {
  const { data: userBalance } = await supabase
    .from('balances')
    .select('lifetime_sika')
    .eq('user_id', userId)
    .single()

  if (!userBalance) return null

  const { count } = await supabase
    .from('balances')
    .select('*', { count: 'exact', head: true })
    .gt('lifetime_sika', userBalance.lifetime_sika || 0)

  return (count || 0) + 1
}

// ============================================
// TRANSACTIONS HISTORY
// ============================================

export async function getTransactions(userId, limit = 20) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching transactions:', error)
    throw error
  }

  return data
}