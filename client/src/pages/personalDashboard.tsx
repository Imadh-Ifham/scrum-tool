import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type TaskStatus = "Completed" | "Pending";
type TaskPriority = "Critical" | "High" | "Medium" | "Low";

type TaskDetails = {
  mongoId: string;
  id: string;
  service: string;
  task: string;
  priority: TaskPriority;
  sp: number;
  rationale: string;
  assignedTo: string;
  status: TaskStatus;
};

type DashboardStats = {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  assignedStoryPoints: number;
  completedStoryPoints: number;
  pendingStoryPoints: number;
  storyPointCapacity: number;
  remainingAssignableStoryPoints: number;
  taskIds: string[];
  tasks: TaskDetails[];
};

type DashboardFilters = {
  service: string;
  priority: string;
  status: string;
  idQuery: string;
  serviceOptions: string[];
  priorityOptions: string[];
  statusOptions: string[];
};

type AssigneeCapacity = {
  assignee: string;
  capacity: number;
};

type DashboardPayload = {
  storyPointCapacity: number;
  overall: DashboardStats;
  filtered: DashboardStats;
  filters: DashboardFilters;
};

type AssigneeDashboardResponse = {
  assignees: string[];
  assigneeCapacities: AssigneeCapacity[];
  selectedAssignee: string | null;
  dashboard: DashboardPayload | null;
};

type FilterState = {
  service: string;
  priority: string;
  status: string;
  idQuery: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const defaultFilters: FilterState = {
  service: "All",
  priority: "All",
  status: "All",
  idQuery: "",
};

const PersonalDashboardPage = () => {
  const [assignees, setAssignees] = useState<string[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterDraft, setFilterDraft] = useState<FilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(defaultFilters);
  const [capacityInput, setCapacityInput] = useState("40");
  const [isSavingCapacity, setIsSavingCapacity] = useState(false);
  const [capacityMessage, setCapacityMessage] = useState<string | null>(null);

  const handleAssigneeChange = (assignee: string) => {
    setSelectedAssignee(assignee);
    setFilterDraft(defaultFilters);
    setAppliedFilters(defaultFilters);
    setCapacityMessage(null);
  };

  const fetchPersonalDashboard = useCallback(
    async (assignee: string, filters: FilterState) => {
      if (!assignee) {
        setDashboard(null);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const searchParams = new URLSearchParams({
          assignedTo: assignee,
        });

        if (filters.service !== "All") {
          searchParams.set("service", filters.service);
        }

        if (filters.priority !== "All") {
          searchParams.set("priority", filters.priority);
        }

        if (filters.status !== "All") {
          searchParams.set("status", filters.status);
        }

        if (filters.idQuery.trim()) {
          searchParams.set("idQuery", filters.idQuery.trim());
        }

        const response = await fetch(
          `${API_BASE_URL}/api/tasks/assignee-dashboard?${searchParams.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load personal dashboard");
        }

        const data = (await response.json()) as AssigneeDashboardResponse;
        setDashboard(data.dashboard);
        setAssignees(data.assignees ?? []);

        if (data.dashboard) {
          setCapacityInput(String(data.dashboard.storyPointCapacity));
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to fetch personal dashboard",
        );
        setDashboard(null);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const saveCapacity = async () => {
    const normalized = Number(capacityInput);

    if (!selectedAssignee) {
      setCapacityMessage("Please select a person first.");
      return;
    }

    if (!Number.isFinite(normalized) || normalized < 0) {
      setCapacityMessage("Capacity must be a non-negative number.");
      return;
    }

    setIsSavingCapacity(true);
    setCapacityMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tasks/assignee-capacity`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignee: selectedAssignee,
            capacity: normalized,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update capacity");
      }

      setCapacityMessage("Capacity updated successfully.");
      await fetchPersonalDashboard(selectedAssignee, appliedFilters);
    } catch (error) {
      setCapacityMessage(
        error instanceof Error ? error.message : "Unable to update capacity",
      );
    } finally {
      setIsSavingCapacity(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tasks/assignee-dashboard`,
        );

        if (!response.ok) {
          throw new Error("Failed to load assignee list");
        }

        const data = (await response.json()) as AssigneeDashboardResponse;
        const sortedAssignees = data.assignees ?? [];

        setAssignees(sortedAssignees);

        if (sortedAssignees.length > 0) {
          setSelectedAssignee(sortedAssignees[0]);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load assignees",
        );
        setIsLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!selectedAssignee) {
      return;
    }

    void fetchPersonalDashboard(selectedAssignee, appliedFilters);
  }, [selectedAssignee, appliedFilters, fetchPersonalDashboard]);

  const options = dashboard?.filters;

  const visibleRows = useMemo(() => {
    return dashboard?.filtered.tasks ?? [];
  }, [dashboard]);

  return (
    <main className="min-h-screen bg-[linear-gradient(150deg,#f0f9ff_0%,#ecfeff_48%,#ffffff_100%)] px-4 py-8 md:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_24px_72px_-28px_rgba(12,74,110,0.45)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
              Personal Dashboard
            </h1>
            <p className="mt-1 text-slate-600">
              Deep-dive into assignee delivery stats, configurable capacity, and
              detailed task-level filters.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/backlog"
              className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
            >
              Back to Backlog
            </Link>
            <Link
              to="/"
              className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
            >
              Home
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <section className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr,1fr,auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-cyan-900">
                Select Person
              </span>
              <select
                value={selectedAssignee}
                onChange={(event) => handleAssigneeChange(event.target.value)}
                className="w-full rounded-xl border border-cyan-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-cyan-500"
              >
                {assignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-cyan-900">
                Story Capacity
              </span>
              <input
                type="number"
                min={0}
                value={capacityInput}
                onChange={(event) => setCapacityInput(event.target.value)}
                className="w-full rounded-xl border border-cyan-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-cyan-500"
              />
            </label>

            <button
              type="button"
              onClick={saveCapacity}
              disabled={isSavingCapacity}
              className="rounded-xl bg-cyan-700 px-4 py-2 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingCapacity ? "Saving..." : "Save Capacity"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {assignees.map((assignee) => {
              const isSelected = assignee === selectedAssignee;

              return (
                <button
                  key={assignee}
                  type="button"
                  onClick={() => handleAssigneeChange(assignee)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? "border-cyan-600 bg-cyan-600 text-white"
                      : "border-cyan-200 bg-white text-cyan-900 hover:bg-cyan-100"
                  }`}
                >
                  {assignee}
                </button>
              );
            })}
          </div>

          {capacityMessage ? (
            <p className="mt-3 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-900">
              {capacityMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Filters</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Service
              </span>
              <select
                value={filterDraft.service}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    service: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-cyan-500"
              >
                {(options?.serviceOptions ?? ["All"]).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Priority
              </span>
              <select
                value={filterDraft.priority}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    priority: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-cyan-500"
              >
                {(options?.priorityOptions ?? ["All"]).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Status
              </span>
              <select
                value={filterDraft.status}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-cyan-500"
              >
                {(options?.statusOptions ?? ["All"]).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Search Task ID
              </span>
              <input
                value={filterDraft.idQuery}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    idQuery: event.target.value,
                  }))
                }
                placeholder="e.g., AUTH-03"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-cyan-500"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAppliedFilters(filterDraft)}
              className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterDraft(defaultFilters);
                setAppliedFilters(defaultFilters);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Reset Filters
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Total Tasks</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {isLoading ? "..." : (dashboard?.overall.totalTasks ?? 0)}
            </p>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-700">Completed</p>
            <p className="text-2xl font-extrabold text-emerald-900">
              {isLoading ? "..." : (dashboard?.overall.completedTasks ?? 0)}
            </p>
          </article>
          <article className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-700">Pending</p>
            <p className="text-2xl font-extrabold text-amber-900">
              {isLoading ? "..." : (dashboard?.overall.pendingTasks ?? 0)}
            </p>
          </article>
          <article className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">Assigned SP</p>
            <p className="text-2xl font-extrabold text-blue-900">
              {isLoading
                ? "..."
                : (dashboard?.overall.assignedStoryPoints ?? 0)}
            </p>
          </article>
          <article className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <p className="text-sm font-medium text-violet-700">
              Remaining Capacity
            </p>
            <p className="text-2xl font-extrabold text-violet-900">
              {isLoading
                ? "..."
                : (dashboard?.overall.remainingAssignableStoryPoints ?? 0)}
            </p>
          </article>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            Task IDs ({dashboard?.filtered.taskIds.length ?? 0})
          </h2>
          <div className="flex flex-wrap gap-2">
            {(dashboard?.filtered.taskIds ?? []).map((taskId) => (
              <span
                key={taskId}
                className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-900"
              >
                {taskId}
              </span>
            ))}
            {!isLoading && (dashboard?.filtered.taskIds.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">
                No tasks matched the filters.
              </p>
            ) : null}
          </div>
        </section>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Task ID</th>
                  <th className="px-4 py-3 font-semibold">Mongo ID</th>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Task</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">SP</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {visibleRows.map((task) => (
                  <tr key={task.mongoId}>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {task.id}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {task.mongoId}
                    </td>
                    <td className="px-4 py-3">{task.service}</td>
                    <td className="px-4 py-3">{task.task}</td>
                    <td className="px-4 py-3">{task.priority}</td>
                    <td className="px-4 py-3">{task.sp}</td>
                    <td className="px-4 py-3">{task.status}</td>
                    <td className="px-4 py-3">{task.rationale}</td>
                  </tr>
                ))}

                {!isLoading && visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      No personal tasks found for this filter set.
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

export default PersonalDashboardPage;
