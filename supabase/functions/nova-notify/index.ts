import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNotification, totalVariants, type NotificationTopic } from "../_shared/notification-texts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_HOURS = 4;
const APP_URL = "https://nova.megsyai.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN_HELLO") || Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!TOKEN) {
    return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const nowIso = new Date().toISOString();
  const cooldownIso = new Date(Date.now() - COOLDOWN_HOURS * 3600_000).toISOString();

  // Skip players who are currently mining (they get the AI copy instead).
  const { data: active } = await supabase
    .from("mining_sessions")
    .select("user_id")
    .gt("ends_at", nowIso);
  const mining = new Set((active || []).map((r: any) => r.user_id));

  const { data: recent } = await supabase
    .from("auto_notification_log")
    .select("profile_id")
    .gt("last_sent_at", cooldownIso);
  const recentlySent = new Set((recent || []).map((r: any) => r.profile_id));

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, telegram_id, first_name")
    .eq("is_banned", false)
    .limit(5000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targets = (profiles || []).filter(
    (p: any) => p.telegram_id && !recentlySent.has(p.id),
  );

  let sent = 0;
  let failed = 0;
  const CHUNK = 25;

  for (let i = 0; i < targets.length; i += CHUNK) {
    const chunk = targets.slice(i, i + CHUNK);
    const okRows: { profile_id: string; topic: string; last_sent_at: string }[] = [];

    await Promise.all(
      chunk.map(async (p: any) => {
        // Active miners hear about AI; idle miners hear about mining (50/50 mixed).
        const topic: NotificationTopic = mining.has(p.id)
          ? "ai"
          : Math.random() < 0.7
            ? "mining"
            : "ai";
        const text = buildNotification(topic, p.first_name);
        const buttonText = topic === "mining" ? "⛏️ Start Mining" : "🤖 Open Nova AI";
        const url = topic === "mining" ? APP_URL : `${APP_URL}/ai`;

        try {
          const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: p.telegram_id,
              text,
              parse_mode: "HTML",
              disable_web_page_preview: true,
              reply_markup: { inline_keyboard: [[{ text: buttonText, url }]] },
            }),
          });
          const json = await res.json();
          if (json.ok) {
            okRows.push({ profile_id: p.id, topic, last_sent_at: new Date().toISOString() });
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }),
    );

    if (okRows.length) {
      await supabase.from("auto_notification_log").upsert(
        okRows.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
        { onConflict: "profile_id" },
      );
      sent += okRows.length;
    }

    if (i + CHUNK < targets.length) await new Promise((r) => setTimeout(r, 1100));
  }

  return new Response(
    JSON.stringify({ ok: true, candidates: targets.length, sent, failed, variants: totalVariants() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
