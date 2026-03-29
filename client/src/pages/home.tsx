import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#c7f9cc_0%,#d8f3dc_35%,#f8fff9_65%)] px-6 py-14 md:px-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 rounded-3xl border border-emerald-100 bg-white/80 p-8 shadow-[0_20px_80px_-25px_rgba(0,0,0,0.25)] backdrop-blur md:p-12">
        <div className="space-y-4">
          <p className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-1 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Team Planning Hub
          </p>
          <h1 className="text-4xl font-black leading-tight text-slate-900 md:text-6xl">
            Build Better
            <span className="block text-emerald-700">Sprints with Clarity</span>
          </h1>
          <p className="max-w-2xl text-base text-slate-600 md:text-lg">
            Review priorities, track ownership, and get a complete view of your
            backlog health in one screen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/backlog"
            className="group inline-flex min-h-20 items-center justify-center rounded-2xl bg-emerald-600 px-12 py-6 text-2xl font-bold text-white shadow-[0_18px_40px_-20px_rgba(5,150,105,0.95)] transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-[0_24px_46px_-22px_rgba(5,150,105,0.9)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
          >
            Open Backlog
            <span className="ml-3 transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
