/**
 * Cloudflare Worker — proxy trung gian giữa frontend (Cloudflare Pages) và
 * Apps Script Web App. Lý do cần proxy này: Apps Script Web App không cho
 * tự thêm header Access-Control-Allow-Origin, nên gọi thẳng từ trình duyệt
 * sẽ bị chặn CORS. Worker gọi Apps Script ở phía server (không bị CORS),
 * rồi trả kết quả về trình duyệt kèm header CORS phù hợp.
 *
 * Biến môi trường cần cấu hình trong wrangler.toml hoặc Cloudflare dashboard:
 *   APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXX/exec"
 */
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (!env.APPS_SCRIPT_URL) {
      return jsonError('Chưa cấu hình APPS_SCRIPT_URL trong Worker', 500);
    }

    try {
      const body = request.method === 'POST' ? await request.text() : null;
      const upstream = await fetch(env.APPS_SCRIPT_URL, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: body,
        redirect: 'follow', // Apps Script Web App trả 302 trước khi tới URL thật
      });

      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders()),
      });
    } catch (err) {
      return jsonError('Lỗi proxy: ' + err.message, 502);
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // TODO: giới hạn lại đúng domain Cloudflare Pages khi lên production
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders()),
  });
}
