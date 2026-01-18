# Net Worth History Seeding Script

This script generates realistic net worth history data for testing and demonstration purposes.

## What it does

- **Generates 60 records** for the year 2025 (5 records per month)
- **Creates realistic financial progression** with market-like volatility
- **Uses the first user** found in your database
- **Includes various asset types**: Bank accounts, investments, money lent
- **Shows realistic growth patterns** with some monthly ups and downs

## Generated Data Structure

Each record includes:
- `totalAccountBalance`: Bank account balances
- `totalInvestmentValue`: Current investment values
- `totalInvestmentCost`: Original investment costs
- `totalInvestmentGain`: Profit/loss from investments
- `totalMoneyLent`: Money lent to others
- `totalAssets`: Sum of all assets
- `netWorth`: Total net worth
- `snapshotDate`: Date of the record
- `recordType`: MANUAL (first of month) or AUTOMATIC

## How to run

### Option 1: Using npm script (Recommended)
```bash
npm run seed:networth
```

### Option 2: Direct execution
```bash
node scripts/seed-networth-history.js
```

### Option 3: From packages/db directory
```bash
cd packages/db
node ../../scripts/seed-networth-history.js
```

## Sample Output

```
🌱 Starting net worth history seeding...
📊 Generating data for user: user@example.com (ID: 1)
📈 Generated 60 net worth records
📅 Date range: Wed Jan 01 2025 to Fri Dec 26 2025
💰 Net worth range: $2,750,000 to $3,200,000
💾 Inserting records into database...
✅ Successfully inserted 60 net worth history records!

📊 Statistics:
   • Starting Net Worth: $2,750,000
   • Ending Net Worth: $3,200,000
   • Total Growth: $450,000
   • Growth Percentage: 16.36%
   • Average Monthly Growth: 1.36%
```

## Prerequisites

- Database must be set up and migrated
- At least one user must exist in the database
- Prisma client must be generated

## Notes

- The script will **clear existing 2025 records** for the user before inserting new ones
- Growth rates are realistic with some market volatility
- Records are spread evenly throughout each month
- First record of each month is marked as MANUAL, others as AUTOMATIC
- All amounts are in USD by default

## Customization

You can modify the script to:
- Change the starting amounts
- Adjust growth rates per month
- Change the number of records per month
- Use different currencies
- Target specific users