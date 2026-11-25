export interface Env {
  GEMINI_API_KEY: string;
  XAH_API_KEY?: string;
  DAILY_LIMIT?: string;
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_KV?: KVNamespace;
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
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const limit = Math.max(1, Number(env.DAILY_LIMIT || 5));
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const quotaKey = `quota:${clientIp}:${getVnDateKey()}`;

    const currentUsed = env.RATE_LIMIT_KV
      ? Number((await env.RATE_LIMIT_KV.get(quotaKey)) || '0')
      : 0;

    // Cho phép kiểm tra số lượt còn lại trong ngày
    if (request.method === 'GET' && url.pathname === '/quota') {
      const remaining = Math.max(0, limit - currentUsed);
      return new Response(JSON.stringify({ limit, used: currentUsed, remaining }), {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Kiểm tra giới hạn lượt dùng miễn phí trong ngày
    if (currentUsed >= limit) {
      return new Response(
        JSON.stringify({
          code: 'DAILY_LIMIT_REACHED',
          error: `Bạn đã dùng hết ${limit} lượt AI miễn phí hôm nay. Hãy nhập Gemini API Key cá nhân để tiếp tục không giới hạn, hoặc quay lại vào ngày mai!`,
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

    // Route dự phòng Vision khi Google Gemini Free Tier bị 503 quá tải
    if (url.pathname === '/vision-fallback') {
      if (!env.XAH_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'Proxy chưa được cấu hình XAH_API_KEY cho Vision fallback.' }),
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

      const xahRes = await fetch('https://api.xah.io/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.XAH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'ngphatgi/gemini-3.8-flash',
          messages: [{ role: 'user', content: contentItems }],
          temperature: 0.3,
        }),
      });

      if (!xahRes.ok) {
        const errText = await xahRes.text();
        return new Response(errText, {
          status: xahRes.status,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const xahData: any = await xahRes.json();
      const outputText = xahData?.choices?.[0]?.message?.content || '';

      let nextUsed = currentUsed;
      if (outputText && env.RATE_LIMIT_KV) {
        nextUsed = currentUsed + 1;
        await env.RATE_LIMIT_KV.put(quotaKey, String(nextUsed), { expirationTtl: 86400 });
      }

      return new Response(JSON.stringify({ output_text: outputText }), {
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
