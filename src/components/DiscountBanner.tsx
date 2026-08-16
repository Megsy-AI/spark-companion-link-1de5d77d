import { motion } from "framer-motion";
import { Crown, Loader2, Sparkles, Wand2 } from "lucide-react";
import type { PaymentDiscount } from "@/hooks/use-payment-discount";

const TIER_STYLES: Record<PaymentDiscount["tier"], string> = {
  none: "from-primary/30 via-accent/20 to-primary/30",
  bronze: "from-amber-700/40 via-amber-500/25 to-amber-700/40",
  silver: "from-slate-400/40 via-slate-200/25 to-slate-400/40",
  gold: "from-yellow-500/40 via-amber-300/25 to-yellow-500/40",
  diamond: "from-cyan-400/40 via-fuchsia-400/25 to-cyan-400/40",
};

interface Props {
  discount: PaymentDiscount;
  /** Asks the AI strategist for a personalised bonus on this surface. */
  onSmartOffer?: () => void;
  thinking?: boolean;
}

/** Shows the player's active discount, the AI personal offer and next-tier progress. */
const DiscountBanner = ({ discount, onSmartOffer, thinking }: Props) => {
  if (!discount) return null;
  const hasDiscount = discount.discount_pct > 0;
  const hasAi = discount.ai_bonus_pct > 0 && !!discount.ai_headline;

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

        {hasAi ? (
          <div className="mt-2.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="flex-1 font-display text-[11px] font-bold text-foreground">{discount.ai_headline}</p>
              <span className="rounded-md bg-primary/25 px-1.5 py-0.5 font-display text-[10px] font-bold text-primary">
                +{discount.ai_bonus_pct}% AI
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{discount.ai_message}</p>
            {discount.ai_expires_at && (
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">
                Expires {new Date(discount.ai_expires_at).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          onSmartOffer && (
            <button
              type="button"
              onClick={onSmartOffer}
              disabled={thinking}
              className="liquid-press mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 font-display text-[11px] font-bold text-primary disabled:opacity-60"
            >
              {thinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {thinking ? "AI is building your offer…" : "Get my AI personal offer"}
            </button>
          )
        )}
      </div>
    </motion.div>
  );
};

export default DiscountBanner;
