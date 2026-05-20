import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="mb-6 w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl">
        ⬡
      </div>
      <h1 className="text-4xl font-bold mb-3 tracking-tight">Prowider</h1>
      <p className="text-white/50 text-lg mb-8 max-w-md">
        A mini lead distribution system with fair allocation, real-time updates, and webhook safety.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/request-service"
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
        >
          Submit a Lead
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-medium transition-colors"
        >
          View Dashboard
        </Link>
        <Link
          href="/test-tools"
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-medium transition-colors"
        >
          Test Tools
        </Link>
      </div>
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full text-left">
        <FeatureCard icon="⚡" title="Fair Allocation" desc="Round-robin distribution persisted in DB, not memory. Survives server restarts." />
        <FeatureCard icon="🔒" title="Concurrency Safe" desc="Serializable transactions with SELECT FOR UPDATE prevent double-assignment." />
        <FeatureCard icon="🔄" title="Real-Time Updates" desc="Server-Sent Events push live dashboard updates without page refresh." />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/3 border border-white/8">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold mb-1 text-sm">{title}</div>
      <div className="text-white/40 text-xs leading-relaxed">{desc}</div>
    </div>
  );
}
