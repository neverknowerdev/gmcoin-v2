"use client";

import { Download, LogOut } from "lucide-react";

interface ProfileActionsProps {
  onBackupWallet?: () => void;
  onLogOut?: () => void;
}

export function ProfileActions({
  onBackupWallet,
  onLogOut,
}: ProfileActionsProps) {
  return (
    <div className="px-4 mb-6 space-y-3">
      {/* Backup Wallet Button */}
      <button
        onClick={onBackupWallet}
        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-black px-5 py-4 text-white font-semibold hover:bg-gray-800 transition"
      >
        <Download className="h-5 w-5" />
        <span>Backup Wallet</span>
      </button>
      
      {/* Log Out Button */}
      <button
        onClick={onLogOut}
        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white border-2 border-gray-200 px-5 py-3 text-black font-semibold hover:bg-gray-50 transition"
      >
        <LogOut className="h-5 w-5" />
        <span>Log Out</span>
      </button>
    </div>
  );
}

