// netlify/functions/ask-claude.mjs
// Server-side proxy to Anthropic's Claude API for the in-app "Ask TCA" assistant.
// Keeps the API key off the client and applies a system prompt that teaches Claude
// about the TCA HR Compliance System.
//
// Required env var: ANTHROPIC_API_KEY
// Optional env vars:
//   ASK_CLAUDE_MODEL          (default: claude-sonnet-4-5-20250929)
//   ASK_CLAUDE_MAX_TOKENS     (default: 1024)

const SYSTEM_PROMPT = `You are "TCA Assistant", a helpful in-app assistant for The Care Advantage HR Compliance System (app.thecareadvantage.com).

The app is used by care home managers and HR staff to track employees across these homes:
- DOM Care
- Maple Lodge
- Spring House
- Spring Lodge
- Dorothy Lodge
- Cambria

The main areas of the app are:
- Dashboard: per-home compliance summaries and overdue counts
- All Staff: full staff list with filters
- Onboarding: new starter checklist (CV, App Form, Interview, References, Offer Letter, Signed Contract, TB Cert, HMRC/Bank, NI proof, Passport, DBS, RTW, Visa, Qualifications)
- Training: training matrix
- Rota: shift planning
- Invoices: invoice tracking
- Admin: user roles and settings
- Audit Log: change history

Compliance status colours used in the staff table:
- Complete (green) — field is filled and valid
- Incomplete (amber) — partially filled or close to expiry
- Missing (red) — required field is empty
- N/A (grey) — not applicable for this staff member

How to help users:
1. Be concise, friendly and practical. Most users are busy managers.
2. When a user asks "how do I…", give clear step-by-step instructions referencing the actual tabs and buttons in the app.
3. If the user asks about specific staff data ("who's missing a DBS at Maple Lodge?"), explain how to find it using the existing filters — do NOT invent staff names or numbers. You do not have direct database access.
4. For rota questions, you can suggest scheduling principles (continuity of care, working time limits, leave coverage) but never auto-create or save a rota — always tell the user you've drafted a suggestion they should review.
5. If asked something outside the HR/care-home domain, politely redirect to what you can help with.
6. Never ask users for, or repeat, passwords, API keys, NI numbers, bank details, or DBS certificate numbers.
7. If you don't know, say so — don't guess.

Tone: warm, calm, professional. UK English spelling.`;

export default async (req, context) => {
    // CORS / preflight
    if (req.method === 'OPTIONS') {
          return new Response(null, {
                  status: 204,
                  headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type'
                  }
          });
    }

    if (req.method !== 'POST') {
          return json({ error: 'Method not allowed' }, 405);
    }

    const API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!API_KEY) {
          return json({ error: 'Server not configured: ANTHROPIC_API_KEY missing' }, 500);
    }

    const MODEL = process.env.ASK_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
    const MAX_TOKENS = parseInt(process.env.ASK_CLAUDE_MAX_TOKENS || '1024', 10);

    let body;
    try {
          body = await req.json();
    } catch (e) {
          return json({ error: 'Invalid JSON body' }, 400);
    }

    const messages = Array.isArray(body.messages) ? body.messages : null;
    const pageContext = body.pageContext || {};

    if (!messages || !messages.length) {
          return json({ error: 'messages array is required' }, 400);
    }

    // Defensive size limits
    if (messages.length > 40) {
          return json({ error: 'Conversation too long (max 40 turns)' }, 400);
    }
    for (const m of messages) {
          if (!m || typeof m.content !== 'string' || (m.role !== 'user' && m.role !== 'assistant')) {
                  return json({ error: 'Each message needs role (user|assistant) and string content' }, 400);
          }
          if (m.content.length > 8000) {
                  return json({ error: 'Message too long (max 8000 chars)' }, 400);
          }
    }

    // Build a small, sanitised context block to prepend to the first user message.
    const contextLines = [];
    if (pageContext.page) contextLines.push('Current page: ' + String(pageContext.page).slice(0, 60));
    if (pageContext.currentLoc) contextLines.push('Current home: ' + String(pageContext.currentLoc).slice(0, 60));
    if (pageContext.tab) contextLines.push('Active tab: ' + String(pageContext.tab).slice(0, 60));
    if (pageContext.staffCount != null) contextLines.push('Visible staff count: ' + String(pageContext.staffCount).slice(0, 20));

    const enrichedMessages = messages.map((m, idx) => {
          if (idx === 0 && m.role === 'user' && contextLines.length) {
                  return {
                            role: 'user',
                            content: '[Page context: ' + contextLines.join('; ') + ']\n\n' + m.content
                  };
          }
          return { role: m.role, content: m.content };
    });

    try {
          const r = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                            'x-api-key': API_KEY,
                            'anthropic-version': '2023-06-01',
                            'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                            model: MODEL,
                            max_tokens: MAX_TOKENS,
                            system: SYSTEM_PROMPT,
                            messages: enrichedMessages
                  })
          });

      const data = await r.json();
          if (!r.ok) {
                  return json({ error: 'Upstream error', status: r.status, detail: data }, 502);
          }

      const text = Array.isArray(data.content)
            ? data.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
              : '';

      return json({
              ok: true,
              reply: text,
              model: data.model || MODEL,
              stop_reason: data.stop_reason || null,
              usage: data.usage || null
      }, 200);
    } catch (e) {
          return json({ error: 'Request failed', detail: String(e && e.message || e) }, 500);
    }
};

function json(obj, status) {
    return new Response(JSON.stringify(obj), {
          status,
          headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
          }
    });
}
