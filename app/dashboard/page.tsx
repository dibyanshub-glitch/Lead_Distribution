"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface LeadEntry {
  id: number;
  name: string;
  phone: string;
  city: string;
  service: string;
  assignedAt: string;
}

interface ProviderData {
  id: number;
  name: string;
  monthlyQuota: number;
  quotaUsed: number;
  quotaRemaining: number;
  leadsCount: number;
  leads: LeadEntry[];
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connected, setConnected] = useState(false);
  const [newLeadFlash, setNewLeadFlash] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      setProviders(data);
      setLastUpdated(new Date());
    } catch {
      console.error("Failed to fetch providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();

    // SSE for real-time updates
    const es = new EventSource("/api/dashboard-events");
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "NEW_LEAD" || data.type === "QUOTA_RESET") {
        fetchProviders();
        if (data.type === "NEW_LEAD" && data.providerIds) {
          setNewLeadFlash(data.providerIds);
          setTimeout(() => setNewLeadFlash([]), 3000);
        }
      }
    };

    return () => {
      es.close();
    };
  }, [fetchProviders]);

  const selectedProvider = selected !== null ? providers.find((p) => p.id === selected) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-white/30 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-0.5">Provider Dashboard</h1>
          <p className="text-white/30 text-sm">
            {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-xs text-white/40">{connected ? "Live" : "Disconnected"}</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Providers" value={providers.length} />
        <StatCard label="Total Leads" value={providers.reduce((s, p) => s + p.leadsCount, 0)} />
        <StatCard
          label="Avg Quota Used"
          value={`${Math.round(providers.reduce((s, p) => s + p.quotaUsed, 0) / (providers.length || 1))} / 10`}
        />
        <StatCard
          label="Providers Full"
          value={providers.filter((p) => p.quotaRemaining === 0).length}
          highlight
        />
      </div>

      {/* Provider grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {providers.map((p) => {
          const isFlashing = newLeadFlash.includes(p.id);
          const isSelected = selected === p.id;
          const fillPct = (p.quotaUsed / p.monthlyQuota) * 100;

          return (
            <button
              key={p.id}
              onClick={() => setSelected(isSelected ? null : p.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isFlashing
                  ? "border-indigo-400/60 bg-indigo-500/10 scale-[1.02]"
                  : isSelected
                  ? "border-indigo-500/40 bg-indigo-500/10"
                  : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white/70">{p.name}</span>
                {isFlashing && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full">NEW</span>
                )}
              </div>
              <div className="text-2xl font-bold mb-1">{p.leadsCount}</div>
              <div className="text-[11px] text-white/40 mb-3">leads assigned</div>

              {/* Quota bar */}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all ${
                    fillPct >= 100 ? "bg-red-400" : fillPct >= 70 ? "bg-amber-400" : "bg-indigo-400"
                  }`}
                  style={{ width: `${Math.min(fillPct, 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-white/35">
                {p.quotaRemaining} slots left
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedProvider && (
        <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <h2 className="font-semibold">{selectedProvider.name} — Assigned Leads</h2>
            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white text-sm">✕</button>
          </div>
          {selectedProvider.leads.length === 0 ? (
            <div className="py-10 text-center text-white/30 text-sm">No leads assigned yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-medium">ID</th>
                    <th className="text-left px-5 py-3 font-medium">Name</th>
                    <th className="text-left px-5 py-3 font-medium">Phone</th>
                    <th className="text-left px-5 py-3 font-medium">City</th>
                    <th className="text-left px-5 py-3 font-medium">Service</th>
                    <th className="text-left px-5 py-3 font-medium">Assigned At</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProvider.leads.map((lead, i) => (
                    <tr
                      key={lead.id}
                      className={`border-t border-white/5 hover:bg-white/3 ${i % 2 === 0 ? "" : "bg-white/1"}`}
                    >
                      <td className="px-5 py-3 text-white/40">#{lead.id}</td>
                      <td className="px-5 py-3 font-medium">{lead.name}</td>
                      <td className="px-5 py-3 text-white/60 font-mono text-xs">{lead.phone}</td>
                      <td className="px-5 py-3 text-white/60">{lead.city}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-300 rounded text-xs">
                          {lead.service}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-white/40 text-xs">
                        {new Date(lead.assignedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? "border-red-500/20 bg-red-500/5" : "border-white/8 bg-white/3"}`}>
      <div className={`text-2xl font-bold mb-0.5 ${highlight ? "text-red-400" : ""}`}>{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}
