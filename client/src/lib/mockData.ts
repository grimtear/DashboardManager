export type ServiceStatus = "online" | "offline" | "starting" | "error";

export interface DashboardApp {
  id: string;
  name: string;
  description: string;
  url: string;
  port: number;
  frontendStatus: ServiceStatus;
  backendStatus: ServiceStatus;
  lastPing: string;
  version: string;
}

export const mockApps: DashboardApp[] = [
  {
    id: "1",
    name: "Analytics Main",
    description: "Primary data visualization cluster and reporting engine.",
    url: "http://localhost:3000",
    port: 3000,
    frontendStatus: "online",
    backendStatus: "online",
    lastPing: "2ms ago",
    version: "v2.4.1"
  },
  {
    id: "2",
    name: "User Management",
    description: "Identity provider and role-based access control interfaces.",
    url: "http://localhost:3001",
    port: 3001,
    frontendStatus: "online",
    backendStatus: "starting",
    lastPing: "45s ago",
    version: "v1.8.0"
  },
  {
    id: "3",
    name: "Inventory System",
    description: "Real-time stock tracking and logistics management.",
    url: "http://localhost:3002",
    port: 3002,
    frontendStatus: "offline",
    backendStatus: "offline",
    lastPing: "Unknown",
    version: "v3.0.0-beta"
  },
  {
    id: "4",
    name: "Payment Gateway",
    description: "Transaction processing and financial reconciliation.",
    url: "http://localhost:3003",
    port: 3003,
    frontendStatus: "error",
    backendStatus: "online",
    lastPing: "120ms ago",
    version: "v2.1.5"
  },
  {
    id: "5",
    name: "DevOps Monitor",
    description: "CI/CD pipeline visualizer and server metrics.",
    url: "http://localhost:3004",
    port: 3004,
    frontendStatus: "online",
    backendStatus: "online",
    lastPing: "5ms ago",
    version: "v1.0.2"
  }
];