/**
 * Add shop URLs and coupon prefixes to brand rewards for real-world checkout links.
 * Run: node scripts/enhanceBrandRewards.js
 */
require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')

const BRAND_LINKS = {
  Swiggy: { shopUrl: 'https://www.swiggy.com', couponPrefix: 'SWIG', howToUse: 'Apply code at checkout on Swiggy app or web.' },
  Zomato: { shopUrl: 'https://www.zomato.com', couponPrefix: 'ZOMO', howToUse: 'Enter code in Offers section before payment.' },
  "Domino's": { shopUrl: 'https://www.dominos.co.in', couponPrefix: 'DOMI', howToUse: 'Use code on Domino\'s website or app.' },
  Starbucks: { shopUrl: 'https://www.starbucks.in', couponPrefix: 'STAR', howToUse: 'Show code at participating Starbucks stores.' },
  Amazon: { shopUrl: 'https://www.amazon.in', couponPrefix: 'AMZN', howToUse: 'Apply at Amazon checkout under gift cards & promotional codes.' },
  Flipkart: { shopUrl: 'https://www.flipkart.com', couponPrefix: 'FLIP', howToUse: 'Paste code in Flipkart offers section at checkout.' },
  Myntra: { shopUrl: 'https://www.myntra.com', couponPrefix: 'MYNTR', howToUse: 'Apply in cart on Myntra app or website.' },
  Nike: { shopUrl: 'https://www.nike.com/in', couponPrefix: 'NIKE', howToUse: 'Use during checkout on Nike.com.' },
  Apple: { shopUrl: 'https://www.apple.com/in/shop', couponPrefix: 'APPL', howToUse: 'Valid on select accessories at Apple Store online.' },
  Samsung: { shopUrl: 'https://www.samsung.com/in', couponPrefix: 'SAMS', howToUse: 'Apply on Samsung.com India checkout.' },
  MakeMyTrip: { shopUrl: 'https://www.makemytrip.com', couponPrefix: 'MMT', howToUse: 'Enter code on MakeMyTrip flights/hotels checkout.' },
  Netflix: { shopUrl: 'https://www.netflix.com', couponPrefix: 'NFLX', howToUse: 'Redeem on Netflix account gift/promo page.' },
}

const RewardSchema = new mongoose.Schema({}, { strict: false })
const Reward = mongoose.models.Reward || mongoose.model('Reward', RewardSchema)

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  let updated = 0
  for (const [brand, data] of Object.entries(BRAND_LINKS)) {
    const res = await Reward.updateMany({ brand }, { $set: data })
    updated += res.modifiedCount
    console.log(`Updated ${brand}:`, res.modifiedCount)
  }
  console.log(`\nDone. ${updated} rewards enhanced with shop links.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
