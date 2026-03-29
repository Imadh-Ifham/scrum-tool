import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type TaskStatus = "Completed" | "Pending";
type TaskPriority = "Critical" | "High" | "Medium" | "Low";

type BacklogTask = {
  _id?: string;
  id: string;
  service: string;
  task: string;
  priority: TaskPriority;
  sp: number;
  rationale: string;
  assignedTo: string;
  status: TaskStatus;
};

type BacklogStats = {
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  totalStoryPoints: number;
};

type EditableField =
  | "id"
  | "service"
  | "task"
  | "priority"
  | "sp"
  | "rationale"
  | "assignedTo"
  | "status";

type EditingCell = {
  mongoId: string;
  field: EditableField;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const PRIORITY_OPTIONS: TaskPriority[] = ["Critical", "High", "Medium", "Low"];
const STATUS_OPTIONS: TaskStatus[] = ["Pending", "Completed"];
const PREDEFINED_ASSIGNEES = ["Aisha", "Ravi", "Lina", "Nikhil", "Sara"];

const defaultStats: BacklogStats = {
  totalTasks: 0,
  completedTasks: 0,
  remainingTasks: 0,
  totalStoryPoints: 0,
};

const emptyNewTask: Omit<BacklogTask, "_id"> = {
  id: "",
  service: "",
  task: "",
  priority: "Medium",
  sp: 0,
  rationale: "",
  assignedTo: PREDEFINED_ASSIGNEES[0],
  status: "Pending",
};

const buildQueryString = (params: {
  service: string;
  priority: string;
  assignedTo: string;
}) => {
  const searchParams = new URLSearchParams();

  if (params.service !== "All") {
    searchParams.set("service", params.service);
  }

  if (params.priority !== "All") {
    searchParams.set("priority", params.priority);
  }

  if (params.assignedTo !== "All") {
    searchParams.set("assignedTo", params.assignedTo);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

const BacklogPage = () => {
  const [serviceFilter, setServiceFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [allTasks, setAllTasks] = useState<BacklogTask[]>([]);
  const [tasks, setTasks] = useState<BacklogTask[]>([]);
  const [stats, setStats] = useState<BacklogStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [newTask, setNewTask] =
    useState<Omit<BacklogTask, "_id">>(emptyNewTask);

  const fetchFiltersData = async () => {
    const response = await fetch(`${API_BASE_URL}/api/tasks`);

    if (!response.ok) {
      throw new Error("Failed to load filter data");
    }

    const data = (await response.json()) as BacklogTask[];
    setAllTasks(data);
  };

  const fetchBacklogData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const queryString = buildQueryString({
        service: serviceFilter,
        priority: priorityFilter,
        assignedTo: assignedFilter,
      });

      const [tasksResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/tasks${queryString}`),
        fetch(`${API_BASE_URL}/api/tasks/stats${queryString}`),
      ]);

      if (!tasksResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to load backlog data");
      }

      const tasksData = (await tasksResponse.json()) as BacklogTask[];
      const statsData = (await statsResponse.json()) as BacklogStats;

      setTasks(tasksData);
      setStats(statsData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to fetch backlog data",
      );
      setTasks([]);
      setStats(defaultStats);
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async () => {
    if (
      !newTask.id.trim() ||
      !newTask.service.trim() ||
      !newTask.task.trim() ||
      !newTask.rationale.trim() ||
      !newTask.assignedTo.trim()
    ) {
      setErrorMessage("Please fill all required fields for new task");
      return;
    }

    if (Number.isNaN(newTask.sp) || newTask.sp < 0) {
      setErrorMessage("Story points must be a non-negative number");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newTask,
          id: newTask.id.trim(),
          service: newTask.service.trim(),
          task: newTask.task.trim(),
          rationale: newTask.rationale.trim(),
          assignedTo: newTask.assignedTo.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      setNewTask(emptyNewTask);
      setShowCreateModal(false);
      await fetchFiltersData();
      await fetchBacklogData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create task",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const deleteTask = async (task: BacklogTask) => {
    if (!task._id) {
      setErrorMessage("Task cannot be deleted because Mongo ID is missing");
      return;
    }

    const confirmed = window.confirm(`Delete task ${task.id}?`);

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${task._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      await fetchFiltersData();
      await fetchBacklogData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete task",
      );
    }
  };

  const startEdit = (task: BacklogTask, field: EditableField) => {
    if (!task._id) {
      setErrorMessage("Task cannot be edited because Mongo ID is missing");
      return;
    }

    setErrorMessage(null);
    setEditingCell({ mongoId: task._id, field });
    setDraftValue(String(task[field]));
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setDraftValue("");
  };

  const updateTaskField = async (
    task: BacklogTask,
    field: EditableField,
    rawValue: string,
  ) => {
    if (!task._id) {
      setErrorMessage("Task cannot be updated because Mongo ID is missing");
      cancelEdit();
      return;
    }

    let normalizedValue: string | number = rawValue.trim();

    if (field === "sp") {
      const numericValue = Number(rawValue);

      if (Number.isNaN(numericValue) || numericValue < 0) {
        setErrorMessage("Story points must be a non-negative number");
        return;
      }

      normalizedValue = numericValue;
    }

    if (field !== "sp" && String(normalizedValue).length === 0) {
      setErrorMessage("Field value cannot be empty");
      return;
    }

    if (String(task[field]) === String(normalizedValue)) {
      cancelEdit();
      return;
    }

    const cellKey = `${task._id}:${field}`;
    setSavingCellKey(cellKey);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: normalizedValue }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${field}`);
      }

      cancelEdit();
      await fetchFiltersData();
      await fetchBacklogData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update task field",
      );
    } finally {
      setSavingCellKey(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await fetchFiltersData();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load filter options",
        );
      }
    };

    init();
  }, []);

  useEffect(() => {
    fetchBacklogData();
  }, [serviceFilter, priorityFilter, assignedFilter]);

  const services = useMemo(() => {
    return ["All", ...new Set(allTasks.map((task) => task.service))];
  }, [allTasks]);

  const priorities = useMemo(() => {
    return ["All", ...PRIORITY_OPTIONS];
  }, []);

  const assigneeOptions = useMemo(() => {
    return [
      ...new Set([
        ...PREDEFINED_ASSIGNEES,
        ...allTasks.map((item) => item.assignedTo),
      ]),
    ];
  }, [allTasks]);

  const assignees = useMemo(() => {
    return ["All", ...assigneeOptions];
  }, [assigneeOptions]);

  const getFieldOptions = (field: EditableField) => {
    if (field === "priority") {
      return PRIORITY_OPTIONS;
    }

    if (field === "status") {
      return STATUS_OPTIONS;
    }

    if (field === "assignedTo") {
      return assigneeOptions;
    }

    return [];
  };

  const isSelectField = (field: EditableField) => {
    return field === "priority" || field === "assignedTo" || field === "status";
  };

  const renderEditableCell = (task: BacklogTask, field: EditableField) => {
    if (!task._id) {
      return <span>{String(task[field])}</span>;
    }

    const isEditing =
      editingCell?.mongoId === task._id && editingCell?.field === field;
    const cellKey = `${task._id}:${field}`;
    const isSaving = savingCellKey === cellKey;

    if (isEditing) {
      if (isSelectField(field)) {
        const options = getFieldOptions(field);

        return (
          <select
            autoFocus
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={() => updateTaskField(task, field, draftValue)}
            className="w-full rounded border border-emerald-400 px-2 py-1 text-sm outline-none"
            disabled={isSaving}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }

      return (
        <input
          autoFocus
          value={draftValue}
          type={field === "sp" ? "number" : "text"}
          min={field === "sp" ? 0 : undefined}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={() => updateTaskField(task, field, draftValue)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void updateTaskField(task, field, draftValue);
            }

            if (event.key === "Escape") {
              cancelEdit();
            }
          }}
          className="w-full rounded border border-emerald-400 px-2 py-1 text-sm outline-none"
          disabled={isSaving}
        />
      );
    }

    return (
      <button
        type="button"
        onClick={() => startEdit(task, field)}
        className="w-full text-left transition hover:text-emerald-700"
      >
        {String(task[field])}
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f0fdf4_0%,#ecfeff_45%,#ffffff_100%)] px-4 py-8 md:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_70px_-30px_rgba(15,23,42,0.45)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
              Product Backlog
            </h1>
            <p className="mt-1 text-slate-600">
              Filter tasks and track delivery progress by team ownership.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex w-fit items-center rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            &larr; Back to Home
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/seed"
            className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500"
          >
            Open Seed Manager
          </Link>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setErrorMessage(null);
            }}
            className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
          >
            Create Task
          </button>
          <button
            type="button"
            onClick={fetchBacklogData}
            disabled={isLoading}
            className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
          <Link
            to="/personal-dashboard"
            className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 font-semibold text-cyan-800 transition hover:bg-cyan-100"
          >
            Open Personal Dashboard
          </Link>
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {showCreateModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <section className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl md:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Create New Task
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <input
                  value={newTask.id}
                  onChange={(event) =>
                    setNewTask((prev) => ({ ...prev, id: event.target.value }))
                  }
                  placeholder="ID (e.g., BLG-200)"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <input
                  value={newTask.service}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      service: event.target.value,
                    }))
                  }
                  placeholder="Service"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <input
                  value={newTask.task}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      task: event.target.value,
                    }))
                  }
                  placeholder="Task"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <input
                  value={newTask.sp}
                  type="number"
                  min={0}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      sp: Number(event.target.value),
                    }))
                  }
                  placeholder="SP"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <input
                  value={newTask.rationale}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      rationale: event.target.value,
                    }))
                  }
                  placeholder="Rationale"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 md:col-span-2"
                />
                <select
                  value={newTask.priority}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      priority: event.target.value as TaskPriority,
                    }))
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={newTask.assignedTo}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      assignedTo: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {assigneeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={newTask.status}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      status: event.target.value as TaskStatus,
                    }))
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={createTask}
                  disabled={isCreating}
                  className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "Creating..." : "Create Task"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Filter By Service
            </span>
            <select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-emerald-500"
            >
              {services.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Filter By Priority
            </span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-emerald-500"
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Filter By Assigned To
            </span>
            <select
              value={assignedFilter}
              onChange={(event) => setAssignedFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-emerald-500"
            >
              {assignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Total Tasks</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {isLoading ? "..." : stats.totalTasks}
            </p>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-700">
              Completed Tasks
            </p>
            <p className="text-2xl font-extrabold text-emerald-900">
              {isLoading ? "..." : stats.completedTasks}
            </p>
          </article>
          <article className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-700">
              Remaining Tasks
            </p>
            <p className="text-2xl font-extrabold text-amber-900">
              {isLoading ? "..." : stats.remainingTasks}
            </p>
          </article>
          <article className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
            <p className="text-sm font-medium text-cyan-700">
              Total Story Points
            </p>
            <p className="text-2xl font-extrabold text-cyan-900">
              {isLoading ? "..." : stats.totalStoryPoints}
            </p>
          </article>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Task</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">SP</th>
                  <th className="px-4 py-3 font-semibold">Rationale</th>
                  <th className="px-4 py-3 font-semibold">Assigned To</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {tasks.map((task) => (
                  <tr key={task._id ?? task.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {renderEditableCell(task, "id")}
                    </td>
                    <td className="px-4 py-3">
                      {renderEditableCell(task, "service")}
                    </td>
                    <td className="px-4 py-3">
                      {renderEditableCell(task, "task")}
                    </td>
                    <td className="px-4 py-3">
                      {renderEditableCell(task, "priority")}
                    </td>
                    <td className="px-4 py-3">
                      {renderEditableCell(task, "sp")}
                    </td>
                    <td className="px-4 py-3">
                      {renderEditableCell(task, "rationale")}
                    </td>
                    <td className="px-4 py-3">
                      {renderEditableCell(task, "assignedTo")}
                    </td>
                    <td className="px-4 py-3">
                      {renderEditableCell(task, "status")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteTask(task)}
                        className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      No tasks found. Click "Seed Sample Tasks" to add starter
                      data.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
};

export default BacklogPage;
