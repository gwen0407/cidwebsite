import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useLocation } from "wouter";
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
import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Handle redirects with useEffect to avoid calling hooks after early returns
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Return loading state while redirect happens
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return <NotFound />;
  }

  return <Component />;
}

function EmployeeRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Handle redirects with useEffect to avoid calling hooks after early returns
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Return loading state while redirect happens
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

// ---------------------------------------------------------------------------
// Named Route Components to avoid anonymous component patterns
// ---------------------------------------------------------------------------

const DashboardRoute = () => <EmployeeRoute component={EmployeeDashboard} />;
const TimeTrackerRoute = () => <EmployeeRoute component={TimeTracker} />;
const AdminPanelRoute = () => <AdminRoute component={AdminPanel} />;
const AdminTasksRoute = () => <AdminRoute component={AdminTasks} />;
const AdminAnalyticsRoute = () => <AdminRoute component={AdminAnalytics} />;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={DashboardRoute} />
      <Route path="/dashboard/time" component={TimeTrackerRoute} />
      <Route path="/admin" component={AdminPanelRoute} />
      <Route path="/admin/tasks" component={AdminTasksRoute} />
      <Route path="/admin/analytics" component={AdminAnalyticsRoute} />
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
