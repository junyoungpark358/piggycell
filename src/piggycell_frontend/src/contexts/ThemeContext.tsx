import React, { createContext, useContext } from "react";
import { Theme } from "../styles/theme/types";
import { lightTheme } from "../styles/theme/tokens";

interface ThemeContextType {
  theme: Theme;
  // 향후 다크모드 지원을 위한 확장성
  setTheme?: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ThemeContext.Provider value={{ theme: lightTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
