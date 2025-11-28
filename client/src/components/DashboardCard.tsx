import { DashboardApp, ServiceStatus } from "@/lib/mockData";
import { StatusIndicator } from "./StatusIndicator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Power, RefreshCw, Terminal, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";

interface DashboardCardProps {
  app: DashboardApp;
}

export function DashboardCard({ app }: DashboardCardProps) {
  const [localApp, setLocalApp] = useState(app);
  const [isLoading, setIsLoading] = useState(false);

  const toggleService = (type: 'frontend' | 'backend') => {
    setIsLoading(true);
    const currentStatus = type === 'frontend' ? localApp.frontendStatus : localApp.backendStatus;
    const newStatus: ServiceStatus = currentStatus === 'online' ? 'offline' : 'starting';
    
    // Immediate update to "starting" or "offline"
    setLocalApp(prev => ({
      ...prev,
      [type === 'frontend' ? 'frontendStatus' : 'backendStatus']: newStatus
    }));

    // Simulate process time if starting
    if (newStatus === 'starting') {
      setTimeout(() => {
        setLocalApp(prev => ({
          ...prev,
          [type === 'frontend' ? 'frontendStatus' : 'backendStatus']: 'online'
        }));
        setIsLoading(false);
      }, 2000);
    } else {
      setIsLoading(false);
    }
  };

  const handleLaunch = () => {
    window.open(app.url, '_blank');
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className="glass-panel p-6 flex flex-col h-full relative overflow-hidden group">
        {/* Decorative glow behind card */}
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />

        <div className="flex justify-between items-start mb-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg tracking-tight text-white">{app.name}</h3>
              <span className="text-[10px] font-mono text-white/40 border border-white/10 px-1 rounded">
                :{app.port}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-snug h-10 line-clamp-2">
              {app.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 my-6 z-10 bg-black/20 p-3 rounded-lg border border-white/5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Globe className="w-3 h-3" /> Frontend
            </div>
            <div className="flex items-center justify-between">
              <StatusIndicator status={localApp.frontendStatus} />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-white/10"
                onClick={() => toggleService('frontend')}
                disabled={isLoading}
              >
                <Power className={cn("w-3 h-3", localApp.frontendStatus === 'online' ? "text-primary" : "text-muted-foreground")} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-l border-white/5 pl-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Terminal className="w-3 h-3" /> Backend
            </div>
            <div className="flex items-center justify-between">
              <StatusIndicator status={localApp.backendStatus} />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-white/10"
                onClick={() => toggleService('backend')}
                disabled={isLoading}
              >
                <Power className={cn("w-3 h-3", localApp.backendStatus === 'online' ? "text-primary" : "text-muted-foreground")} />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between z-10 border-t border-white/5">
          <div className="text-xs font-mono text-white/30">
            Last Ping: <span className="text-white/50">{app.lastPing}</span>
          </div>
          <Button 
            className="group/btn relative overflow-hidden bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-primary/50 transition-all duration-300"
            onClick={handleLaunch}
          >
            <span className="relative z-10 flex items-center gap-2">
              Launch <ExternalLink className="w-3 h-3" />
            </span>
            <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}