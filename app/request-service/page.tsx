"use client";
import { useState, useEffect } from "react";

interface Service {
  id: number;
  name: string;
}

export default function RequestServicePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", city: "", serviceId: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; providers?: string[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/seed", { method: "POST" })
      .then(() => fetch("/api/leads"))
      .then(async () => {
        const res = await fetch("/api/providers");
        const data = await res.json();
        // Extract services from providers data or fetch separately
        const svcRes = await fetch("/api/services");
        if (svcRes.ok) {
          const svcs = await svcRes.json();
          setServices(svcs);
        } else {
          setServices([{ id: 1, name: "Service 1" }, { id: 2, name: "Service 2" }, { id: 3, name: "Service 3" }]);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult({
          success: true,
          message: `Lead submitted successfully! Assigned to ${data.lead.assignedProviders.length} providers.`,
          providers: data.lead.assignedProviders,
        });
        setForm({ name: "", phone: "", city: "", serviceId: "", description: "" });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Request a Service</h1>
        <p className="text-white/40 text-sm">Fill in your details and we'll connect you with qualified providers.</p>
      </div>

      {result && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-emerald-400 font-medium text-sm mb-2">✓ {result.message}</p>
          {result.providers && (
            <div className="flex flex-wrap gap-2 mt-2">
              {result.providers.map((p) => (
                <span key={p} className="px-2 py-0.5 bg-emerald-500/10 rounded text-emerald-300 text-xs">{p}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">⚠ {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" required>
            <input
              className="input-field"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Phone Number" required>
            <input
              className="input-field"
              placeholder="9876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              maxLength={15}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="City" required>
            <input
              className="input-field"
              placeholder="Mumbai"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
          </Field>
          <Field label="Service Type" required>
            <select
              className="input-field"
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              required
            >
              <option value="">Select service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description" required>
          <textarea
            className="input-field resize-none h-24"
            placeholder="Describe your service requirement..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-sm"
        >
          {loading ? "Submitting..." : "Submit Enquiry"}
        </button>
      </form>

      <style jsx>{`
        :global(.input-field) {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.input-field:focus) {
          border-color: rgba(99,102,241,0.5);
          background: rgba(255,255,255,0.06);
        }
        :global(.input-field option) {
          background: #1a1a2e;
          color: white;
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1.5">
        {label}{required && <span className="text-indigo-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
