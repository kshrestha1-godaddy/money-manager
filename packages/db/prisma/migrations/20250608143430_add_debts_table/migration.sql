-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('ACTIVE', 'PARTIALLY_PAID', 'FULLY_PAID', 'OVERDUE', 'DEFAULTED');

-- CreateTable
CREATE TABLE "Debt" (
    "id" SERIAL NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "borrowerContact" TEXT,
    "borrowerEmail" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "interestRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "lentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DebtStatus" NOT NULL DEFAULT 'ACTIVE',
    "purpose" TEXT,
    "notes" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtRepayment" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "repaymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "debtId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebtRepayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtRepayment" ADD CONSTRAINT "DebtRepayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
