import { Card } from "@repo/ui/card";

export const OnRampTransactions = ({
  transactions,
}: {
  transactions: {
    time: Date;
    amount: number;
    // TODO: Can the type of `status` be more specific?
    status: string;
    provider: string;
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
                {t.status === "Success" ? (
                  <span className="text-green-500">[Success]</span>
                ) : t.status === "Failure" ? (
                  <span className="text-red-500">[Failed]</span>
                ) : (
                  <span className="text-blue-400">[Processing]</span>
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
