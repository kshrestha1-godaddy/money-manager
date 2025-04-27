import { Card } from "@repo/ui/card";

export const P2PTransactions = ({
  transactions,
}: {
  transactions: {
    time: Date;
    amount: number;
    status: string;
    from: number;
    to: number;
  }[];
}) => {
  if (!transactions.length) {
    return (
      <Card title="Recent Transactions">
        <div className="text-center pb-8 pt-8">No Recent transactions</div>
      </Card>
    );
  }
  return (
    <Card title="Recent Transactions">
      <div className="pt-2">
        {transactions.map((t) => (
          <div
            key={`${t.time.getTime()}-${t.amount}`}
            className="flex justify-between py-3"
          >
            <div>
              <div className="text-sm">
                {/* color code the status green for success, red for failure, and gray for processing */}
                {t.status === "Credit" ? (
                  <span className="text-green-500"> [Credit]</span>
                ) : (
                  <span className="text-red-500"> [Debit]</span>
                )}
              </div>

              <div className="text-sm">Received INR</div>
              <div className="text-slate-600 text-xs">
                {t.time.toDateString()}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              + Rs {t.amount / 100}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
