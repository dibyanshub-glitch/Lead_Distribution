"use client";
import { useState } from "react";

interface LogEntry {
  ts: string;
  msg: string;
  ok: boolean;
}

export default function TestToolsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const log = (msg: string, ok = true) => {
    setLogs((prev) => [{ ts: new Date().toLocaleTimeString(), msg, ok }, ...prev.slice(0, 49)]);
  };

  const callWebhook = async (times = 1) => {
    // Use same eventId to test idempotency when calling multiple times
    const eventId = `evt_${Date.now()}`;
    setLoading("webhook");

    for (let i = 0; i < times; i++) {
      try {
        const res = await fetch("/api/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId, // Same ID every time — only first call should take effect
            type: "PAYMENT_SUCCESS_RESET_QUOTA",
            payload: { customerId: "cust_test_123", plan: "pro" },
          }),
        });
        const data = await res.json();
        if (data.idempotent) {
          log(`Call ${i + 1}: ✓ Idempotent — Already processed, no changes. (eventId: ${eventId.slice(-8)})`, true);
        } else {
          log(`Call ${i + 1}: ✓ Quota reset successfully. (eventId: ${eventId.slice(-8)})`, true);
        }
      } catch {
        log(`Call ${i + 1}: ✗ Error calling webhook`, false);
      }
    }

    setLoading(null);
  };

  const generateBulkLeads = async () => {
    setLoading("bulk");
    log("Generating 10 leads concurrently...", true);

    try {
      const res = await fetch("/api/test-tools/bulk-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 10 }),
      });
      const data = await res.json();
      if (data.success) {
        log(`✓ Generated ${data.total} leads: ${data.succeeded} succeeded, ${data.failed} failed`, data.failed === 0);
        data.results.forEach((r: { leadId?: number; providers?: number[]; error?: string }, i: number) => {
          if (r.error) {
            log(`  Lead ${i + 1}: ✗ ${r.error}`, false);
          } else {
            log(`  Lead ${i + 1} (ID: ${r.leadId}): assigned to providers ${r.providers?.join(", ")}`, true);
          }
        });
      }
    } catch {
      log("✗ Failed to generate bulk leads", false);
    }

    setLoading(null);
  };

  const resetQuotaOnce = () => callWebhook(1);
  const callWebhookMultiple = () => callWebhook(5);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Test Tools</h1>
        <p className="text-white/40 text-sm">
          Simulate payment webhooks, test idempotency, and stress test concurrency.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8">
        <ToolCard
          title="Reset Provider Quota"
          description="Simulate a successful payment webhook. Resets all 8 providers' quotas back to 10. This is the ONLY way to reset quotas."
          badge="Webhook"
          badgeColor="indigo"
          action={
            <button
              onClick={resetQuotaOnce}
              disabled={loading !== null}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
            >
              {loading === "webhook" ? "Processing..." : "Reset Quota (1x)"}
            </button>
          }
        />

        <ToolCard
          title="Test Idempotency"
          description="Calls the quota reset webhook 5 times with the SAME event ID. Only the first call should apply changes. The remaining 4 should return 'already processed'."
          badge="Idempotency"
          badgeColor="amber"
          action={
            <button
              onClick={callWebhookMultiple}
              disabled={loading !== null}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
            >
              {loading === "webhook" ? "Processing..." : "Call Webhook 5× (Same ID)"}
            </button>
          }
        />

        <ToolCard
          title="Concurrency Stress Test"
          description="Creates 10 leads simultaneously using Promise.allSettled(). Tests that the database correctly handles race conditions with serializable transactions."
          badge="Concurrency"
          badgeColor="emerald"
          action={
            <button
              onClick={generateBulkLeads}
              disabled={loading !== null}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
            >
              {loading === "bulk" ? "Generating..." : "Generate 10 Leads Concurrently"}
            </button>
          }
        />
      </div>

      {/* Log Panel */}
      <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Activity Log</span>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="p-4 font-mono text-xs h-72 overflow-y-auto space-y-1.5">
          {logs.length === 0 && (
            <div className="text-white/20 text-center pt-8">No activity yet. Run a test above.</div>
          )}
          {logs.map((entry, i) => (
            <div key={i} className={`flex gap-3 ${entry.ok ? "text-emerald-400/80" : "text-red-400/80"}`}>
              <span className="text-white/20 shrink-0">{entry.ts}</span>
              <span>{entry.msg}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-white/3 border border-white/8 text-xs text-white/40 space-y-1">
        <p className="font-semibold text-white/60 mb-2">How Idempotency Works</p>
        <p>Each webhook call includes a unique <code className="text-indigo-300">eventId</code>. The server checks <code className="text-indigo-300">WebhookEvent</code> table before acting.</p>
        <p>If the eventId already exists → return cached response, no DB changes. This prevents duplicate quota resets if the payment gateway retries.</p>
      </div>
    </div>
  );
}

function ToolCard({
  title, description, badge, badgeColor, action
}: {
  title: string;
  description: string;
  badge: string;
  badgeColor: "indigo" | "amber" | "emerald";
  action: React.ReactNode;
}) {
  const colors = {
    indigo: "bg-indigo-500/10 text-indigo-300",
    amber: "bg-amber-500/10 text-amber-300",
    emerald: "bg-emerald-500/10 text-emerald-300",
  };

  return (
    <div className="p-5 rounded-xl border border-white/10 bg-white/3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="font-semibold text-sm">{title}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[badgeColor]}`}>{badge}</span>
          </div>
          <p className="text-white/40 text-xs leading-relaxed">{description}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}
