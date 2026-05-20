import { EventEmitter } from "events";

// Global singleton event emitter for SSE broadcasting
const globalForEmitter = globalThis as unknown as {
  dashboardEmitter: EventEmitter | undefined;
};

if (!globalForEmitter.dashboardEmitter) {
  globalForEmitter.dashboardEmitter = new EventEmitter();
  globalForEmitter.dashboardEmitter.setMaxListeners(100);
}

export const dashboardEmitter = globalForEmitter.dashboardEmitter!;

export function emitDashboardUpdate(data: Record<string, unknown>) {
  dashboardEmitter.emit("update", data);
}
