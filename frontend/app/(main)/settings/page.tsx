"use client";

import { useEffect, useState } from "react";
import { SearchHeader } from "@/components/search-header";

const SETTINGS_KEY = "shopai-settings";

interface SettingsState {
  showGreeting: boolean;
  compactChat: boolean;
  showAiTips: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  showGreeting: true,
  compactChat: false,
  showAiTips: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings({
        showGreeting:
          typeof parsed.showGreeting === "boolean"
            ? parsed.showGreeting
            : DEFAULT_SETTINGS.showGreeting,
        compactChat:
          typeof parsed.compactChat === "boolean"
            ? parsed.compactChat
            : DEFAULT_SETTINGS.compactChat,
        showAiTips:
          typeof parsed.showAiTips === "boolean"
            ? parsed.showAiTips
            : DEFAULT_SETTINGS.showAiTips,
      });
    } catch {
      // Ignore malformed local storage data
    }
  }, []);

  function updateSetting<Key extends keyof SettingsState>(
    key: Key,
    value: SettingsState[Key],
  ) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <SearchHeader title="Settings" showGreeting />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Demo Preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These settings are saved locally in your browser for this demo
            session.
          </p>

          <div className="mt-6 space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Show greeting text</p>
                <p className="text-xs text-muted-foreground">
                  Keep friendly greeting banners visible across pages.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.showGreeting}
                onChange={(e) =>
                  updateSetting("showGreeting", e.target.checked)
                }
                className="size-4 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Compact chat layout</p>
                <p className="text-xs text-muted-foreground">
                  Use denser message spacing for presentation mode.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.compactChat}
                onChange={(e) =>
                  updateSetting("compactChat", e.target.checked)
                }
                className="size-4 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Show AI helper tips</p>
                <p className="text-xs text-muted-foreground">
                  Display hint text below inputs and controls.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.showAiTips}
                onChange={(e) =>
                  updateSetting("showAiTips", e.target.checked)
                }
                className="size-4 accent-primary"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
