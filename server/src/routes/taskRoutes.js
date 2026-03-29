import { Router } from "express";
import {
  createTask,
  deleteTask,
  getTaskStats,
  getTasks,
  updateTask,
} from "../controllers/taskController.js";

const router = Router();

router.get("/", getTasks);
router.get("/stats", getTaskStats);
router.post("/", createTask);
router.patch("/:mongoId", updateTask);
router.delete("/:mongoId", deleteTask);

export default router;
