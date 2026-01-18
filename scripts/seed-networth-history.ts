import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NetWorthData {
  totalAccountBalance: number;
  totalInvestmentValue: number;
  totalInvestmentCost: number;
  totalInvestmentGain: number;
  totalInvestmentGainPercentage: number;
  totalMoneyLent: number;
  totalAssets: number;
  netWorth: number;
  currency: string;
  snapshotDate: Date;
  recordType: 'AUTOMATIC' | 'MANUAL';
  userId: number;
}

// Generate realistic net worth progression data
function generateNetworthData(userId: number): NetWorthData[] {
  const records: NetWorthData[] = [];
  
  // Starting values (January 2025)
  let baseAccountBalance = 250000; // 2.5 lakh
  let baseInvestmentValue = 2000000; // 20 lakh
  let baseInvestmentCost = 1800000; // 18 lakh (showing some gains)
  let baseMoneyLent = 500000; // 5 lakh
  
  // Growth rates per month (some volatility)
  const monthlyGrowthRates = [
    0.02,   // Jan: 2% growth
    -0.01,  // Feb: -1% (market correction)
    0.03,   // Mar: 3% growth
    0.015,  // Apr: 1.5% growth
    -0.005, // May: -0.5% (slight dip)
    0.025,  // Jun: 2.5% growth
    0.01,   // Jul: 1% growth
    0.02,   // Aug: 2% growth
    -0.015, // Sep: -1.5% (market volatility)
    0.035,  // Oct: 3.5% growth (good quarter)
    0.01,   // Nov: 1% growth
    0.02    // Dec: 2% growth (year-end rally)
  ];
  
  for (let month = 0; month < 12; month++) {
    const monthlyGrowth = monthlyGrowthRates[month];
    
    // Apply monthly growth to base values
    baseAccountBalance *= (1 + monthlyGrowth * 0.3); // Accounts grow slower
    baseInvestmentValue *= (1 + monthlyGrowth); // Investments follow market
    baseInvestmentCost *= (1 + monthlyGrowth * 0.1); // Cost base grows with new investments
    baseMoneyLent *= (1 + monthlyGrowth * 0.05); // Money lent grows slowly
    
    // Generate 5 records per month
    for (let record = 0; record < 5; record++) {
      const dayOfMonth = Math.floor((record + 1) * (30 / 5)); // Spread across month
      const recordDate = new Date(2025, month, dayOfMonth);
      
      // Add some daily variation (±2%)
      const dailyVariation = (Math.random() - 0.5) * 0.04;
      
      const accountBalance = Math.round(baseAccountBalance * (1 + dailyVariation));
      const investmentValue = Math.round(baseInvestmentValue * (1 + dailyVariation));
      const investmentCost = Math.round(baseInvestmentCost);
      const moneyLent = Math.round(baseMoneyLent * (1 + dailyVariation * 0.5));
      
      const investmentGain = investmentValue - investmentCost;
      const investmentGainPercentage = investmentCost > 0 ? (investmentGain / investmentCost) * 100 : 0;
      const totalAssets = accountBalance + investmentValue + moneyLent;
      
      records.push({
        totalAccountBalance: accountBalance,
        totalInvestmentValue: investmentValue,
        totalInvestmentCost: investmentCost,
        totalInvestmentGain: investmentGain,
        totalInvestmentGainPercentage: investmentGainPercentage,
        totalMoneyLent: moneyLent,
        totalAssets: totalAssets,
        netWorth: totalAssets, // Assuming no liabilities
        currency: 'INR',
        snapshotDate: recordDate,
        recordType: record === 0 ? 'MANUAL' : 'AUTOMATIC', // First of month is manual
        userId: userId
      });
    }
  }
  
  return records;
}

async function seedNetworthHistory() {
  try {
    console.log('🌱 Starting net worth history seeding...');
    
    // Get the first user from the database
    const firstUser = await prisma.user.findFirst();
    
    if (!firstUser) {
      console.error('❌ No users found in database. Please create a user first.');
      return;
    }
    
    console.log(`📊 Generating data for user: ${firstUser.email || firstUser.number}`);
    
    // Check if net worth history already exists for this user
    const existingRecords = await prisma.networthHistory.count({
      where: { userId: firstUser.id }
    });
    
    if (existingRecords > 0) {
      console.log(`⚠️  Found ${existingRecords} existing records. Clearing them first...`);
      await prisma.networthHistory.deleteMany({
        where: { userId: firstUser.id }
      });
    }
    
    // Generate the data
    const networthData = generateNetworthData(firstUser.id);
    
    console.log(`📈 Generated ${networthData.length} net worth records`);
    console.log(`📅 Date range: ${networthData[0].snapshotDate.toDateString()} to ${networthData[networthData.length - 1].snapshotDate.toDateString()}`);
    console.log(`💰 Net worth range: $${networthData[0].netWorth.toLocaleString()} to $${networthData[networthData.length - 1].netWorth.toLocaleString()}`);
    
    // Insert all records
    console.log('💾 Inserting records into database...');
    
    const result = await prisma.networthHistory.createMany({
      data: networthData,
      skipDuplicates: true
    });
    
    console.log(`✅ Successfully inserted ${result.count} net worth history records!`);
    
    // Show some statistics
    const totalGrowth = networthData[networthData.length - 1].netWorth - networthData[0].netWorth;
    const growthPercentage = (totalGrowth / networthData[0].netWorth) * 100;
    
    console.log(`📊 Statistics:`);
    console.log(`   • Total Growth: $${totalGrowth.toLocaleString()}`);
    console.log(`   • Growth Percentage: ${growthPercentage.toFixed(2)}%`);
    console.log(`   • Average Monthly Growth: ${(growthPercentage / 12).toFixed(2)}%`);
    
  } catch (error) {
    console.error('❌ Error seeding net worth history:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedNetworthHistory()
    .then(() => {
      console.log('🎉 Net worth history seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedNetworthHistory, generateNetworthData };