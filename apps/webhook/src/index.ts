import express from "express";

const app = express();
app.use(express.json());

app.post("/hdfcWebhook", (_request, response) => {
  response.status(200).json({ message: "Webhook received" });
});

app.listen(3050, () => {
  console.log("Server is running on port 3050");
});
