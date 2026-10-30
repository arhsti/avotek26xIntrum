import { submit } from "@/lib/onboarding";

export const maxDuration = 60;

// Strømmer fremdrift som NDJSON slik at kunden ser hvert automatiske steg
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of submit(id)) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }
      } catch (e) {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: (e as Error).message }) + "\n"));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
