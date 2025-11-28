import { mockApps } from "@/lib/mockData";
import { DashboardCard } from "@/components/DashboardCard";
import { motion } from "framer-motion";
import { Activity, Server, ShieldCheck, Cpu } from "lucide-react";
import generatedBackground from "@assets/generated_images/dark_abstract_cybernetic_grid_background.png";

export default function Dashboard() {
  const activeApps = mockApps.filter(app => app.frontendStatus === 'online').length;
  const totalApps = mockApps.length;
  
  return (
    <div className="min-h-screen bg-background text-foreground relative font-sans selection:bg-primary/30">
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${generatedBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'screen'
        }}
      />
      
      {/* Grid Overlay for Texture */}
      <div className="fixed inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-background/80 via-background/90 to-background pointer-events-none" />

      <div className="relative z-10 container mx-auto p-6 md:p-12 max-w-7xl">
        
        {/* Header Section */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_hsl(160_84%_39%)]" />
              <span className="font-mono text-xs text-primary tracking-[0.2em] uppercase">System Online</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold tracking-tighter text-white"
            >
              NEXUS <span className="text-white/20 font-light">CONTROL</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground mt-2 max-w-md"
            >
              Centralized dashboard orchestration and environment monitoring system.
            </motion.p>
          </div>

          {/* Global Stats */}
          <div className="flex gap-4">
            <StatCard label="Active Nodes" value={`${activeApps}/${totalApps}`} icon={Activity} delay={0.3} />
            <StatCard label="System Health" value="98.2%" icon={ShieldCheck} delay={0.4} />
            <StatCard label="CPU Load" value="24%" icon={Cpu} delay={0.5} />
          </div>
        </header>

        {/* Dashboard Grid */}
        <main>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Registered Environments
            </h2>
            <div className="text-xs font-mono text-muted-foreground">
              AUTO-REFRESH: ENABLED
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockApps.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index + 0.5 }}
              >
                <DashboardCard app={app} />
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, delay }: { label: string, value: string, icon: any, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4 min-w-[120px] backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-xl md:text-2xl font-mono font-bold text-white">{value}</div>
    </motion.div>
  );
}