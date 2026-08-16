import { useEffect, useRef } from "react";
import { useTonAddress } from "@tonconnect/ui-react";
import { useApp } from "@/context/AppContext";
import { resumePendingTonPayments } from "@/lib/ton-fulfill";
import { toast } from "sonner";

/**
 * Credits payments that were confirmed on-chain while the mini app was closed.
 * Runs on app start and whenever Telegram brings the app back to the front.
 */
const TonPaymentRecovery = () => {
  const { user, refreshProfile } = useApp();
  const address = useTonAddress();
  const running = useRef(false);
  const telegramId = user?.telegramUser?.id;
  const profileId = (user as { profileId?: string })?.profileId;

  useEffect(() => {
    if (!telegramId) return;

    const run = async () => {
      if (running.current) return;
      running.current = true;
      let credited = false;
      try {
        await resumePendingTonPayments({
          telegramId,
          profileId,
          walletAddress: address || null,
          onCredited: (label) => {
            credited = true;
            toast.success(label);
          },
        });
        if (credited) await refreshProfile?.();
      } finally {
        running.current = false;
      }
    };

    void run();
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [telegramId, profileId, address, refreshProfile]);

  return null;
};

export default TonPaymentRecovery;
