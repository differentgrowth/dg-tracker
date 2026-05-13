"use client";

import { useEffect, useState } from "react";

import { RiComputerLine, RiMoonLine, RiSunLine } from "@remixicon/react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggleButton() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const themePreference = mounted ? getThemePreference(theme) : "system";
  const nextTheme = getNextTheme(themePreference);
  const label = `Switch to ${themeLabels[nextTheme]} theme`;
  const Icon = themeIcons[themePreference];

  function onToggleTheme() {
    setTheme(nextTheme);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            disabled={!mounted}
            onClick={onToggleTheme}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <Icon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const themeCycle = ["system", "light", "dark"] as const;
type ThemePreference = (typeof themeCycle)[number];

const themeLabels: Record<ThemePreference, string> = {
  dark: "dark",
  light: "light",
  system: "system",
};

const themeIcons = {
  dark: RiMoonLine,
  light: RiSunLine,
  system: RiComputerLine,
} satisfies Record<ThemePreference, typeof RiComputerLine>;

function getThemePreference(theme: string | undefined): ThemePreference {
  if (theme === "light" || theme === "dark" || theme === "system") {
    return theme;
  }

  return "system";
}

function getNextTheme(theme: ThemePreference): ThemePreference {
  const currentIndex = themeCycle.indexOf(theme);
  return themeCycle[(currentIndex + 1) % themeCycle.length];
}
