# OpenAI API 验收记录

2026-11-17（Asia/Shanghai）。检查了本地 Node 和线上 Sites 环境。两处均未配置 OPENAI_API_KEY，OPENAI_TEXT_MODEL 与 OPENAI_IMAGE_MODEL 也未设置。

| 检查 | 结果 |
|---|---|
| 独立图片测试 | 脚本退出码 2，KEY_MISSING。按预期未发送任何照片 |
| 密钥有效性、项目和组织 | 无凭据，未验证 |
| 计费、额度、模型权限、组织验证 | 无凭据，未验证 |
| 网络 | 匿名 GET /v1/models 返回 HTTP 401，确认本地到官方端点可达。匿名错误不代表账户权限 |
| 图像请求 | POST https://api.openai.com/v1/images/edits，multipart，默认 gpt-image-2.6-sunburst |
| 视觉和结构化妆容 | POST https://api.openai.com/v1/responses，严格 JSON Schema，默认 gpt-5-mini |
| SDK | Node 原生 fetch，直接按官方 REST 接口，未引入 SDK |
| 输入 | 项目自有虚构成年人示例 WebP，真实 smoke 请求只在服务端密钥可用时发送 |
| 真实返回图 | 无，不能标为 READY |

在站点服务端把有图像编辑权限和 API 额度的项目密钥存为 Secret `OPENAI_API_KEY`。可选覆盖 `OPENAI_TEXT_MODEL` 和 `OPENAI_IMAGE_MODEL`。先用合成示例实际返回并打开图片，再用两套完整妆容与局部编辑验收。不要把钥匙写入网页或 Git。
