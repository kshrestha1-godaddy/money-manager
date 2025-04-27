import prisma from "@repo/db/client";
import { SendMoney } from "../../components/SendMoney";
import { BalanceCard } from "../../components/BalanceCard";
import { P2PTransactions } from "../../components/P2PTransactions";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

async function getBalance() {
  const session = await getServerSession(authOptions);

  const balance = await prisma.balance.findFirst({
    where: {
      userId: Number(session?.user?.id),
    },
  });
  return {
    amount: balance?.amount || 0,
    locked: balance?.locked || 0,
  };
}

async function getP2PTransactions() {
  const session = await getServerSession(authOptions);

  const senttxns = await prisma.p2pTransfer.findMany({
    where: {
      fromUserId: Number(session?.user?.id),
    },
  });

  const receivedtxns = await prisma.p2pTransfer.findMany({
    where: {
      toUserId: Number(session?.user?.id),
    },
  });

  return [...senttxns, ...receivedtxns].map((t) => ({
    time: t.timestamp,
    amount: t.amount,
    // debit or credit
    status: t.fromUserId === Number(session?.user?.id) ? "Debit" : "Credit",
    from: Number(t.fromUserId),
    to: Number(t.toUserId),
  }));
}

export default async function () {
  const balance = await getBalance();
  const transactions = await getP2PTransactions();

  return (
    <div className="w-screen">
      <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">
        P2P Transfer
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-4">
        <div className="flex flex-col gap-4">
          <BalanceCard amount={balance.amount} locked={balance.locked} />

          <SendMoney />
        </div>
        <div>
          <P2PTransactions transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
