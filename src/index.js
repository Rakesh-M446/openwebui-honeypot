/**
 * OpenWebUI 智能蜜罐 & 安全网关 
 *
 * 部署前置条件 (在 Cloudflare Dashboard 中设置):
 * 1. 环境变量 `UPSTREAM_URL`: 你的真实 OpenWebUI 后端地址。
 * - 例: `https://my-openwebui.example.com`
 * 2. 环境变量 `HONEYPOT_CONFIG`: JSON 字符串，定义恶意特征。
 * - 例: `{"malicious_uas": ["Go-http-client"], "malicious_asns": [12345]}`
 * 3. KV 命名空间绑定 `RATE_LIMITER_KV`: 用于存储 IP 限流数据。
 *
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 快速通道：如果不是目标 API，直接将请求转发到上游服务器
    if (url.pathname !== '/api/chat/completions' || request.method !== 'POST') {
      return forwardRequest(request, env.UPSTREAM_URL);
    }

    // --- 从这里开始，所有请求都是 POST /api/chat/completions ---

    const clientIP = request.headers.get('CF-Connecting-IP');

    // 2. 从环境变量加载蜜罐配置 
    let config = {};
    try {
      if (typeof env.HONEYPOT_CONFIG === 'string' && env.HONEYPOT_CONFIG) {
        config = JSON.parse(env.HONEYPOT_CONFIG);
      } else if (typeof env.HONEYPOT_CONFIG === 'object' && env.HONEYPOT_CONFIG !== null) {
        config = env.HONEYPOT_CONFIG;
      }
    } catch (e) {
      console.error("Failed to parse HONEYPOT_CONFIG environment variable:", e);
    }
    
    const maliciousUAs = config.malicious_uas || ['Go-http-client'];
    const maliciousASNs = config.malicious_asns || [];

    // 3. 多维度识别攻击者
    const userAgent = request.headers.get('User-Agent') || '';
    const clientASN = request.cf.asn;
    const isMaliciousUA = maliciousUAs.some(ua => userAgent.includes(ua));
    const isMaliciousASN = maliciousASNs.includes(clientASN);
    const isMaliciousBot = isMaliciousUA || isMaliciousASN;

    // 4. 如果是攻击者，进入蜜罐和限流逻辑
    if (isMaliciousBot) {
      //  只对识别出的攻击者进行限流
      const limit = 20;
      const key = `ip:${clientIP}`;
      try {
        const currentValue = await env.RATE_LIMITER_KV.get(key);
        const count = parseInt(currentValue || '0') + 1;

        if (count > limit) {
          return new Response(JSON.stringify({
            error: { message: "You are sending requests too frequently. Please slow down.", type: "rate_limit_exceeded" }
          }), {
            status: 429, headers: { 'Content-Type': 'application/json' },
          });
        }
        ctx.waitUntil(env.RATE_LIMITER_KV.put(key, count.toString(), { expirationTtl: 60 }));
      } catch (e) {
        console.error("KV operation failed:", e);
      }
      
      // --- 进入蜜罐逻辑 ---
      console.log(`HONEYPOT ACTIVATED! IP: ${clientIP}, ASN: ${clientASN}, UA: ${userAgent}`);
      await sleep(Math.random() * 1500 + 500);

      let responseData;
      try {
        const body = await request.json();
        if (body?.messages?.[0]?.content?.includes("你是谁")) {
          responseData = createWhoAreYouResponse();
        } else {
          const honeypotFunctions = [createDynamicCatFactResponse, createDefaultHoneypotResponse];
          const chosenHoneypot = honeypotFunctions[Math.floor(Math.random() * honeypotFunctions.length)];
          responseData = await chosenHoneypot();
        }
      } catch (e) {
        responseData = await createDynamicCatFactResponse();
      }

      return new Response(JSON.stringify(responseData), {
        status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // 5. 如果是正常用户，将请求正常转发到上游服务器
    return forwardRequest(request, env.UPSTREAM_URL);
  },
};

/**
 * 转发请求到上游服务器的辅助函数
 * @param {Request} request 原始请求
 * @param {string} upstreamUrl 上游服务器地址
 * @returns {Promise<Response>}
 */
async function forwardRequest(request, upstreamUrl) {
  if (!upstreamUrl) {
    return new Response("Upstream URL is not configured. Please set the UPSTREAM_URL environment variable.", { status: 502 });
  }
  const url = new URL(request.url);
  const upstreamRequestUrl = new URL(url.pathname + url.search, upstreamUrl);
  
  const newRequest = new Request(upstreamRequestUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow'
  });
  
  return fetch(newRequest);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function createDynamicCatFactResponse() {
  let content = "An interesting fact for you: ";
  try {
    const response = await fetch("https://catfact.ninja/fact", { headers: { 'Accept': 'application/json' } });
    if (response.ok) {
      const data = await response.json();
      content = data.fact + "\n\n(This information is provided for entertainment purposes.)";
    } else {
      content = "The cheetah is the only cat that can't retract its claws.";
    }
  } catch (error) {
    console.error("Failed to fetch from catfact.ninja:", error);
    content = "Cats have five toes on their front paws, but only four toes on their back paws.";
  }
  
  const promptTokens = Math.floor(Math.random() * 20) + 10;
  const completionTokens = content.length * 2;

  return {
    id: `chatcmpl-${generateRandomString(29)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "o3-pro-2025-06-10",
    choices: [{ index: 0, message: { role: "assistant", content: content }, finish_reason: "stop" }],
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
  };
}

function createWhoAreYouResponse() {
  return {
    id: `chatcmpl-${generateRandomString(29)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "o3-pro-2025-06-10",
    choices: [{ index: 0, message: { role: "assistant", content: "我是 ChatGPT，一个由 OpenAI 训练的大型语言模型。可以用中文或其他语言回答问题、提供信息、交流想法，帮助你解决问题或完成任务。有什么我可以帮你的吗？" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 8, completion_tokens: 63, total_tokens: 71 }
  };
}

function createDefaultHoneypotResponse() {
    const content = "1. How the two systems work in Alaska’s reality\n\nGas boiler \n• Fuel: delivered propane or (in the few places that have it) piped natural gas. \n• Combustion efficiency: 75 – 80 % for an older unit, 88 – 95 % for a modern condensing boiler. \n\nElectric resistance heaters \n• Site efficiency: 100 % (every kWh arriving at the meter becomes heat). \n• Whole-cycle efficiency: falls to 25–35 % once the diesel generation and 6-10 % line losses typical of rural micro-grids are included... [Content truncated for brevity]";
    const promptTokens = 125;
    const completionTokens = 2541;

    return {
        id: `chatcmpl-${generateRandomString(29)}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "o3-pro-2025-06-10",
        choices: [{ index: 0, message: { role: "assistant", content: content }, finish_reason: "stop" }],
        usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
    };
}