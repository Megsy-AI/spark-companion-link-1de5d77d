import { supabase } from "@/integrations/supabase/client";
import {
  createTransaction,
  purchaseBattleItemForTelegram,
  purchaseServerForTelegram,
  verifyTonOnChain,
} from "./game-api";
import { forgetTonPayment, listPendingTonPayments } from "./ton-pending";

/**
 * Replays payments that were confirmed on-chain but never credited because the
 * mini app was closed while the wallet was signing.
 */
export const resumePendingTonPayments = async (args: {
  telegramId: number;
  profileId?: string | null;
  walletAddress?: string | null;
  onCredited?: (label: string) => void;
}) => {
  const pending = listPendingTonPayments();
  if (pending.length === 0) return;

  for (const payment of pending) {
    let verification: { verified: boolean; tx_hash?: string };
    try {
      verification = await verifyTonOnChain(payment.intentId, "", args.walletAddress ?? null);
    } catch {
      continue;
    }
    if (!verification.verified) continue;

    const txHash = verification.tx_hash ?? null;
    const meta = payment.metadata ?? {};
    try {
      switch (payment.action) {
        case "deposit":
          await createTransaction({
            telegramId: args.telegramId,
            type: "deposit",
            amount: payment.amountTon,
            currency: "ton",
            walletAddress: args.walletAddress,
            txHash,
          });
          args.onCredited?.(`Deposit of ${payment.amountTon} Gram credited`);
          break;
        case "wallet_verification":
          await createTransaction({
            telegramId: args.telegramId,
            type: "wallet_verification",
            amount: payment.amountTon,
            currency: "ton",
            walletAddress: args.walletAddress,
            txHash,
          });
          args.onCredited?.("Wallet verified");
          break;
        case "server":
        case "custom_server":
          if (typeof meta.serverId !== "string") break;
          await purchaseServerForTelegram({
            telegramId: args.telegramId,
            serverId: meta.serverId,
            tonPaid: payment.amountTon,
            walletAddress: args.walletAddress ?? undefined,
            txHash: txHash ?? undefined,
          });
          args.onCredited?.("Your server purchase is complete");
          break;
        case "battle_item":
          if (typeof meta.category !== "string" || typeof meta.packageKey !== "string") break;
          await purchaseBattleItemForTelegram({
            telegramId: args.telegramId,
            category: meta.category,
            packageKey: meta.packageKey,
            packageName: typeof meta.packageName === "string" ? meta.packageName : meta.packageKey,
            quantity: typeof meta.quantity === "number" ? meta.quantity : 1,
            tonPaid: payment.amountTon,
            walletAddress: args.walletAddress ?? undefined,
            txHash: txHash ?? undefined,
          });
          args.onCredited?.("Your battle items were added");
          break;
        case "ai_pro": {
          if (!args.profileId) continue;
          const { error } = await (supabase as any).rpc("ai_activate_plan", {
            _profile_id: args.profileId,
            _plan: "unlimited",
            _price: 0,
          });
          if (error) continue;
          args.onCredited?.("Nova AI Pro activated");
          break;
        }
      }
      forgetTonPayment(payment.intentId);
    } catch {
      /* keep it pending and retry on the next app start */
    }
  }
};
