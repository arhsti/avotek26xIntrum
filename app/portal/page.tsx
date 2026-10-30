import type { Metadata } from "next";
import { Portal } from "./Portal";

export const metadata: Metadata = { title: "Kundeportal – Intrum (prototype)" };

export default function Page() {
  return <Portal />;
}
