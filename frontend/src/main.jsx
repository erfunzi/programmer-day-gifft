import { toast } from "./lib/toast";
import { Toasts } from "./components/Toasts";
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import App from "./App";
import "./styles/tailwind.css";
import "./styles/style.css";
import "./styles/workspace.css";
const client = new QueryClient({
  queryCache: new QueryCache({onError: error => toast(error)}),
  mutationCache: new MutationCache({onError: error => toast(error)}),
  defaultOptions: {
    queries: { retry: false, staleTime: 60000, refetchOnWindowFocus: false },
  },
});
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <App />
      <Toasts />
    </QueryClientProvider>
  </React.StrictMode>,
);
