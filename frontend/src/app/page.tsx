import HomePage from "./home/page";
import { VerificationHandler } from "@/components/verification-handler";
import { ChainWarning } from "@/components/chain-warning";

export default function Home() {
  return (
    <main className="mx-auto max-w-md">
      <ChainWarning />
      <VerificationHandler />
      <HomePage />
    </main>
  );
}
