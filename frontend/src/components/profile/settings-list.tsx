"use client";

import { Bell, Clock, Globe, Info, Lock, HelpCircle, ChevronRight } from "lucide-react";
import Image from "next/image";

interface SettingsItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onClick?: () => void;
}

interface SettingsListProps {
  notifications: boolean;
  onNotificationsToggle: (value: boolean) => void;
  onEpochHistory?: () => void;
  onLanguage?: () => void;
  onAbout?: () => void;
  onPrivacy?: () => void;
  onHelp?: () => void;
}

export function SettingsList({
  notifications,
  onNotificationsToggle,
  onEpochHistory,
  onLanguage,
  onAbout,
  onPrivacy,
  onHelp,
}: SettingsListProps) {
  const settings: SettingsItem[] = [
    {
      id: "notification",
      label: "Notification",
      icon: Bell,
      hasToggle: true,
      toggleValue: notifications,
      onToggle: onNotificationsToggle,
    },
    {
      id: "epoch-history",
      label: "Epoch History",
      icon: Clock,
      onClick: onEpochHistory,
    },
    {
      id: "language",
      label: "Language",
      icon: Globe,
      onClick: onLanguage,
    },
    {
      id: "about",
      label: "About GM",
      icon: Info,
      onClick: onAbout,
    },
    {
      id: "privacy",
      label: "Privacy and Security",
      icon: Lock,
      onClick: onPrivacy,
    },
    {
      id: "help",
      label: "Help / Support",
      icon: HelpCircle,
      onClick: onHelp,
    },
  ];

  return (
    <div className="px-4 mb-6">
      <h2
        className="text-xl font-bold text-black mb-4"
        style={{ fontFamily: "var(--font-anton), sans-serif" }}
      >
        Settings
      </h2>
      
      <div className="space-y-2">
        {settings.map((setting) => (
          <div
            key={setting.id}
            onClick={() => {
              if (setting.onClick && !setting.hasToggle) {
                setting.onClick();
              }
            }}
            className={`w-full flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-gray-100 transition ${
              !setting.hasToggle ? "hover:bg-gray-50 cursor-pointer" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <setting.icon className="h-5 w-5 text-black bg-gray-200 rounded-xl p-1" />
              <span className="text-base font-semibold text-black">
                {setting.label}
              </span>
            </div>
            
            {setting.hasToggle ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (setting.onToggle) {
                    setting.onToggle(!setting.toggleValue);
                  }
                }}
                className={`relative h-6 w-12 rounded-full transition ${
                  setting.toggleValue ? "bg-[#84D65B]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
                    setting.toggleValue ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

