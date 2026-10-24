"use client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/lib/theme";
import DataBoot from "@/components/DataBoot";
import AccessBoot from "@/components/AccessBoot";

export default function Providers({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DataBoot />
      <AccessBoot />
      {children}
    </ThemeProvider>
  );
}
