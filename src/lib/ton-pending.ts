import type { TonPaymentAction } from "./ton";

/**
 * Inside Telegram the mini app is frequently killed while the user is signing in
 * Tonkeeper. When it comes back the JavaScript state (and the in-flight payment)
 * is gone, so the payment is never credited even though the money left the
 * wallet. We persist every payment we asked for and replay the verification the
 * next time the app opens.
 */
export type PendingTonPayment = {
  intentId: string;
  action: TonPaymentAction;
  amountTon: number;
  metadata: Record<string, unknown>;
  createdAt: number;
};

const KEY = "nova.ton.pending";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const read = (): PendingTonPayment[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as PendingTonPayment[]) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((p) => p?.intentId && Date.now() - (p.createdAt ?? 0) < MAX_AGE_MS);
  } catch {
    return [];
  }
};

const write = (list: PendingTonPayment[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-10)));
  } catch {
    /* storage unavailable */
  }
};

export const listPendingTonPayments = () => read();

export const rememberTonPayment = (payment: PendingTonPayment) => {
  const list = read().filter((p) => p.intentId !== payment.intentId);
  list.push(payment);
  write(list);
};

export const forgetTonPayment = (intentId: string) => {
  write(read().filter((p) => p.intentId !== intentId));
};
