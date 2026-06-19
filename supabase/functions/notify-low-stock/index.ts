import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface NotifyPayload {
  product_id: string
  product_name: string
  status: "מעט" | "אין בכלל"
  quantity: number
  supplier?: string | null
  reported_by_name?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  "מעט": "מלאי מעט",
  "אין בכלל": "אין במלאי",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "Bar Adar <onboarding@resend.dev>"
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    if (!resendApiKey) {
      return json({ error: "RESEND_API_KEY is not configured" }, 500)
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401)
    }

    const payload = (await req.json()) as NotifyPayload

    if (!payload.product_name || !payload.status) {
      return json({ error: "Invalid payload" }, 400)
    }

    if (payload.status !== "מעט" && payload.status !== "אין בכלל") {
      return json({ error: "Notification only applies to low stock statuses" }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from("notification_log")
      .select("id")
      .eq("product_id", payload.product_id)
      .gte("created_at", fiveMinutesAgo)
      .limit(1)

    if (recent?.length) {
      return json({ success: true, sent: 0, skipped: true, reason: "duplicate" })
    }

    const { data: admins, error: adminsError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("role", "admin")

    if (adminsError) {
      return json({ error: adminsError.message }, 500)
    }

    if (!admins?.length) {
      return json({ error: "No admin recipients found" }, 404)
    }

    const statusLabel = STATUS_LABELS[payload.status] ?? payload.status
    const urgencyColor = payload.status === "אין בכלל" ? "#ef4444" : "#f59e0b"
    const subject = `🔔 בר אדר | ${statusLabel}: ${payload.product_name}`

    const html = buildEmailHtml({
      productName: payload.product_name,
      status: payload.status,
      statusLabel,
      quantity: payload.quantity,
      supplier: payload.supplier,
      reportedBy: payload.reported_by_name,
      urgencyColor,
    })

    const results = await Promise.allSettled(
      admins.map((admin) =>
        sendResendEmail(resendApiKey, fromEmail, admin.email, subject, html)
      ),
    )

    const sent = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    if (sent === 0) {
      return json({ error: "Failed to send all emails" }, 500)
    }

    await supabase.from("notification_log").insert({
      product_id: payload.product_id,
      product_name: payload.product_name,
      status: payload.status,
      quantity: payload.quantity,
      recipients_count: sent,
    })

    return json({ success: true, sent, failed })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return json({ error: message }, 500)
  }
})

function buildEmailHtml(opts: {
  productName: string
  status: string
  statusLabel: string
  quantity: number
  supplier?: string | null
  reportedBy?: string | null
  urgencyColor: string
}): string {
  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0c0f14;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0f14;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#151a22;border:1px solid #2a3344;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#1c2330;padding:24px;text-align:center;border-bottom:2px solid #c9a227;">
            <h1 style="margin:0;color:#c9a227;font-size:22px;">בר אדר</h1>
            <p style="margin:6px 0 0;color:#f5f0e6;opacity:0.7;font-size:13px;">התראת מלאי נמוך</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            <p style="margin:0 0 20px;color:#f5f0e6;font-size:15px;line-height:1.6;">
              דווח על מוצר שדורש תשומת לב במלאי:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c2330;border-radius:8px;border:1px solid #2a3344;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 12px;color:#f5f0e6;font-size:18px;font-weight:bold;">${escapeHtml(opts.productName)}</p>
                  <p style="margin:0 0 8px;color:${opts.urgencyColor};font-size:14px;font-weight:bold;">
                    סטטוס: ${escapeHtml(opts.statusLabel)} (${escapeHtml(opts.status)})
                  </p>
                  <p style="margin:0 0 8px;color:#f5f0e6;opacity:0.85;font-size:14px;">
                    כמות נדרשת: <strong>${opts.quantity}</strong>
                  </p>
                  ${opts.supplier ? `<p style="margin:0 0 8px;color:#f5f0e6;opacity:0.7;font-size:14px;">ספק: ${escapeHtml(opts.supplier)}</p>` : ""}
                  ${opts.reportedBy ? `<p style="margin:0;color:#f5f0e6;opacity:0.7;font-size:14px;">דווח ע"י: ${escapeHtml(opts.reportedBy)}</p>` : ""}
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#f5f0e6;opacity:0.5;font-size:12px;text-align:center;">
              ${now} · מערכת מלאי בר אדר
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendResendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend error (${response.status}): ${body}`)
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
