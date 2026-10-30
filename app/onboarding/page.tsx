import type { Metadata } from "next";
import { Wizard } from "@/components/wizard/Wizard";

export const metadata: Metadata = { title: "Bli kunde – Intrum (prototype)" };

export default function OnboardingPage() {
  return <Wizard />;
}
