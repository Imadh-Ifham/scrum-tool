import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import taskRoutes from "./routes/taskRoutes.js";
import { connectToDatabase } from "./config/db.js";
import { seedTasks } from "./_internal/seed/private/seedData.js";
import { Task } from "./models/Task.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/tasks", taskRoutes);

app.post("/api/tasks/seed", async (_req, res, next) => {
  try {
    await Task.deleteMany({});
    const inserted = await Task.insertMany(seedTasks);
    res
      .status(201)
      .json({ message: "Seeded backlog tasks", count: inserted.length });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error?.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      details: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      message: "Task ID must be unique",
    });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
  try {
    await connectToDatabase();
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
