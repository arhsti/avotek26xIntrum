"use client";
import { useMemo, useState } from "react";
import { Button, ErrorBox, cx } from "../ui";

const TEST_USERS = [
  { id: "kari", name: "Kari Nordmann", note: "Daglig leder i de fleste testbedrifter" },
  { id: "ola", name: "Ola Hansen", note: "Styreleder / innehaver av ENK" },
  { id: "per", name: "Per Olsen", note: "Daglig leder i Bølgen Kafé AS" },
];

const WORDS = ["Blå", "Rask", "Stille", "Lys", "Varm", "Klar", "Grønn"];
const NOUNS = ["Fjord", "Ørn", "Bjørk", "Elv", "Tind", "Måke", "Bølge"];

/**
 * Simulert BankID-dialog. Ved innlogging velges en testbruker, slik man gjør i BankID preprod.
 */
export function BankIdModal({
  mode,
  signerName,
  documentTitle,
  onConfirm,
  onClose,
}: {
  mode: "login" | "sign";
  signerName?: string;
  documentTitle?: string;
  onConfirm: (personId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [personId, setPersonId] = useState(mode === "login" ? "" : "signer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reference = useMemo(
    () => `${WORDS[Math.floor(Math.random() * WORDS.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`,
    [],
  );
  const awaitingApp = Boolean(personId);
  const name = mode === "sign" ? signerName : TEST_USERS.find((u) => u.id === personId)?.name;

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(personId);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden animate-fade-up">
        <div className="bg-[#39134c] text-white px-5 py-4 flex items-center justify-between">
          <span className="font-bold tracking-tight text-lg">BankID</span>
          <span className="text-xs bg-white/15 rounded px-2 py-0.5">Simulert</span>
        </div>
        <div className="p-5 space-y-4">
          {!awaitingApp ? (
            <>
              <p className="text-sm text-ink-soft">Velg testbruker for innlogging hos Intrum:</p>
              <div className="space-y-2">
                {TEST_USERS.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setPersonId(u.id)}
                    className="w-full text-left rounded-xl ring-1 ring-black/10 px-4 py-3 hover:bg-brand-50 hover:ring-brand-400"
                  >
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-ink-soft">{u.note}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="text-sm text-ink-soft">
                  {mode === "login" ? "Logg inn hos Intrum Norge" : `Signer «${documentTitle}»`}
                </div>
                <div className="text-sm">
                  {mode === "sign" && signerName ? `Sendt til ${signerName}s BankID-app` : `Åpne BankID-appen, ${name}`}
                </div>
                <div className="text-xs text-ink-soft">Referanse</div>
                <div className="text-2xl font-semibold tracking-wide">{reference}</div>
              </div>
              <div className={cx("rounded-xl bg-brand-50 p-3 text-xs text-ink-soft", loading && "opacity-60")}>
                I en ekte løsning bekrefter brukeren i BankID-appen. Her trykker du på knappen for å simulere det.
              </div>
              <ErrorBox message={error} />
              <Button className="w-full" onClick={confirm} loading={loading}>
                {mode === "login" ? "Bekreft i appen (simulert)" : `Simuler at ${signerName ?? "du"} signerer`}
              </Button>
            </>
          )}
          <button onClick={onClose} disabled={loading} className="w-full text-sm text-ink-soft hover:text-ink py-1">
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
