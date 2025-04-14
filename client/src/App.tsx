import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/app-layout";
import TracePay from "@/pages/tracepay";
import PYView from "@/pages/pyview";
import { NetworkProvider } from "./lib/web3/NetworkContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <AppLayout>
          <Switch>
            <Route path="/" component={PYView} />
            <Route path="/pyview" component={PYView} />
            <Route path="/tracepay" component={TracePay} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
        <Toaster />
      </NetworkProvider>
    </QueryClientProvider>
  );
}

export default App;
