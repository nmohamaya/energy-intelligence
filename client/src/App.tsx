import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/AppSidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Fleet from "@/pages/Fleet";
import Maintenance from "@/pages/Maintenance";
import DigitalTwin from "@/pages/DigitalTwin";
import Analytics from "@/pages/Analytics";
import AssetMap from "@/pages/Map";
import LoginPage from "@/pages/Login";
import { Loader2 } from "lucide-react";

function AppRouter() {
  return (
    <AppSidebar>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/fleet" component={Fleet} />
        <Route path="/maintenance" component={Maintenance} />
        <Route path="/digital-twin" component={DigitalTwin} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/map" component={AssetMap} />
        <Route component={NotFound} />
      </Switch>
    </AppSidebar>
  );
}

/**
 * Auth gate — decides whether to show the login page or the app.
 *
 * If isLoading: show a spinner (checking if the user has an active session)
 * If no user: show the login/register page
 * If user exists: show the full application
 */
function AuthSwitch() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <AuthProvider>
            <Router hook={useHashLocation}>
              <AuthSwitch />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
