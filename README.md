# OpenWebUI 智能蜜罐 & 安全网关

一个为 OpenWebUI 设计的 Cloudflare Worker 安全网关，用于识别和迷惑恶意请求、消耗其 Token，并保护你的后端服务。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/MeiTetsuH/openwebui-honeypot)

*(↑ 部署成功后，记得把上面的 YOUR_USERNAME 和 YOUR_REPOSITORY_NAME 换成你自己的！)*

---

## ✨ 功能特性

- **多维度威胁识别**: 通过 User-Agent 和 ASN（自治系统编号）精准识别恶意机器人和扫描器。
- **智能蜜罐**: 对恶意请求返回伪造的、消耗资源的响应，并随机从外部 API 获取内容，让蜜罐更难被识破。
- **IP 限流**: 对识别出的恶意 IP 进行请求频率限制，有效防止 DoS 攻击。
- **配置与代码分离**: 所有配置（黑名单、上游地址）均通过环境变量和 KV 存储管理，无需修改代码。
- **一键部署**: 通过 "Deploy to Cloudflare" 按钮，用户可以轻松将此项目部署到自己的账户。
- **保护隐私和 Token**: 拦截恶意请求，避免无效的 API 调用消耗你宝贵的 LLM Token。

## 🚀 部署

1.  点击上方的 "Deploy to Cloudflare" 按钮。
2.  授权 Cloudflare 访问你的 GitHub 仓库。
3.  在部署向导中，填写两个必要的环境变量：
    - `UPSTREAM_URL`: **必填**，你的 OpenWebUI 服务的真实、可公开访问的地址 (例如: `https://my-ollama-service.com`)。
    - `HONEYPOT_CONFIG`: **选填**，你可以根据需要调整 JSON 中的黑名单配置。默认已包含一份高质量的规则。
4.  点击“部署”，Cloudflare 将会自动创建 Worker 服务、KV 命名空间并完成所有配置。
5.  部署完成后，将你的域名指向这个新创建的 Worker 即可。

## ⚙️ 配置详解

### `UPSTREAM_URL`
你的真实 OpenWebUI 后端地址。所有正常用户的请求都会被安全地转发到这里。

### `HONEYPOT_CONFIG` (JSON 格式)
蜜罐的黑名单配置。
- `malicious_uas`: 恶意的 User-Agent 列表。最安全、最推荐的屏蔽方式。
- `malicious_asns`: 恶意的 ASN 列表。用于屏蔽某些已知的、充满机器人的服务商网络。**此为强力手段，可能有误伤，请谨慎使用。**
- `blocked_ips`: 恶意的 IP 地址列表。用于“定点清除”持续攻击的特定 IP。

## 📜 开源许可证

本项目采用 [MIT License](LICENSE) 开源。

---

*由 [MEItetsu] 创建，灵感和代码优化来自社区。*



# OpenWebUI Smart Honeypot & Security Gateway

A security gateway powered by Cloudflare Workers, designed to protect your OpenWebUI instance by identifying, rate-limiting, and decoying malicious bots to waste their API tokens.

[](https://deploy.workers.cloudflare.com/?url=https://github.com/MeiTetsuH/openwebui-honeypot)

*(↑ After deploying, remember to replace `YOUR_USERNAME` and `YOUR_REPOSITORY_NAME` above with your own\!)*

-----

## ✨ Features

  - **Multi-vector Threat Identification**: Precisely identifies malicious bots and scanners via User-Agent and ASN (Autonomous System Number).
  - **Smart Honeypot**: Returns fake, resource-intensive responses to malicious requests. It randomly fetches content from external APIs to make the honeypot harder to detect.
  - **IP Rate-Limiting**: Applies rate limiting to identified malicious IPs to effectively prevent DoS attacks.
  - **Configuration Decoupling**: All configurations (blocklists, upstream URL) are managed via environment variables and KV storage, so no code changes are needed.
  - **One-Click Deploy**: Easily deploy this project to your own Cloudflare account using the "Deploy to Cloudflare" button.
  - **Privacy & Token Protection**: Blocks malicious requests to prevent invalid API calls from consuming your valuable LLM tokens.

## 🚀 Deployment

1.  Click the "Deploy to Cloudflare" button above.
2.  Authorize Cloudflare to access your GitHub repository.
3.  In the deployment wizard, fill in the two required environment variables:
      - `UPSTREAM_URL`: **Required**. The real, publicly accessible URL of your OpenWebUI service (e.g., `https://my-ollama-service.com`).
      - `HONEYPOT_CONFIG`: **Optional**. You can customize the JSON blocklist configuration as needed. A high-quality default ruleset is already included.
4.  Click "Deploy". Cloudflare will automatically create the Worker, the KV namespace, and all necessary configurations.
5.  Once deployment is complete, point your domain to the newly created Worker.

## ⚙️ Configuration Details

### `UPSTREAM_URL`

Your real OpenWebUI backend URL. All legitimate user requests will be securely forwarded here.

### `HONEYPOT_CONFIG` (JSON format)

The honeypot's blocklist configuration.

  - `malicious_uas`: A list of malicious User-Agents. This is the safest and most recommended blocking method.
  - `malicious_asns`: A list of malicious ASNs. Used to block networks from providers known for hosting bots. **This is a powerful tool and may cause false positives. Use with caution.**
  - `blocked_ips`: A list of malicious IP addresses. Use this to "hard block" specific, persistent attackers.

## 📜 License

This project is open-sourced under the [MIT License](https://www.google.com/search?q=LICENSE).

-----

*Created by [MEItetsu], with inspiration and code optimizations from the community.*