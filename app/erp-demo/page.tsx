import type { Metadata } from "next";
import { ErpDemo } from "./ErpDemo";

export const metadata: Metadata = { title: "Demo-ERP – Intrum partner-API (prototype)" };

export default function Page() {
  return <ErpDemo />;
}
