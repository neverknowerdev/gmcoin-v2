import { MiniAppHome } from "@/components/home";
import { VerificationHandler } from "@/components/verification-handler";

export default function Home() {
  return (
    <main className="mx-auto max-w-md">
      <VerificationHandler />
      <MiniAppHome />
    </main>
  );
}
