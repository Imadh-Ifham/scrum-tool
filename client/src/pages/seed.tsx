import { useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const SEED_CONFIRM_TEXT = "DELETE AND RESEED";

const SeedPage = () => {
  const [confirmText, setConfirmText] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSeed = async () => {
    if (confirmText !== SEED_CONFIRM_TEXT) {
      setErrorMessage("Confirmation text does not match");
      setSuccessMessage(null);
      return;
    }

    setIsSeeding(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/seed`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to seed tasks");
      }

      const result = (await response.json()) as { count?: number };
      const count = typeof result.count === "number" ? result.count : 0;
      setSuccessMessage(`Seeding completed. ${count} tasks inserted.`);
      setConfirmText("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to seed tasks",
      );
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fefce8_0%,#fff7ed_40%,#ffffff_100%)] px-4 py-8 md:px-10">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-3xl border border-amber-200 bg-white p-6 shadow-[0_18px_70px_-30px_rgba(15,23,42,0.45)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
              Seed Manager
            </h1>
            <p className="mt-1 text-slate-600">
              Reseed backlog data in one controlled action.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/backlog"
              className="inline-flex w-fit items-center rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Backlog
            </Link>
            <Link
              to="/"
              className="inline-flex w-fit items-center rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Home
            </Link>
          </div>
        </div>

        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            Warning: This operation deletes all existing backlog data and
            inserts the seed data again.
          </p>
          <p className="mt-1">
            Type <span className="font-bold">{SEED_CONFIRM_TEXT}</span> to
            enable confirmation.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={SEED_CONFIRM_TEXT}
              className="min-w-60 rounded-lg border border-amber-300 bg-white px-3 py-2 outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding || confirmText !== SEED_CONFIRM_TEXT}
              className="rounded-lg bg-rose-600 px-3 py-2 font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSeeding ? "Seeding..." : "Confirm Delete and Seed"}
            </button>
          </div>
        </section>

        {errorMessage ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
};

export default SeedPage;
