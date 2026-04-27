import AppLayout from "@/components/AppLayout";
import { NavItem } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BarChart2, ClipboardList, LayoutDashboard, Plus, Users, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const adminNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: ClipboardList, label: "All Tasks", path: "/admin/tasks" },
  { icon: BarChart2, label: "Analytics", path: "/admin/analytics" },
];

export default function AdminPanel() {
  return (
    <AppLayout navItems={adminNav} title="Admin Panel">
      <AdminContent />
    </AppLayout>
  );
}

function AdminContent() {
  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery();
  const utils = trpc.useUtils();

  // Add employee form
  const [empEmail, setEmpEmail] = useState("");
  const [empName, setEmpName] = useState("");
  const addEmployeeMutation = trpc.employees.add.useMutation({
    onSuccess: () => {
      setEmpEmail("");
      setEmpName("");
      utils.employees.list.invalidate();
      toast.success("Employee added successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Assign task form
  const [taskDesc, setTaskDesc] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const assignMutation = trpc.tasks.assign.useMutation({
    onSuccess: () => {
      setTaskDesc("");
      setSelectedEmpId("");
      toast.success("Task assigned successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Add shift form
  const [shiftEmpId, setShiftEmpId] = useState<string>("");
  const [shiftStartTime, setShiftStartTime] = useState("");
  const [shiftEndTime, setShiftEndTime] = useState("");
  const addShiftMutation = trpc.shifts.add.useMutation({
    onSuccess: () => {
      setShiftEmpId("");
      setShiftStartTime("");
      setShiftEndTime("");
      toast.success("Shift scheduled successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAddShift = () => {
    if (!shiftEmpId || !shiftStartTime || !shiftEndTime) return;
    const startDate = new Date(shiftStartTime);
    const endDate = new Date(shiftEndTime);
    if (endDate <= startDate) {
      toast.error("End time must be after start time");
      return;
    }
    addShiftMutation.mutate({
      employeeId: parseInt(shiftEmpId),
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
    });
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employees</span>
              <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold">{employees?.length ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">team members</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Add Employee */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-primary" />
              Add Employee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-name" className="text-sm font-medium">Full Name</Label>
              <Input
                id="emp-name"
                placeholder="Jane Smith"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="emp-email"
                type="email"
                placeholder="jane@example.com"
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                className="h-10"
              />
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => addEmployeeMutation.mutate({ email: empEmail, name: empName || undefined })}
              disabled={!empEmail || addEmployeeMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </CardContent>
        </Card>

        {/* Assign Task */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4.5 w-4.5 text-primary" />
              Assign Task
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Assign To</Label>
              <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.name || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc" className="text-sm font-medium">Task Description</Label>
              <Textarea
                id="task-desc"
                placeholder="Describe the task in detail..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="resize-none min-h-[80px]"
              />
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => assignMutation.mutate({ description: taskDesc, employeeId: parseInt(selectedEmpId) })}
              disabled={!taskDesc || !selectedEmpId || assignMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Assign Task
            </Button>
          </CardContent>
        </Card>

        {/* Schedule Shift */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-primary" />
              Schedule Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Employee</Label>
              <Select value={shiftEmpId} onValueChange={setShiftEmpId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.name || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shift-start" className="text-sm font-medium">Start Time</Label>
              <Input
                id="shift-start"
                type="datetime-local"
                value={shiftStartTime}
                onChange={(e) => setShiftStartTime(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shift-end" className="text-sm font-medium">End Time</Label>
              <Input
                id="shift-end"
                type="datetime-local"
                value={shiftEndTime}
                onChange={(e) => setShiftEndTime(e.target.value)}
                className="h-10"
              />
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleAddShift}
              disabled={!shiftEmpId || !shiftStartTime || !shiftEndTime || addShiftMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Schedule Shift
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-primary" />
            Employee Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {empLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : !employees || employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-sm">No employees yet</p>
              <p className="text-xs text-muted-foreground">Add your first team member above.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {employees.map((emp) => (
                <li key={emp.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {(emp.name || emp.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {emp.userId ? "Active" : "Pending"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
