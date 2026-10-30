function mod11(digits: string, weights: number[]) {
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const r = 11 - (sum % 11);
  return r === 11 ? 0 : r;
}

export function isValidOrgNr(value: string) {
  const s = value.replace(/\s/g, "");
  if (!/^\d{9}$/.test(s)) return false;
  const c = mod11(s, [3, 2, 7, 6, 5, 4, 3, 2]);
  return c !== 10 && c === Number(s[8]);
}

export function isValidAccountNumber(value: string) {
  const s = value.replace(/[\s.]/g, "");
  if (!/^\d{11}$/.test(s)) return false;
  const c = mod11(s, [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]);
  return c !== 10 && c === Number(s[10]);
}

export const cleanDigits = (v: string) => v.replace(/\D/g, "");

export function formatOrgNr(v: string) {
  const s = cleanDigits(v);
  return s.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");
}

export function formatAccountNumber(v: string) {
  const s = cleanDigits(v);
  return s.replace(/^(\d{4})(\d{2})(\d{5})$/, "$1.$2.$3");
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const nok = (n: number) =>
  new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 2 }).format(n);
