import { MiniAppHome } from "@/components/home";
import { VerificationHandler } from "@/components/verification-handler";
import { VerificationDebug } from "@/components/verification-debug";
import { ChainWarning } from "@/components/chain-warning";

export default function Home() {
  return (
    <main className="mx-auto max-w-md">
      <ChainWarning />
      <VerificationHandler />
      <MiniAppHome />
      {process.env.NODE_ENV === "development" && <VerificationDebug />}
    </main>
  );
}
