import express, { Request, Response } from "express";
import bodyParser from "body-parser";

import prisma from "@repo/db/client";

const app = express();

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

app.post("/hdfcWebhook", async (req: Request, res: Response): Promise<any> => {
  // Add zod validation here for the paymentInformation
  // TODO: Add zod validation
  const paymentInformation = {
    token: req.body.token,
    userId: req.body.userId,
    amount: req.body.amount,
  };

  // check if the onRampTransaction is already updated to success
  const onRampTransaction = await prisma.onRampTransaction.findUnique({
    where: {
      token: paymentInformation.token,
    },
  });

  if (onRampTransaction?.status === "Success") {
    return res.status(200).json({
      message: "Payment already processed",
    });
  }

  try {
    await prisma.$transaction([
      prisma.balance.updateMany({
        where: {
          userId: paymentInformation.userId,
        },
        data: {
          amount: {
            increment: paymentInformation.amount,
          },
        },
      }),
      prisma.onRampTransaction.updateMany({
        where: {
          userId: paymentInformation.userId,
          token: paymentInformation.token,
        },
        data: {
          status: "Success",
          amount: paymentInformation.amount,
        },
      }),
    ]);
    return res.status(200).json({
      message: "Payment information updated successfully",
    });
  } catch (error) {
    console.error("Error updating payment information:", error);
    return res.status(411).json({
      message: "Error updating payment information",
    });
  }
});

app.listen(3050, () => {
  console.log("Server is running on port 3050");
});
