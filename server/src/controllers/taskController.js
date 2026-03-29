import { Task } from "../models/Task.js";
import { AssigneeCapacity } from "../models/AssigneeCapacity.js";

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

const DEFAULT_STORY_POINT_CAPACITY = 40;

const buildPersonalFilters = (query) => {
  const filters = {};

  if (query.service && query.service !== "All") {
    filters.service = query.service;
  }

  if (query.priority && query.priority !== "All") {
    filters.priority = query.priority;
  }

  if (query.status && query.status !== "All") {
    filters.status = query.status;
  }

  if (query.idQuery && String(query.idQuery).trim()) {
    filters.id = {
      $regex: String(query.idQuery).trim(),
      $options: "i",
    };
  }

  return filters;
};

const buildDashboardStats = (tasks, storyPointCapacity) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (item) => item.status === "Completed",
  ).length;
  const pendingTasks = totalTasks - completedTasks;

  const assignedStoryPoints = tasks.reduce((sum, item) => sum + item.sp, 0);
  const completedStoryPoints = tasks
    .filter((item) => item.status === "Completed")
    .reduce((sum, item) => sum + item.sp, 0);
  const pendingStoryPoints = assignedStoryPoints - completedStoryPoints;

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    assignedStoryPoints,
    completedStoryPoints,
    pendingStoryPoints,
    storyPointCapacity,
    remainingAssignableStoryPoints: Math.max(
      storyPointCapacity - assignedStoryPoints,
      0,
    ),
  };
};

export const getAssigneeDashboard = async (req, res, next) => {
  try {
    const selectedAssignee = req.query.assignedTo?.trim();
    const [taskAssignees, capacityDocs] = await Promise.all([
      Task.distinct("assignedTo"),
      AssigneeCapacity.find({}, { assignee: 1, capacity: 1, _id: 0 }),
    ]);

    const normalizedAssignees = taskAssignees
      .map((item) => item.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const capacityMap = capacityDocs.reduce((accumulator, item) => {
      accumulator[item.assignee] = item.capacity;
      return accumulator;
    }, {});

    const assignees = [
      ...new Set([...normalizedAssignees, ...Object.keys(capacityMap)]),
    ].sort((a, b) => a.localeCompare(b));

    if (!selectedAssignee || selectedAssignee === "All") {
      return res.json({
        assignees,
        assigneeCapacities: assignees.map((assignee) => ({
          assignee,
          capacity: capacityMap[assignee] ?? DEFAULT_STORY_POINT_CAPACITY,
        })),
        selectedAssignee: null,
        dashboard: null,
      });
    }

    const capacityDoc = await AssigneeCapacity.findOne({
      assignee: selectedAssignee,
    });

    const storyPointCapacity =
      capacityDoc?.capacity ?? DEFAULT_STORY_POINT_CAPACITY;

    const personalFilters = buildPersonalFilters(req.query);
    const [allTasks, filteredTasks] = await Promise.all([
      Task.find({ assignedTo: selectedAssignee }).sort({ createdAt: -1 }),
      Task.find({
        assignedTo: selectedAssignee,
        ...personalFilters,
      }).sort({ createdAt: -1 }),
    ]);

    const serviceOptions = [
      "All",
      ...new Set(allTasks.map((item) => item.service)),
    ];

    const priorityOptions = ["All", "Critical", "High", "Medium", "Low"];
    const statusOptions = ["All", "Pending", "Completed"];

    const filters = {
      service: req.query.service ?? "All",
      priority: req.query.priority ?? "All",
      status: req.query.status ?? "All",
      idQuery: req.query.idQuery ?? "",
      serviceOptions,
      priorityOptions,
      statusOptions,
    };

    const overallStats = buildDashboardStats(allTasks, storyPointCapacity);
    const filteredStats = buildDashboardStats(
      filteredTasks,
      storyPointCapacity,
    );

    res.json({
      assignees,
      assigneeCapacities: assignees.map((assignee) => ({
        assignee,
        capacity: capacityMap[assignee] ?? DEFAULT_STORY_POINT_CAPACITY,
      })),
      selectedAssignee,
      dashboard: {
        storyPointCapacity,
        overall: {
          ...overallStats,
          taskIds: allTasks.map((item) => item.id),
          tasks: allTasks.map((item) => ({
            mongoId: String(item._id),
            id: item.id,
            service: item.service,
            task: item.task,
            priority: item.priority,
            sp: item.sp,
            rationale: item.rationale,
            assignedTo: item.assignedTo,
            status: item.status,
          })),
        },
        filtered: {
          ...filteredStats,
          taskIds: filteredTasks.map((item) => item.id),
          tasks: filteredTasks.map((item) => ({
            mongoId: String(item._id),
            id: item.id,
            service: item.service,
            task: item.task,
            priority: item.priority,
            sp: item.sp,
            rationale: item.rationale,
            assignedTo: item.assignedTo,
            status: item.status,
          })),
        },
        filters,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssigneeCapacity = async (req, res, next) => {
  try {
    const assignee = String(req.body.assignee ?? "").trim();
    const capacity = Number(req.body.capacity);

    if (!assignee) {
      return res.status(400).json({ message: "Assignee is required" });
    }

    if (!Number.isFinite(capacity) || capacity < 0) {
      return res.status(400).json({
        message: "Capacity must be a non-negative number",
      });
    }

    const updated = await AssigneeCapacity.findOneAndUpdate(
      { assignee },
      { assignee, capacity },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    res.json({
      assignee: updated.assignee,
      capacity: updated.capacity,
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
