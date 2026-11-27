export interface Env {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
  XAH_API_KEY?: string;
  DAILY_LIMIT?: string;
  AUTH_DAILY_LIMIT?: string;
  FIREBASE_PROJECT_ID?: string;
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_KV?: KVNamespace;
}

interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
}

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let cachedJwks: { keys: JsonWebKey[]; expiresAt: number } | null = null;

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const padLen = (4 - (b64url.length % 4)) % 4;
  const base64 = (b64url + '='.repeat(padLen)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson(b64url: string): any {
  const bytes = base64UrlToUint8Array(b64url);
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function getFirebaseJwks(): Promise<JsonWebKey[]> {
  if (cachedJwks && Date.now() < cachedJwks.expiresAt) {
    return cachedJwks.keys;
  }
  const res = await fetch(JWKS_URL);
  if (!res.ok) return cachedJwks?.keys || [];
  const data: any = await res.json();
  const keys = Array.isArray(data?.keys) ? data.keys : [];
  cachedJwks = { keys, expiresAt: Date.now() + 3600 * 1000 };
  return keys;
}

async function verifyFirebaseToken(
  authHeader: string | null,
  projectId?: string,
): Promise<VerifiedFirebaseUser | null> {
  if (!authHeader || !projectId) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  const segments = token.split('.');
  if (segments.length !== 3) return null;

  try {
    const header = decodeBase64UrlJson(segments[0]);
    const payload = decodeBase64UrlJson(segments[1]);
    if (header?.alg !== 'RS256' || !header?.kid) return null;

    const nowSec = Math.floor(Date.now() / 1000);
    if (
      payload?.aud !== projectId ||
      payload?.iss !== `https://securetoken.google.com/${projectId}` ||
      typeof payload?.sub !== 'string' ||
      !payload.sub ||
      typeof payload?.exp !== 'number' ||
      payload.exp <= nowSec
    ) {
      return null;
    }

    const keys = await getFirebaseJwks();
    const jwk: any = keys.find((k: any) => k.kid === header.kid);
    if (!jwk) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const signingInput = new TextEncoder().encode(`${segments[0]}.${segments[1]}`);
    const signature = base64UrlToUint8Array(segments[2]);
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signature,
      signingInput,
    );
    if (!valid) return null;

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}

const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
]);

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const defaultOrigins = [
    'https://tyler-matrix221.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  const allowedList = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : defaultOrigins;

  const allowOrigin = allowedList.includes(origin) ? origin : allowedList[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining',
    Vary: 'Origin',
  };
}

function getVnDateKey(): string {
  // UTC+7 (Giờ Việt Nam) để reset lượt vào 00:00 mỗi ngày
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const verifiedUser = await verifyFirebaseToken(
      request.headers.get('Authorization'),
      env.FIREBASE_PROJECT_ID,
    );
    const guestLimit = Math.max(1, Number(env.DAILY_LIMIT || 5));
    const authLimit = Math.max(1, Number(env.AUTH_DAILY_LIMIT || 15));
    const limit = verifiedUser ? authLimit : guestLimit;
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const quotaKey = verifiedUser
      ? `quota:uid:${verifiedUser.uid}:${getVnDateKey()}`
      : `quota:${clientIp}:${getVnDateKey()}`;

    const currentUsed = env.RATE_LIMIT_KV
      ? Number((await env.RATE_LIMIT_KV.get(quotaKey)) || '0')
      : 0;

    // Cho phép kiểm tra số lượt còn lại trong ngày
    if (request.method === 'GET' && url.pathname === '/quota') {
      const remaining = Math.max(0, limit - currentUsed);
      return new Response(
        JSON.stringify({
          limit,
          used: currentUsed,
          remaining,
          authenticated: Boolean(verifiedUser),
        }),
        {
          status: 200,
          headers: {
            ...cors,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
          },
        },
      );
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Kiểm tra giới hạn lượt dùng miễn phí trong ngày
    if (currentUsed >= limit) {
      const limitMsg = verifiedUser
        ? `Tài khoản của bạn đã dùng hết ${limit} lượt AI miễn phí hôm nay. Hãy quay lại vào ngày mai hoặc nhập Gemini API Key cá nhân trong Cài đặt!`
        : `Bạn đã dùng hết ${limit} lượt dùng thử hôm nay. Đăng nhập Google để nhận ${authLimit} lượt/ngày, hoặc nhập Gemini API Key cá nhân!`;
      return new Response(
        JSON.stringify({
          code: 'DAILY_LIMIT_REACHED',
          error: limitMsg,
          limit,
          remaining: 0,
        }),
        {
          status: 429,
          headers: {
            ...cors,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    // Route riêng tạo ảnh người thật minh họa tư thế qua api.xah.io (gpt-image-1.5)
    if (url.pathname === '/image-gen') {
      if (!env.XAH_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'Proxy chưa được cấu hình XAH_API_KEY cho tính năng tạo ảnh mẫu.' }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
        );
      }

      let imgBody: { prompt?: string; size?: string };
      try {
        imgBody = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const prompt = typeof imgBody?.prompt === 'string' ? imgBody.prompt.trim().slice(0, 1200) : '';
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Thiếu mô tả ảnh.' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const allowedSizes = new Set(['1024x1024', '1024x1536', '1536x1024']);
      const size = imgBody.size && allowedSizes.has(imgBody.size) ? imgBody.size : '1024x1024';

      const xahRes = await fetch('https://api.xah.io/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.XAH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'daongocson12022004/gpt-image-1.5',
          prompt,
          n: 1,
          size,
        }),
      });

      const xahText = await xahRes.text();
      let nextUsed = currentUsed;
      if (xahRes.ok && env.RATE_LIMIT_KV) {
        nextUsed = currentUsed + 1;
        await env.RATE_LIMIT_KV.put(quotaKey, String(nextUsed), { expirationTtl: 86400 });
      }

      return new Response(xahText, {
        status: xahRes.status,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(Math.max(0, limit - nextUsed)),
        },
      });
    }

    // Route dự phòng Vision khi Google Gemini bị 503/429/quá tải hoặc chặn vùng:
    // Ưu tiên OpenAI gpt-4o-mini (OPENAI_API_KEY), nếu chưa cấu hình/lỗi mới dùng XAH_API_KEY
    if (url.pathname === '/vision-fallback') {
      if (!env.OPENAI_API_KEY && !env.XAH_API_KEY) {
        return new Response(
          JSON.stringify({
            error: 'Proxy chưa được cấu hình OPENAI_API_KEY hoặc XAH_API_KEY cho Vision fallback.',
          }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
        );
      }

      let fbBody: { payload?: { contents?: Array<{ parts?: Array<any> }> } };
      try {
        fbBody = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const parts = fbBody?.payload?.contents?.[0]?.parts;
      if (!Array.isArray(parts) || parts.length === 0) {
        return new Response(JSON.stringify({ error: 'Thiếu nội dung payload.' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const contentItems: any[] = [];
      for (const p of parts) {
        if (p?.inline_data?.data && p?.inline_data?.mime_type) {
          contentItems.push({
            type: 'image_url',
            image_url: {
              url: `data:${p.inline_data.mime_type};base64,${p.inline_data.data}`,
            },
          });
        } else if (typeof p?.text === 'string' && p.text.trim()) {
          contentItems.push({ type: 'text', text: p.text });
        }
      }

      let fallbackRes: Response | null = null;
      let providerUsed = 'openai';

      if (env.OPENAI_API_KEY) {
        fallbackRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: contentItems }],
            temperature: 0.4,
            response_format: { type: 'json_object' },
          }),
        });
      }

      if ((!fallbackRes || !fallbackRes.ok) && env.XAH_API_KEY) {
        providerUsed = 'xah';
        fallbackRes = await fetch('https://api.xah.io/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.XAH_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'ngphatgi/gemini-3.8-flash',
            messages: [{ role: 'user', content: contentItems }],
            temperature: 0.4,
          }),
        });
      }

      if (!fallbackRes || !fallbackRes.ok) {
        const errText = fallbackRes ? await fallbackRes.text() : 'Vision fallback failed';
        return new Response(errText, {
          status: fallbackRes?.status || 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const fbData: any = await fallbackRes.json();
      const outputText = fbData?.choices?.[0]?.message?.content || '';

      let nextUsed = currentUsed;
      if (outputText && env.RATE_LIMIT_KV) {
        nextUsed = currentUsed + 1;
        await env.RATE_LIMIT_KV.put(quotaKey, String(nextUsed), { expirationTtl: 86400 });
      }

      return new Response(JSON.stringify({ output_text: outputText, provider: providerUsed }), {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(Math.max(0, limit - nextUsed)),
        },
      });
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Proxy chưa được cấu hình GEMINI_API_KEY.' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    let body: { model?: string; payload?: unknown };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const model = body.model || 'gemini-2.5-flash';
    if (!ALLOWED_MODELS.has(model) || !body.payload) {
      return new Response(JSON.stringify({ error: 'Model hoặc payload không hợp lệ.' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      env.GEMINI_API_KEY,
    )}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body.payload),
    });

    const responseText = await geminiRes.text();

    let nextUsed = currentUsed;
    if (geminiRes.ok && env.RATE_LIMIT_KV) {
      nextUsed = currentUsed + 1;
      await env.RATE_LIMIT_KV.put(quotaKey, String(nextUsed), {
        expirationTtl: 86400,
      });
    }

    const remaining = Math.max(0, limit - nextUsed);

    return new Response(responseText, {
      status: geminiRes.status,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
      },
    });
  },
};
