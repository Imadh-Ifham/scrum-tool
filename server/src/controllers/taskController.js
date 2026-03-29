import { Task } from "../models/Task.js";

const buildFilters = (query) => {
  const filters = {};

  if (query.service && query.service !== "All") {
    filters.service = query.service;
  }

  if (query.priority && query.priority !== "All") {
    filters.priority = query.priority;
  }

  if (query.assignedTo && query.assignedTo !== "All") {
    filters.assignedTo = query.assignedTo;
  }

  if (query.status && query.status !== "All") {
    filters.status = query.status;
  }

  return filters;
};

export const getTasks = async (req, res, next) => {
  try {
    const filters = buildFilters(req.query);
    const tasks = await Task.find(filters).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskStats = async (req, res, next) => {
  try {
    const filters = buildFilters(req.query);
    const tasks = await Task.find(filters);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (item) => item.status === "Completed",
    ).length;
    const remainingTasks = totalTasks - completedTasks;
    const totalStoryPoints = tasks.reduce((sum, item) => sum + item.sp, 0);

    res.json({
      totalTasks,
      completedTasks,
      remainingTasks,
      totalStoryPoints,
    });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.mongoId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.mongoId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
