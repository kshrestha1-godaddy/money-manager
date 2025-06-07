-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "holderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "bankAddress" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "mobileNumbers" TEXT[],
    "branchContacts" TEXT[],
    "swift" TEXT NOT NULL,
    "bankEmail" TEXT NOT NULL,
    "accountOpeningDate" TIMESTAMP(3) NOT NULL,
    "securityQuestion" TEXT[],
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_accountNumber_key" ON "Account"("accountNumber");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
