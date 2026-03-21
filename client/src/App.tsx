import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Fleet from "@/pages/Fleet";
import Maintenance from "@/pages/Maintenance";
import DigitalTwin from "@/pages/DigitalTwin";
import Analytics from "@/pages/Analytics";
import AssetMap from "@/pages/Map";

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
