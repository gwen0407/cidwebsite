import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardList, Clock, LayoutDashboard, Timer, Play, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { NavItem } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

const employeeNav: NavItem[] = [
  { icon: LayoutDashboard, label: "My Tasks", path: "/dashboard" },
  { icon: Timer, label: "Time Tracker", path: "/dashboard/time" },
];

export default function EmployeeDashboard() {
  return (
    <AppLayout navItems={employeeNav} title="Consider It Done">
      <TasksContent />
    </AppLayout>
  );
}

function TasksContent() {
  const { data: tasks, isLoading, error } = trpc.tasks.myTasks.useQuery();
  const { data: activeSession } = trpc.timeLogs.activeSession.useQuery();
  const utils = trpc.useUtils();

  const clockInMutation = trpc.timeLogs.clockIn.useMutation({
    onSuccess: () => {
      toast.success("Clocked in successfully!");
      utils.timeLogs.activeSession.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const clockOutMutation = trpc.timeLogs.clockOut.useMutation({
    onSuccess: () => {
      toast.success("Clocked out successfully!");
      utils.timeLogs.activeSession.invalidate();
      utils.timeLogs.myLogs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [elapsed, setElapsed] = useState<string>("00:00:00");

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      const diff = Date.now() - activeSession.clockIn;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const completeMutation = trpc.tasks.complete.useMutation({
    onMutate: async ({ taskId }) => {
      await utils.tasks.myTasks.cancel();
      const prev = utils.tasks.myTasks.getData();
      utils.tasks.myTasks.setData(undefined, (old) =>
        old?.map((t) => t.id === taskId ? { ...t, status: "completed" as const, completedAt: new Date() } : t)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tasks.myTasks.setData(undefined, ctx.prev);
      toast.error("Failed to update task");
    },
    onSuccess: () => {
      toast.success("Task marked as complete!");
    },
    onSettled: () => {
      utils.tasks.myTasks.invalidate();
    },
  });

  const pending = tasks?.filter((t) => t.status === "pending") ?? [];
  const completed = tasks?.filter((t) => t.status === "completed") ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">
          {error.message.includes("Employee record not found")
            ? "Your account hasn't been linked to an employee profile yet. Please contact your administrator."
            : error.message.includes("active shift")
            ? "You do not have an active shift at this time. Please check your schedule."
            : "Failed to load tasks. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Clock In/Out Section */}
      <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${activeSession ? "bg-emerald-100 text-emerald-600 animate-pulse" : "bg-muted text-muted-foreground"}`}>
                <Timer className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{activeSession ? "Currently Working" : "Ready to Start?"}</h3>
                <p className="text-sm text-muted-foreground">
                  {activeSession 
                    ? `Started at ${new Date(activeSession.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : "Clock in to start tracking your time."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {activeSession && (
                <div className="text-2xl font-mono font-bold tracking-tighter tabular-nums">
                  {elapsed}
                </div>
              )}
              <Button 
                size="lg" 
                className={`h-12 px-8 font-bold shadow-md transition-all ${activeSession ? "bg-destructive hover:bg-destructive/90" : "bg-emerald-600 hover:bg-emerald-700"}`}
                onClick={() => {
                  if (activeSession) {
                    clockOutMutation.mutate({ logId: activeSession.id });
                  } else {
                    clockInMutation.mutate();
                  }
                }}
                disabled={clockInMutation.isPending || clockOutMutation.isPending}
              >
                {activeSession ? (
                  <><Square className="mr-2 h-4 w-4 fill-current" /> Clock Out</>
                ) : (
                  <><Play className="mr-2 h-4 w-4 fill-current" /> Clock In</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{pending.length}</p>
            <p className="text-xs text-muted-foreground mt-1">tasks awaiting action</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{completed.length}</p>
            <p className="text-xs text-muted-foreground mt-1">tasks finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="h-4.5 w-4.5 text-primary" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!tasks || tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-sm">No tasks assigned yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">Your tasks will appear here once your admin assigns them to you.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      task.status === "completed"
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-border bg-background"
                    }`}>
                      {task.status === "completed" && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium leading-snug ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {task.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {task.completedAt && ` · Completed ${new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {task.status === "completed" ? (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        Completed
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          Pending
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                          onClick={() => completeMutation.mutate({ taskId: task.id })}
                          disabled={completeMutation.isPending}
                        >
                          Mark Complete
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
