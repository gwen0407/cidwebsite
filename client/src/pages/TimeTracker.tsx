import AppLayout from "@/components/AppLayout";
import { NavItem } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Clock, LayoutDashboard, Play, Square, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const employeeNav: NavItem[] = [
  { icon: LayoutDashboard, label: "My Tasks", path: "/dashboard" },
  { icon: Timer, label: "Time Tracker", path: "/dashboard/time" },
];

export default function TimeTracker() {
  return (
    <AppLayout navItems={employeeNav} title="Consider It Done">
      <TimeTrackerContent />
    </AppLayout>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatHours(h: number | null | undefined): string {
  if (h == null) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function TimeTrackerContent() {
  const [now, setNow] = useState(Date.now());
  const utils = trpc.useUtils();

  const { data: activeSession, isLoading: sessionLoading } = trpc.timeLogs.activeSession.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: logs, isLoading: logsLoading } = trpc.timeLogs.myLogs.useQuery();
  const { data: activeShift, isLoading: shiftLoading } = trpc.shifts.active.useQuery();

  const clockInMutation = trpc.timeLogs.clockIn.useMutation({
    onSuccess: () => {
      utils.timeLogs.activeSession.invalidate();
      utils.timeLogs.myLogs.invalidate();
      utils.shifts.active.invalidate();
      toast.success("Clocked in successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  const clockOutMutation = trpc.timeLogs.clockOut.useMutation({
    onSuccess: () => {
      utils.timeLogs.activeSession.invalidate();
      utils.timeLogs.myLogs.invalidate();
      utils.shifts.active.invalidate();
      toast.success("Clocked out. Session saved!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Live timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = activeSession ? now - activeSession.clockIn : 0;

  const totalHours = logs?.reduce((sum, l) => sum + (l.hoursWorked ?? 0), 0) ?? 0;

  if (sessionLoading || logsLoading || shiftLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Clock widget */}
      <Card className="border-border shadow-sm overflow-hidden">
        <div className="bg-primary px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 mb-4">
            <Clock className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="font-mono text-5xl font-bold text-primary-foreground tracking-wider mb-2">
            {activeSession ? formatDuration(elapsed) : "00:00:00"}
          </div>
          <p className="text-primary-foreground/70 text-sm">
            {activeSession
              ? `Session started at ${new Date(activeSession.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "No active session"}
          </p>
        </div>

        <CardContent className="p-6">
          <div className="flex gap-3 justify-center">
            {!activeSession ? (
              <Button
                size="lg"
                className="px-10 h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending || !activeShift}
                title={!activeShift ? "You can only clock in during your scheduled shift" : ""}
              >
                <Play className="h-4 w-4 fill-current" />
                Clock In
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                className="px-10 h-11 gap-2"
                onClick={() => clockOutMutation.mutate({ logId: activeSession.id })}
                disabled={clockOutMutation.isPending}
              >
                <Square className="h-4 w-4 fill-current" />
                Clock Out
              </Button>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{formatHours(totalHours)}</p>
              <p className="text-xs text-muted-foreground mt-1">Total hours logged</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{logs?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Sessions recorded</p>
            </div>
          </div>

          {!activeShift && !activeSession && (
            <div className="mt-6 pt-5 border-t border-border bg-amber-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <p className="text-sm text-amber-900 font-medium">No active shift scheduled</p>
              <p className="text-xs text-amber-700 mt-1">You can only clock in during your scheduled shift hours. Contact your admin to schedule a shift.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log history */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Timer className="h-4.5 w-4.5 text-primary" />
            Time Log History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                <Timer className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-sm">No sessions recorded yet</p>
              <p className="text-xs text-muted-foreground">Clock in to start tracking your time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Clock In</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Clock Out</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3.5 font-medium">
                        {new Date(log.clockIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {new Date(log.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {log.clockOut
                          ? new Date(log.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium">
                        {log.hoursWorked != null ? formatHours(log.hoursWorked) : (
                          <span className="text-muted-foreground">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {log.clockOut == null ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Completed</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
