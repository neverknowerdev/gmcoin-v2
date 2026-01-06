"use client";

import { useMemo } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  EthBalance,
  Identity,
  Name,
} from "@coinbase/onchainkit/identity";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import clsx from "clsx";

type WalletConnectionProps = {
  className?: string;
  variant?: "light" | "dark";
  fullWidth?: boolean;
};

function OnchainWalletButton({
  buttonClasses,
}: {
  buttonClasses: string;
}) {
  return (
    <Wallet className="w-full">
      <ConnectWallet
        className={buttonClasses}
        disconnectedLabel="Connect Wallet"
      >
        <Name className="text-sm" />
      </ConnectWallet>
      <WalletDropdown>
        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
          <Avatar />
          <Name />
          <Address />
          <EthBalance />
        </Identity>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  );
}

export function WalletConnection({
  className,
  variant = "dark",
  fullWidth = false,
}: WalletConnectionProps) {
  const { context } = useMiniKit();
  const isMiniApp = useMemo(() => Boolean(context), [context]);

  const buttonClasses = clsx(
    "rounded-2xl px-4 py-2 text-sm font-semibold transition-colors",
    fullWidth && "w-full justify-center",
    variant === "dark"
      ? "bg-black text-white hover:bg-neutral-900"
      : "bg-white text-black hover:bg-neutral-100"
  );

  return (
    <div className={clsx("flex items-center", fullWidth && "w-full", className)}>
      {isMiniApp ? (
        <OnchainWalletButton buttonClasses={buttonClasses} />
      ) : (
        <div className={clsx("w-full", !fullWidth && "max-w-xs")}>
          <DynamicWidget variant="modal" />
        </div>
      )}
    </div>
  );
}

