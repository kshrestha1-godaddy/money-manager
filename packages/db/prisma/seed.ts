import prisma from "../src/index";
import bcrypt from "bcrypt";

async function main() {
    console.log('Seeding database...');

    // Create 5 test users with different numbers
    const users = [
        {
            email: 'john.doe@example.com',
            name: 'John Doe',
            number: '1234567890',
            password: '1234567890', // password same as number
            currency: 'USD',
        },
        {
            email: 'jane.smith@example.com',
            name: 'Jane Smith',
            number: '9876543210',
            password: '9876543210',
            currency: 'USD',
        },
        {
            email: 'mike.johnson@example.com',
            name: 'Mike Johnson',
            number: '5555555555',
            password: '5555555555',
            currency: 'EUR',
        },
        {
            email: 'sarah.wilson@example.com',
            name: 'Sarah Wilson',
            number: '7777777777',
            password: '7777777777',
            currency: 'GBP',
        },
        {
            email: 'alex.brown@example.com',
            name: 'Alex Brown',
            number: '9999999999',
            password: '9999999999',
            currency: 'CAD',
        }
    ];

    const createdUsers = [];
    for (const userData of users) {
        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {
                currency: userData.currency,
                password: hashedPassword,
            },
            create: {
                ...userData,
                password: hashedPassword,
            },
        });
        createdUsers.push(user);
        console.log('Created user:', user.name);
    }

    // Create 2-5 accounts for each user
    const accountsData = [
        // John Doe's accounts
        [
            {
                holderName: 'John Doe',
                accountNumber: '1001001001',
                branchCode: 'BR001',
                bankName: 'Chase Bank',
                branchName: 'Downtown Branch',
                bankAddress: '123 Main St, New York',
                accountType: 'Checking',
                mobileNumbers: ['1234567890'],
                branchContacts: ['1987654321'],
                swift: 'CHASUS33',
                bankEmail: 'downtown@chase.com',
                accountOpeningDate: new Date('2020-01-15'),
                securityQuestion: ['What is your first pet name?'],
                balance: 15000.00,
            },
            {
                holderName: 'John Doe',
                accountNumber: '1001001002',
                branchCode: 'BR002',
                bankName: 'Wells Fargo',
                branchName: 'Uptown Branch',
                bankAddress: '456 Oak Ave, New York',
                accountType: 'Savings',
                mobileNumbers: ['1234567890'],
                branchContacts: ['1555666777'],
                swift: 'WFBIUS6S',
                bankEmail: 'uptown@wellsfargo.com',
                accountOpeningDate: new Date('2021-03-20'),
                securityQuestion: ['What city were you born in?'],
                balance: 25000.00,
            },
            {
                holderName: 'John Doe',
                accountNumber: '1001001003',
                branchCode: 'BR003',
                bankName: 'Bank of America',
                branchName: 'Midtown Branch',
                bankAddress: '789 Pine St, New York',
                accountType: 'Investment',
                mobileNumbers: ['1234567890'],
                branchContacts: ['1444555666'],
                swift: 'BOFAUS3N',
                bankEmail: 'midtown@bankofamerica.com',
                accountOpeningDate: new Date('2022-06-10'),
                securityQuestion: ['What is your mothers maiden name?'],
                balance: 50000.00,
            }
        ],
        // Jane Smith's accounts
        [
            {
                holderName: 'Jane Smith',
                accountNumber: '2002002001',
                branchCode: 'BR004',
                bankName: 'Citibank',
                branchName: 'Central Branch',
                bankAddress: '321 Elm St, Boston',
                accountType: 'Checking',
                mobileNumbers: ['9876543210'],
                branchContacts: ['1777888999'],
                swift: 'CITIUS33',
                bankEmail: 'central@citibank.com',
                accountOpeningDate: new Date('2019-09-12'),
                securityQuestion: ['What is your favorite color?'],
                balance: 12000.00,
            },
            {
                holderName: 'Jane Smith',
                accountNumber: '2002002002',
                branchCode: 'BR005',
                bankName: 'TD Bank',
                branchName: 'North Branch',
                bankAddress: '654 Maple Dr, Boston',
                accountType: 'Savings',
                mobileNumbers: ['9876543210'],
                branchContacts: ['1333444555'],
                swift: 'TDOMCATTTOR',
                bankEmail: 'north@tdbank.com',
                accountOpeningDate: new Date('2020-11-05'),
                securityQuestion: ['What was your first car?'],
                balance: 18000.00,
            }
        ],
        // Mike Johnson's accounts
        [
            {
                holderName: 'Mike Johnson',
                accountNumber: '3003003001',
                branchCode: 'BR006',
                bankName: 'Deutsche Bank',
                branchName: 'Frankfurt Main',
                bankAddress: '12 Taunusanlage, Frankfurt',
                accountType: 'Checking',
                mobileNumbers: ['5555555555'],
                branchContacts: ['496975750'],
                swift: 'DEUTDEFF',
                bankEmail: 'main@deutschebank.de',
                accountOpeningDate: new Date('2021-02-28'),
                securityQuestion: ['What is your favorite food?'],
                balance: 8000.00,
            },
            {
                holderName: 'Mike Johnson',
                accountNumber: '3003003002',
                branchCode: 'BR007',
                bankName: 'Commerzbank',
                branchName: 'Berlin Branch',
                bankAddress: '28 Unter den Linden, Berlin',
                accountType: 'Savings',
                mobileNumbers: ['5555555555'],
                branchContacts: ['4930259850'],
                swift: 'COBADEFF',
                bankEmail: 'berlin@commerzbank.de',
                accountOpeningDate: new Date('2022-07-15'),
                securityQuestion: ['What school did you attend?'],
                balance: 22000.00,
            },
            {
                holderName: 'Mike Johnson',
                accountNumber: '3003003003',
                branchCode: 'BR008',
                bankName: 'ING Bank',
                branchName: 'Munich Branch',
                bankAddress: '45 Marienplatz, Munich',
                accountType: 'Business',
                mobileNumbers: ['5555555555'],
                branchContacts: ['498912345678'],
                swift: 'INGDDEFF',
                bankEmail: 'munich@ing.de',
                accountOpeningDate: new Date('2023-01-10'),
                securityQuestion: ['What is your dream destination?'],
                balance: 35000.00,
            },
            {
                holderName: 'Mike Johnson',
                accountNumber: '3003003004',
                branchCode: 'BR009',
                bankName: 'HSBC Germany',
                branchName: 'Hamburg Branch',
                bankAddress: '67 Jungfernstieg, Hamburg',
                accountType: 'Investment',
                mobileNumbers: ['5555555555'],
                branchContacts: ['49404135790'],
                swift: 'HBUKDEFF',
                bankEmail: 'hamburg@hsbc.de',
                accountOpeningDate: new Date('2023-04-22'),
                securityQuestion: ['What was your childhood nickname?'],
                balance: 45000.00,
            }
        ],
        // Sarah Wilson's accounts
        [
            {
                holderName: 'Sarah Wilson',
                accountNumber: '4004004001',
                branchCode: 'BR010',
                bankName: 'Barclays',
                branchName: 'London City',
                bankAddress: '1 Churchill Place, London',
                accountType: 'Current',
                mobileNumbers: ['7777777777'],
                branchContacts: ['442071161234'],
                swift: 'BUKBGB22',
                bankEmail: 'city@barclays.co.uk',
                accountOpeningDate: new Date('2020-05-18'),
                securityQuestion: ['What is your favorite book?'],
                balance: 14000.00,
            },
            {
                holderName: 'Sarah Wilson',
                accountNumber: '4004004002',
                branchCode: 'BR011',
                bankName: 'HSBC UK',
                branchName: 'Oxford Street',
                bankAddress: '8 Canada Square, London',
                accountType: 'Savings',
                mobileNumbers: ['7777777777'],
                branchContacts: ['442077472000'],
                swift: 'HBUKGB4B',
                bankEmail: 'oxford@hsbc.co.uk',
                accountOpeningDate: new Date('2021-08-30'),
                securityQuestion: ['What was your first job?'],
                balance: 28000.00,
            },
            {
                holderName: 'Sarah Wilson',
                accountNumber: '4004004003',
                branchCode: 'BR012',
                bankName: 'Lloyds Bank',
                branchName: 'Westminster',
                bankAddress: '25 Gresham Street, London',
                accountType: 'Premium',
                mobileNumbers: ['7777777777'],
                branchContacts: ['442073565656'],
                swift: 'LOYDGB21',
                bankEmail: 'westminster@lloydsbank.co.uk',
                accountOpeningDate: new Date('2022-12-03'),
                securityQuestion: ['What is your favorite movie?'],
                balance: 32000.00,
            }
        ],
        // Alex Brown's accounts
        [
            {
                holderName: 'Alex Brown',
                accountNumber: '5005005001',
                branchCode: 'BR013',
                bankName: 'Royal Bank of Canada',
                branchName: 'Toronto Main',
                bankAddress: '200 Bay Street, Toronto',
                accountType: 'Chequing',
                mobileNumbers: ['9999999999'],
                branchContacts: ['14169749755'],
                swift: 'ROYCCAT2',
                bankEmail: 'main@rbc.ca',
                accountOpeningDate: new Date('2019-12-15'),
                securityQuestion: ['What is your favorite sport?'],
                balance: 11000.00,
            },
            {
                holderName: 'Alex Brown',
                accountNumber: '5005005002',
                branchCode: 'BR014',
                bankName: 'TD Canada Trust',
                branchName: 'Vancouver Downtown',
                bankAddress: '700 W Georgia St, Vancouver',
                accountType: 'Savings',
                mobileNumbers: ['9999999999'],
                branchContacts: ['16048734531'],
                swift: 'TDOMCATTTOR',
                bankEmail: 'downtown@td.ca',
                accountOpeningDate: new Date('2021-04-07'),
                securityQuestion: ['What city do you want to visit?'],
                balance: 19000.00,
            },
            {
                holderName: 'Alex Brown',
                accountNumber: '5005005003',
                branchCode: 'BR015',
                bankName: 'Bank of Montreal',
                branchName: 'Calgary Centre',
                bankAddress: '119 5th Ave SW, Calgary',
                accountType: 'Investment',
                mobileNumbers: ['9999999999'],
                branchContacts: ['14032665200'],
                swift: 'BOFMCAM2',
                bankEmail: 'centre@bmo.ca',
                accountOpeningDate: new Date('2022-09-25'),
                securityQuestion: ['What is your lucky number?'],
                balance: 38000.00,
            },
            {
                holderName: 'Alex Brown',
                accountNumber: '5005005004',
                branchCode: 'BR016',
                bankName: 'Scotiabank',
                branchName: 'Montreal Branch',
                bankAddress: '1002 Sherbrooke St W, Montreal',
                accountType: 'Business',
                mobileNumbers: ['9999999999'],
                branchContacts: ['15149821234'],
                swift: 'NOSCCATT',
                bankEmail: 'montreal@scotiabank.ca',
                accountOpeningDate: new Date('2023-02-14'),
                securityQuestion: ['What was your high school mascot?'],
                balance: 26000.00,
            },
            {
                holderName: 'Alex Brown',
                accountNumber: '5005005005',
                branchCode: 'BR017',
                bankName: 'CIBC',
                branchName: 'Ottawa Central',
                bankAddress: '199 Bay Street, Ottawa',
                accountType: 'Premium',
                mobileNumbers: ['9999999999'],
                branchContacts: ['16135636363'],
                swift: 'CIBCCATT',
                bankEmail: 'central@cibc.ca',
                accountOpeningDate: new Date('2023-06-08'),
                securityQuestion: ['What is your favorite season?'],
                balance: 42000.00,
            }
        ]
    ];

    const createdAccounts = [];
    for (let i = 0; i < createdUsers.length; i++) {
        const user = createdUsers[i];
        if (!user) continue;
        
        const userAccounts = accountsData[i];
        if (!userAccounts) continue;
        
        for (const accountData of userAccounts) {
            if (!accountData) continue;
            
            const account = await prisma.account.upsert({
                where: { accountNumber: accountData.accountNumber },
                update: {},
                create: {
                    ...accountData,
                    userId: user.id,
                },
            });
            createdAccounts.push(account);
            console.log(`Created account ${account.accountNumber} for ${user.name}`);
        }
    }

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
    const createdExpenseCategories = [];
    for (const category of expenseCategories) {
        const existing = await prisma.category.findFirst({
            where: {
                name: category.name,
                type: 'EXPENSE'
            }
        });

        if (!existing) {
            const newCategory = await prisma.category.create({
                data: {
                    name: category.name,
                    type: 'EXPENSE',
                    color: category.color,
                },
            });
            createdExpenseCategories.push(newCategory);
        } else {
            createdExpenseCategories.push(existing);
        }
    }

    console.log('Created expense categories');

    // Create income categories
    const createdIncomeCategories = [];
    for (const category of incomeCategories) {
        const existing = await prisma.category.findFirst({
            where: {
                name: category.name,
                type: 'INCOME'
            }
        });

        if (!existing) {
            const newCategory = await prisma.category.create({
                data: {
                    name: category.name,
                    type: 'INCOME',
                    color: category.color,
                },
            });
            createdIncomeCategories.push(newCategory);
        } else {
            createdIncomeCategories.push(existing);
        }
    }

    console.log('Created income categories');

    // Create sample expenses for each user
    const sampleExpenses = [
        { title: 'Monthly Rent Payment', description: 'Apartment rent for December', amount: 1200.00, categoryName: 'Flat Rent and Maintenances' },
        { title: 'Grocery Shopping', description: 'Weekly groceries from supermarket', amount: 85.50, categoryName: 'Shopping' },
        { title: 'Restaurant Dinner', description: 'Dinner at Italian restaurant', amount: 45.75, categoryName: 'Food (Restaurants, Orders)' },
        { title: 'Gas Station Fill-up', description: 'Car fuel', amount: 55.20, categoryName: 'Transportation' },
        { title: 'Netflix Subscription', description: 'Monthly streaming service', amount: 15.99, categoryName: 'Subscriptions' },
        { title: 'Electricity Bill', description: 'Monthly power bill', amount: 89.45, categoryName: 'Utilities' },
        { title: 'Gym Membership', description: 'Monthly fitness center fee', amount: 35.00, categoryName: 'Sports & Fitness' },
        { title: 'Coffee Shop', description: 'Morning coffee and pastry', amount: 8.75, categoryName: 'Food (Restaurants, Orders)' },
        { title: 'Phone Bill', description: 'Monthly mobile service', amount: 65.00, categoryName: 'Utilities' },
        { title: 'Medical Checkup', description: 'Annual health examination', amount: 150.00, categoryName: 'Healthcare' }
    ];

    // Create sample incomes for each user
    const sampleIncomes = [
        { title: 'Monthly Salary', description: 'Regular monthly salary payment', amount: 4500.00, categoryName: 'BOSCH Salary' },
        { title: 'Freelance Project', description: 'Website development project', amount: 800.00, categoryName: 'Freelance Income' },
        { title: 'Investment Dividend', description: 'Quarterly dividend payment', amount: 125.50, categoryName: 'Investment Returns' },
        { title: 'Side Consulting', description: 'IT consulting work', amount: 300.00, categoryName: 'Side Business' },
        { title: 'Annual Bonus', description: 'Year-end performance bonus', amount: 2000.00, categoryName: 'Bonus' },
        { title: 'Tax Refund', description: 'Government tax return', amount: 450.00, categoryName: 'Tax refund' },
        { title: 'Gift Money', description: 'Birthday gift from family', amount: 100.00, categoryName: 'Gifts Received' },
        { title: 'Stock Sale', description: 'Profit from stock investment', amount: 350.75, categoryName: 'Investment Returns' }
    ];

    // Create expenses for each user
    for (let i = 0; i < createdUsers.length; i++) {
        const user = createdUsers[i];
        if (!user) continue;
        
        const userAccounts = createdAccounts.filter(acc => acc.userId === user.id);
        if (userAccounts.length === 0) continue;
        
        // Create 5-10 expenses per user
        const numExpenses = Math.floor(Math.random() * 6) + 5; // 5-10 expenses
        for (let j = 0; j < numExpenses; j++) {
            const expense = sampleExpenses[j % sampleExpenses.length];
            if (!expense) continue;
            
            const randomAccount = userAccounts[Math.floor(Math.random() * userAccounts.length)];
            if (!randomAccount) continue;
            
            const category = createdExpenseCategories.find(cat => cat.name === expense.categoryName);
            if (!category) continue;
            
            await prisma.expense.create({
                data: {
                    title: expense.title,
                    description: expense.description,
                    amount: expense.amount + (Math.random() * 50 - 25), // Add some variation
                    date: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000), // Random date within last 90 days
                    categoryId: category.id,
                    accountId: randomAccount.id,
                    userId: user.id,
                    tags: ['seeded', 'sample'],
                },
            });
        }
        console.log(`Created ${numExpenses} expenses for ${user.name}`);
    }

    // Create incomes for each user
    for (let i = 0; i < createdUsers.length; i++) {
        const user = createdUsers[i];
        if (!user) continue;
        
        const userAccounts = createdAccounts.filter(acc => acc.userId === user.id);
        if (userAccounts.length === 0) continue;
        
        // Create 3-8 incomes per user
        const numIncomes = Math.floor(Math.random() * 6) + 3; // 3-8 incomes
        for (let j = 0; j < numIncomes; j++) {
            const income = sampleIncomes[j % sampleIncomes.length];
            if (!income) continue;
            
            const randomAccount = userAccounts[Math.floor(Math.random() * userAccounts.length)];
            if (!randomAccount) continue;
            
            const category = createdIncomeCategories.find(cat => cat.name === income.categoryName);
            if (!category) continue;
            
            await prisma.income.create({
                data: {
                    title: income.title,
                    description: income.description,
                    amount: income.amount + (Math.random() * 200 - 100), // Add some variation
                    date: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000), // Random date within last 90 days
                    categoryId: category.id,
                    accountId: randomAccount.id,
                    userId: user.id,
                    tags: ['seeded', 'sample'],
                },
            });
        }
        console.log(`Created ${numIncomes} incomes for ${user.name}`);
    }

    console.log('Seeding completed!');
    console.log(`Created ${createdUsers.length} users`);
    console.log(`Created ${createdAccounts.length} accounts`);
    console.log('Created sample expenses and incomes for all users');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
