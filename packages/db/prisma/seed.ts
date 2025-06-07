import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create a test user
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {
            currency: 'USD', // Set default currency
        },
        create: {
            email: 'test@example.com',
            name: 'Test User',
            number: '+1234567890',
            password: 'hashedpassword', // In real app, this should be properly hashed
            currency: 'USD', // Set default currency
        },
    });

    console.log('Created user:', user);

    // Create a test account
    const account = await prisma.account.upsert({
        where: { accountNumber: '1234567890' },
        update: {},
        create: {
            holderName: 'Test User',
            accountNumber: '1234567890',
            branchCode: 'BR001',
            bankName: 'Test Bank',
            branchName: 'Main Branch',
            bankAddress: '123 Main St, City',
            accountType: 'Savings',
            mobileNumbers: ['+1234567890'],
            branchContacts: ['+1987654321'],
            swift: 'TESTBK12',
            bankEmail: 'branch@testbank.com',
            accountOpeningDate: new Date('2020-01-01'),
            securityQuestion: ['What is your first pet name?'],
            balance: 10000.00,
            userId: user.id,
        },
    });

    console.log('Created account:', account);

    // Your specific expense categories
    const expenseCategories = [
        { name: 'Debt Loans', color: '#ef4444' },
        { name: 'Flat Rent and Maintenances', color: '#f97316' },
        { name: 'Food (Restaurants, Orders)', color: '#f59e0b' },
        { name: 'BOSCH', color: '#eab308' },
        { name: 'GOA', color: '#84cc16' },
        { name: 'Transportation', color: '#22c55e' },
        { name: 'Shopping', color: '#10b981' },
        { name: 'Healthcare', color: '#14b8a6' },
        { name: 'Entertainment', color: '#06b6d4' },
        { name: 'Utilities', color: '#0ea5e9' },
        { name: 'Insurance', color: '#3b82f6' },
        { name: 'Education', color: '#6366f1' },
        { name: 'Personal Care', color: '#8b5cf6' },
        { name: 'Gifts & Donations', color: '#a855f7' },
        { name: 'Travel', color: '#d946ef' },
        { name: 'Office Supplies', color: '#ec4899' },
        { name: 'Technology', color: '#f43f5e' },
        { name: 'Home Improvement', color: '#6b7280' },
        { name: 'Subscriptions', color: '#ef4444' },
        { name: 'Bank Fees', color: '#f97316' },
        { name: 'Taxes', color: '#f59e0b' },
        { name: 'Investment', color: '#eab308' },
        { name: 'Car Maintenance', color: '#84cc16' },
        { name: 'Pet Care', color: '#22c55e' },
        { name: 'Sports & Fitness', color: '#10b981' },
        { name: 'Books & Media', color: '#14b8a6' },
        { name: 'Clothing', color: '#06b6d4' },
        { name: 'Emergency Fund', color: '#0ea5e9' },
        { name: 'Other Expenses', color: '#3b82f6' }
    ];

    // Your specific income categories
    const incomeCategories = [
        { name: 'BOSCH Salary', color: '#10b981' },
        { name: 'DevSquare - Shankar K.', color: '#3b82f6' },
        { name: 'Tax refund', color: '#8b5cf6' },
        { name: 'Freelance Income', color: '#f59e0b' },
        { name: 'Investment Returns', color: '#a855f7' },
        { name: 'Bonus', color: '#22c55e' },
        { name: 'Side Business', color: '#ec4899' },
        { name: 'Gifts Received', color: '#14b8a6' },
        { name: 'Other Income', color: '#6b7280' }
    ];

      // Create expense categories
  for (const category of expenseCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: category.name,
        type: 'EXPENSE'
      }
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: category.name,
          type: 'EXPENSE',
          color: category.color,
        },
      });
    }
  }

  console.log('Created expense categories');

  // Create income categories
  for (const category of incomeCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: category.name,
        type: 'INCOME'
      }
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: category.name,
          type: 'INCOME',
          color: category.color,
        },
      });
    }
  }

    console.log('Created income categories');
    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
