import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import type { PaymentDiscount } from "@/hooks/use-payment-discount";

const TIER_STYLES: Record<PaymentDiscount["tier"], string> = {
  none: "from-primary/30 via-accent/20 to-primary/30",
  bronze: "from-amber-700/40 via-amber-500/25 to-amber-700/40",
  silver: "from-slate-400/40 via-slate-200/25 to-slate-400/40",
  gold: "from-yellow-500/40 via-amber-300/25 to-yellow-500/40",
  diamond: "from-cyan-400/40 via-fuchsia-400/25 to-cyan-400/40",
};

/** Shows the player's active discount and how close they are to the next tier. */
const DiscountBanner = ({ discount }: { discount: PaymentDiscount }) => {
  if (!discount) return null;
  const hasDiscount = discount.discount_pct > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-r ${TIER_STYLES[discount.tier]} p-[1px]`}
    >
      <div className="glass rounded-2xl px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-background/40">
            {hasDiscount ? <Crown className="h-4 w-4 text-accent" /> : <Sparkles className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1">
            <p className="font-display text-xs font-bold text-foreground">
              {discount.first_purchase
                ? "First purchase — 20% OFF"
                : hasDiscount
                  ? `${discount.tier_label} member · ${discount.discount_pct}% OFF`
                  : "Unlock member discounts"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {discount.remaining_to_next_ton !== null && discount.next_tier_pct !== null
                ? `Spend ${discount.remaining_to_next_ton} more Gram to reach ${discount.next_tier_pct}% off forever`
                : "Max tier reached — best price on everything"}
            </p>
          </div>
          {hasDiscount && (
            <span className="rounded-lg bg-accent/20 px-2 py-1 font-display text-xs font-bold text-accent">
              -{discount.discount_pct}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DiscountBanner;
