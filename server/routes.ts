import express, { type Express } from "express";
import { createServer, type Server } from "http";
import http from "http";
import https from "https";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const curated = [
    {
      id: "asset-chart-summary",
      name: "Asset Chart Summary",
      path: path.join(os.homedir(), "Documents", "Assistants", "launch_app.bat"),
    },
    {
      id: "eps-dashboard",
      name: "EPS Dashboard",
      path: path.join(os.homedir(), "Documents", "RBM Dashboard", "run_all.bat"),
    },
    {
      id: "bin-tips-dashboard",
      name: "Bin TIps Dashboard",
      path: path.join(os.homedir(), "Documents", "Bin Tip Tons", "launch.bat"),
    },
    {
      id: "test-sheet",
      name: "Test Sheet",
      path: path.join(os.homedir(), "Documents", "TestSheet", "TestSheet", "start-dev.bat"),
    },
    {
      id: "nae-health-dashboard",
      name: "NAE HEalth Dashboard",
      path: path.join(
        os.homedir(),
        "Documents",
        "V3 Dashboard",
        "V2Dashboard",
        "DataTrackerPro_fixed_with_setup",
        "start-dashboard.bat",
      ),
    },
  ];

  await resolveMissingPaths(curated);

  const openOverrides: Record<string, string> = {
    "eps-dashboard": "http://192.168.1.194:3000/",
    "bin-tips-dashboard": "http://192.168.1.194:5080/",
    "test-sheet": "http://192.168.1.194:5173",
    "nae-health-dashboard": "http://192.168.1.194:4177/",
    "asset-chart-summary": "http://192.168.1.194:8080/",
  };

  const PUBLIC_HOST = process.env.PUBLIC_HOST || "192.168.1.194";

  for (const item of curated) {
    const dirPath = path.dirname(item.path);
    try {
      if (item.id === "bin-tips-dashboard") {
        app.get(`/dash/${item.id}/frontend/index.rewritten.html`, async (_req: any, res: any) => {
          try {
            const indexPath = path.join(dirPath, "frontend", "index.html");
            if (!fs.existsSync(indexPath)) {
              res.status(404).send("index.html not found");
              return;
            }
            const raw = await fs.promises.readFile(indexPath, "utf8");
            let rewritten = raw.replace(/(src|href)="\//g, `$1="/dash/${item.id}/`);
            const re = new RegExp(`src=\"/dash/${item.id}/app\\.js([^\"']*)?`, "g");
            rewritten = rewritten.replace(re, `src=\"/dash/${item.id}/frontend/app.js$1`);
            res.set("Content-Type", "text/html; charset=utf-8");
            res.send(rewritten);
          } catch {
            res.status(500).send("Failed to load index.html");
          }
        });
      }
      app.use(`/dash/${item.id}`, express.static(dirPath));
      const handler = async (_req: any, res: any) => {
        const indexHtml = path.join(dirPath, "index.html");
        const override = openOverrides[item.id];
        if (override) {
          res.redirect(override);
          return;
        }
        if (fs.existsSync(indexHtml)) {
          res.sendFile(indexHtml);
        } else {
          const port = await ensureAppPort(item.path);
          if (port > 0) {
            res.redirect(`http://${PUBLIC_HOST}:${port}/`);
          } else {
            res.status(200).send(renderInfoPage(item.name, dirPath));
          }
        }
      };
      app.get(`/dash/${item.id}`, handler);
      app.get(`/dash/${item.id}/`, handler);

      if (item.id === "bin-tips-dashboard") {
        app.get(`/dash/${item.id}/frontend/index.html`, async (_req: any, res: any) => {
          try {
            const indexPath = path.join(dirPath, "frontend", "index.html");
            if (!fs.existsSync(indexPath)) {
              res.status(404).send("index.html not found");
              return;
            }
            const raw = await fs.promises.readFile(indexPath, "utf8");
            const rewritten = raw
              .replace(/(src|href)="\//g, `$1="/dash/${item.id}/`);
            res.set("Content-Type", "text/html; charset=utf-8");
            res.send(rewritten);
          } catch {
            res.status(500).send("Failed to load index.html");
          }
        });
      }
    } catch { }
  }

  app.get("/dash/:id", async (req, res) => {
    const item = curated.find((x) => x.id === req.params.id);
    if (!item) {
      res.status(404).send("Unknown dashboard");
      return;
    }
    const dirPath = path.dirname(item.path);
    const indexHtml = path.join(dirPath, "index.html");
    const override = openOverrides[item.id];
    if (override) {
      res.redirect(override);
      return;
    }
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
      return;
    }
    try {
      const procs = await listProcesses();
      const related = getRelatedPids(item.path, procs);
      const listeners = await listListeningPorts();
      const found = listeners.find((l) => related.has(l.pid));
      const link = found ? `http://${PUBLIC_HOST}:${found.port}/` : undefined;
      if (link) {
        res.redirect(link);
      } else {
        res.status(200).send(renderInfoPage(item.name, dirPath));
      }
    } catch {
      res.status(200).send(renderInfoPage(item.name, dirPath));
    }
  });

  app.get("/api/dashboards", async (_req, res) => {
    try {
      const processes = await listProcesses();
      const listeners = await listListeningPorts();
      const dashboards = await Promise.all(
        curated.map(async (item, index) => {
          let lastPing = "Unknown";
          try {
            const stat = await fs.promises.stat(item.path);
            lastPing = timeAgo(stat.mtime);
          } catch { }

          const override = openOverrides[item.id];
          const related = getRelatedPids(item.path, processes);
          const found = listeners.find((l) => related.has(l.pid));
          const port = found ? found.port : 0;
          const openUrl = override || (port > 0 ? `http://${PUBLIC_HOST}:${port}/` : `/dash/${item.id}/`);
          let isActive: boolean;
          if (override && /^https?:\/\//i.test(override)) {
            const reachable = await isUrlReachable(override);
            isActive = reachable || port > 0 || isPathActive(item.path, processes);
          } else {
            isActive = port > 0 || isPathActive(item.path, processes);
          }

          return {
            id: item.id,
            name: item.name,
            description: item.path,
            url: openUrl,
            port,
            frontendStatus: isActive ? "online" : "offline",
            backendStatus: isActive ? "online" : "offline",
            lastPing,
            version: "unknown",
          };
        })
      );

      res.set("Cache-Control", "no-store");
      res.json(dashboards);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "Failed to read dashboards" });
    }
  });

  app.get("/api/dashboards/:id", async (req, res) => {
    try {
      const item = curated.find((x) => x.id === req.params.id);
      if (!item) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      let lastPing = "Unknown";
      try {
        const stat = await fs.promises.stat(item.path);
        lastPing = timeAgo(stat.mtime);
      } catch { }

      const processes = await listProcesses();
      const listeners = await listListeningPorts();
      const override = openOverrides[item.id];
      const related = getRelatedPids(item.path, processes);
      const found = listeners.find((l) => related.has(l.pid));
      const port = found ? found.port : 0;
      const isActive = override && /^https?:\/\//i.test(override)
        ? (await isUrlReachable(override)) || port > 0 || isPathActive(item.path, processes)
        : port > 0 || isPathActive(item.path, processes);
      const openUrl = override || (port > 0 ? `http://${PUBLIC_HOST}:${port}/` : `/dash/${item.id}/`);

      res.set("Cache-Control", "no-store");
      res.json({
        id: item.id,
        name: item.name,
        description: item.path,
        url: openUrl,
        port,
        frontendStatus: isActive ? "online" : "offline",
        backendStatus: isActive ? "online" : "offline",
        lastPing,
        version: "unknown",
      });
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "Failed to read dashboard" });
    }
  });

  app.post("/api/dashboards/:id/launch", async (req, res) => {
    try {
      const item = curated.find((x) => x.id === req.params.id);
      if (!item) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      const processes = await listProcesses();
      const isActive = isPathActive(item.path, processes);
      if (isActive) {
        activeLaunches.add(item.id);
        const port = await ensureAppPort(item.path, processes);
        const override = openOverrides[item.id];
        const url = override || (port > 0 ? `http://${PUBLIC_HOST}:${port}/` : `/dash/${item.id}/`);
        res.json({ ok: true, alreadyRunning: true, port, url });
        return;
      }
      await launchPath(item.path);
      activeLaunches.add(item.id);
      const port = await ensureAppPort(item.path);
      const override = openOverrides[item.id];
      const url = override || (port > 0 ? `http://${PUBLIC_HOST}:${port}/` : `/dash/${item.id}/`);
      res.json({ ok: true, alreadyRunning: false, port, url });
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "Failed to launch" });
    }
  });

  app.use("/strip/asset-chart-summary", (req, res) => {
    try {
      const pathSuffix = req.originalUrl.replace(/^[^?]*\/strip\/asset-chart-summary/, "") || "/";
      const opts: http.RequestOptions = {
        hostname: "192.168.1.194",
        port: 8080,
        path: pathSuffix,
        method: req.method,
        headers: req.headers,
      };
      const pr = http.request(opts, (prRes) => {
        res.status(prRes.statusCode || 502);
        const ct = String(prRes.headers["content-type"] || "");
        const shouldRewrite = /text|json|javascript|html|css/i.test(ct);
        if (shouldRewrite) {
          let body = "";
          prRes.on("data", (c) => (body += c.toString("utf8")));
          prRes.on("end", () => {
            const out = body.replace(/Service\s+Due/gi, "");
            Object.entries(prRes.headers).forEach(([k, v]) => {
              if (typeof v !== "undefined") res.setHeader(k, v as any);
            });
            res.send(out);
          });
        } else {
          Object.entries(prRes.headers).forEach(([k, v]) => {
            if (typeof v !== "undefined") res.setHeader(k, v as any);
          });
          prRes.pipe(res);
        }
      });
      pr.on("error", () => {
        res.status(502).send("Bad gateway");
      });
      if (req.readable) {
        req.pipe(pr);
      } else {
        pr.end();
      }
    } catch {
      res.status(500).send("Proxy error");
    }
  });

  app.get("/api/processes", async (_req, res) => {
    try {
      const procs = await listProcesses();
      const result = curated.map((item) => {
        const related = getRelatedPids(item.path, procs);
        const matches = procs.filter((p) => related.has(p.pid));
        return {
          id: item.id,
          name: item.name,
          processes: matches.map((m) => ({ pid: m.pid, name: m.name, cmd: m.cmd, exe: m.exe })),
        };
      });
      res.set("Cache-Control", "no-store");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "Failed to list processes" });
    }
  });

  function timeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  }

  async function isUrlReachable(urlStr: string): Promise<boolean> {
    try {
      const u = new URL(urlStr);
      const agent = u.protocol === "https:" ? https : http;
      return await new Promise<boolean>((resolve) => {
        const req = agent.request(
          {
            hostname: u.hostname,
            port: u.port ? Number(u.port) : (u.protocol === "https:" ? 443 : 80),
            path: u.pathname + (u.search || ""),
            method: "GET",
            timeout: 2000,
          },
          (resp) => {
            resolve((resp.statusCode || 0) >= 200 && (resp.statusCode || 0) < 400);
            resp.resume();
          },
        );
        req.on("timeout", () => {
          try { req.destroy(); } catch { }
          resolve(false);
        });
        req.on("error", () => resolve(false));
        req.end();
      });
    } catch {
      return false;
    }
  }

  function renderInfoPage(name: string, folder: string, httpLink?: string): string {
    const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeFolder = folder.replace(/\\/g, "/");
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeName}</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b0f13;color:#e5e7eb;margin:0;padding:2rem}
      .card{max-width:720px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:24px}
      h1{margin:0 0 8px;font-size:22px}
      p{margin:6px 0 14px;color:#9ca3af}
      .row{display:flex;gap:8px}
      .btn{background:#111827;border:1px solid #374151;color:#e5e7eb;padding:10px 12px;border-radius:8px;text-decoration:none}
      .btn:hover{background:#1f2937}
      code{background:#111827;border:1px solid #374151;border-radius:6px;padding:2px 6px}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${safeName}</h1>
      <p>No index.html found in <code>${safeFolder}</code>.</p>
      <div class="row">
        <a class="btn" href="/api/dashboards/${curated.find(c => c.path === folder)?.id || ''}/launch" target="_self">Launch</a>
        ${httpLink ? `<a class=\"btn\" href=\"${httpLink}\" target=\"_blank\">Open Web</a>` : ""}
      </div>
      <p>Launching opens the app window if available. Keep this tab open to return.</p>
    </div>
  </body>
</html>`;
  }

  async function listProcesses(): Promise<Array<{ pid: number; name: string; cmd: string; exe?: string; ppid?: number; title?: string }>> {
    return new Promise((resolve) => {
      const ps = execFile(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          "$procs = Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,ExecutablePath; $win = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object Id,MainWindowTitle; $map = @{}; foreach($w in $win){ $map[$w.Id] = $w.MainWindowTitle }; $procs | ForEach-Object { $_ | Add-Member -NotePropertyName MainWindowTitle -NotePropertyValue ($map[[int]$_.ProcessId]) -Force; $_ } | ConvertTo-Json -Compress",
        ],
        { windowsHide: true },
        (err, stdout) => {
          if (err || !stdout) return resolve([]);
          try {
            const raw = JSON.parse(stdout);
            const arr = Array.isArray(raw) ? raw : [raw];
            resolve(
              arr.map((p: any) => ({
                pid: Number(p.ProcessId || 0),
                name: String(p.Name || ""),
                cmd: String(p.CommandLine || ""),
                exe: p.ExecutablePath ? String(p.ExecutablePath) : undefined,
                ppid: p.ParentProcessId ? Number(p.ParentProcessId) : undefined,
                title: p.MainWindowTitle ? String(p.MainWindowTitle) : undefined,
              })),
            );
          } catch {
            resolve([]);
          }
        },
      );
      ps.stdin?.end();
    });
  }

  function isPathActive(
    filePath: string,
    procs: Array<{ pid: number; name: string; cmd: string; exe?: string; ppid?: number; title?: string }>,
  ): boolean {
    const lowerBack = filePath.toLowerCase();
    const lowerFwd = lowerBack.replace(/\\/g, "/");
    const dirBack = path.dirname(filePath).toLowerCase();
    const dirFwd = dirBack.replace(/\\/g, "/");
    const base = path.basename(filePath).toLowerCase();
    const nameToken = path.basename(base, path.extname(base)).replace(/[-_]/g, " ");

    return procs.some((p) => {
      const cmd = (p.cmd || "").toLowerCase();
      const exe = (p.exe || "").toLowerCase();
      const title = (p.title || "").toLowerCase();
      return (
        cmd.includes(lowerBack) ||
        cmd.includes(lowerFwd) ||
        cmd.includes(dirBack) ||
        cmd.includes(dirFwd) ||
        cmd.includes(base) ||
        exe.includes(lowerBack) ||
        exe.includes(dirBack) ||
        (title && (title.includes(nameToken) || title.includes(path.basename(dirBack))))
      );
    });
  }

  async function launchPath(p: string): Promise<void> {
    return new Promise((resolve) => {
      const quoted = `\"${p.replace(/"/g, '\\"')}\"`;
      const cwd = path.dirname(p).replace(/"/g, '\\"');
      const ps = execFile(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Start-Process -FilePath ${quoted} -WorkingDirectory \"${cwd}\" -WindowStyle Normal`
        ],
        { windowsHide: true },
        () => resolve(),
      );
      ps.stdin?.end();
    });
  }

  async function ensureAppPort(
    filePath: string,
    procsInitial?: Array<{ pid: number; name: string; cmd: string; exe?: string; ppid?: number }>,
  ): Promise<number> {
    let processes = procsInitial || (await listProcesses());
    let related = getRelatedPids(filePath, processes);
    let listeners = await listListeningPorts();
    let found = listeners.find((l) => related.has(l.pid));
    if (found) return found.port;

    const active = isPathActive(filePath, processes);
    if (!active) {
      try {
        await launchPath(filePath);
      } catch { }
    }

    const started = Date.now();
    const timeoutMs = 30000;
    while (Date.now() - started < timeoutMs) {
      processes = await listProcesses();
      related = getRelatedPids(filePath, processes);
      listeners = await listListeningPorts();
      found = listeners.find((l) => related.has(l.pid));
      if (found) return found.port;
      await new Promise((r) => setTimeout(r, 500));
    }
    return 0;
  }

  return httpServer;
}
const activeLaunches = new Set<string>();

async function resolveMissingPaths(list: Array<{ id: string; name: string; path: string }>): Promise<void> {
  for (const item of list) {
    if (item.id === "asset-chart-summary" || item.id === "eps-dashboard" || item.id === "bin-tips-dashboard") {
      continue;
    }
    if (!fs.existsSync(item.path)) {
      const found = await locateAlternatePath(item);
      if (found) {
        item.path = found;
      }
    }
  }
}

async function locateAlternatePath(item: { id: string; name: string; path: string }): Promise<string | undefined> {
  const docs = path.join(os.homedir(), "Documents");
  const basename = path.basename(item.path);
  const baseNoExt = basename.replace(/\.[^.]+$/, "");
  const tokens = Array.from(
    new Set(
      [
        ...item.id.split(/[-_\s]+/),
        ...item.name.split(/[-_\s]+/),
        baseNoExt,
      ]
        .map((t) => t.trim())
        .filter((t) => t.length >= 3),
    ),
  );

  const pattern = tokens.join(".*");
  const cmd = [
    "-NoProfile",
    "-Command",
    `Get-ChildItem -Path \"${docs}\" -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ieq \"${basename}\" -or ($_.Name -match \"${pattern}\" -and ($_.Extension -in @('.bat','.pyw','.ps1','.cmd'))) } | Select-Object -First 1 -ExpandProperty FullName`,
  ];

  return new Promise((resolve) => {
    const ps = execFile("powershell", cmd, { windowsHide: true }, (_err, stdout) => {
      const s = String(stdout || "").trim();
      resolve(s.length > 0 ? s : undefined);
    });
    ps.stdin?.end();
  });
}
function getRelatedPids(
  filePath: string,
  procs: Array<{ pid: number; name: string; cmd: string; exe?: string; ppid?: number }>,
): Set<number> {
  const lowerBack = filePath.toLowerCase();
  const lowerFwd = lowerBack.replace(/\\/g, "/");
  const dirBack = path.dirname(filePath).toLowerCase();
  const dirFwd = dirBack.replace(/\\/g, "/");
  const base = path.basename(filePath).toLowerCase();
  const matches = new Set<number>();

  for (const p of procs) {
    const cmd = (p.cmd || "").toLowerCase();
    const exe = (p.exe || "").toLowerCase();
    if (
      cmd.includes(lowerBack) ||
      cmd.includes(lowerFwd) ||
      cmd.includes(dirBack) ||
      cmd.includes(dirFwd) ||
      cmd.includes(base) ||
      exe.includes(lowerBack) ||
      exe.includes(dirBack)
    ) {
      matches.add(p.pid);
    }
  }

  let added = true;
  while (added) {
    added = false;
    for (const p of procs) {
      if (p.ppid && matches.has(p.ppid) && !matches.has(p.pid)) {
        matches.add(p.pid);
        added = true;
      }
    }
  }
  return matches;
}

async function listListeningPorts(): Promise<Array<{ port: number; pid: number }>> {
  return new Promise((resolve) => {
    const ps = execFile(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-NetTCPConnection -State Listen | Select-Object LocalPort, OwningProcess | ConvertTo-Json -Compress",
      ],
      { windowsHide: true },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        try {
          const raw = JSON.parse(stdout);
          const arr = Array.isArray(raw) ? raw : [raw];
          resolve(
            arr
              .map((p: any) => ({
                port: Number(p.LocalPort || 0),
                pid: Number(p.OwningProcess || 0),
              }))
              .filter((x) => x.port > 0 && x.pid > 0),
          );
        } catch {
          resolve([]);
        }
      },
    );
    ps.stdin?.end();
  });
}
