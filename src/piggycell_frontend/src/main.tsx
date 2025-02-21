import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

const ThemedApp = () => {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: theme.colors.primary.main,
          colorBgContainer: theme.colors.background.paper,
          colorText: theme.colors.text.primary,
          colorTextSecondary: theme.colors.text.secondary,
          borderRadius: parseInt(theme.borderRadius.md),
          colorBorder: theme.colors.border.default,
        },
      }}
    >
      <App />
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>
);
