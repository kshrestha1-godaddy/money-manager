import express, { Request, Response } from "express";
import bodyParser from "body-parser";

import prisma from "@repo/db/client";

const app = express();

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

app.post("/hdfcWebhook", async (req: Request, res: Response): Promise<any> => {
  return res.status(200).json({ message: "Webhook received" });
});

app.listen(3050, () => {
  console.log("Server is running on port 3050");
});
