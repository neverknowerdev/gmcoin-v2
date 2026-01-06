'use client';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { ReactNode } from 'react';

export function MiniKitContextProvider({ children }: { children: ReactNode }) {
  // MiniKitProvider doesn't need apiKey or chain props - those are handled by OnchainKitProvider
  return (
    <MiniKitProvider>
      {children}
    </MiniKitProvider>
  );
}

