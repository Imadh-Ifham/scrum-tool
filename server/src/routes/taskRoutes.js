import { Router } from "express";
import {
  getAssigneeDashboard,
  createTask,
  deleteTask,
  getTaskStats,
  getTasks,
  updateAssigneeCapacity,
  updateTask,
} from "../controllers/taskController.js";

const router = Router();

router.get("/", getTasks);
router.get("/stats", getTaskStats);
router.get("/assignee-dashboard", getAssigneeDashboard);
router.patch("/assignee-capacity", updateAssigneeCapacity);
router.post("/", createTask);
router.patch("/:mongoId", updateTask);
router.delete("/:mongoId", deleteTask);

export default router;
