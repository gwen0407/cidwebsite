import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import TimeTracker from "./pages/TimeTracker";
import AdminPanel from "./pages/AdminPanel";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminTasks from "./pages/AdminTasks";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) { window.location.href = "/login"; return null; }
  if (user.role !== "admin") return <NotFound />;
  return <Component />;
}

function EmployeeRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) { window.location.href = "/login"; return null; }
  
  if (user.role !== "admin" && user.role !== "employee") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            Your account ({user.email}) is currently registered as a standard user. 
            To access the employee dashboard, an administrator must first add you as an employee.
          </p>
          <button 
            onClick={() => window.location.href = "/"}
            className="text-primary hover:underline"
          >
            Go back to home
          </button>
        </div>
      </div>
    );
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={() => <EmployeeRoute component={EmployeeDashboard} />} />
      <Route path="/dashboard/time" component={() => <EmployeeRoute component={TimeTracker} />} />
      <Route path="/admin" component={() => <AdminRoute component={AdminPanel} />} />
      <Route path="/admin/tasks" component={() => <AdminRoute component={AdminTasks} />} />
      <Route path="/admin/analytics" component={() => <AdminRoute component={AdminAnalytics} />} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
