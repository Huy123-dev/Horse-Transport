import { createRoot } from "react-dom/client";
import App from "@/App";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import "@/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing application root element.");
}

createRoot(rootElement).render(
  <ThemeProvider>
    <App />
    <Toaster />
  </ThemeProvider>,
);
