# LOOK2ME COLOR V7 · PC Web

需要 Node.js 22+。运行 `npm start` 并打开终端显示的本地地址。无密钥时也可以走完手动色彩档案、16 风格选择、规则配色、虚构示例、推荐与报告流程。

开启实时本人妆容需要有 API 额度与模型权限的 OpenAI 项目密钥。在托管站点将其配置为服务端 Secret `OPENAI_API_KEY`。本地用 `.env.example` 建立 `.env`。模型可选由 `OPENAI_TEXT_MODEL` 与 `OPENAI_IMAGE_MODEL` 覆盖。运行 `node --env-file-if-exists=.env tests/openai-image-edit-smoke-test.mjs`，确认返回 PNG。默认测试照是虚构人物。

执行 `node worker/build.mjs` 构建部署内容，`node --test tests/v7.test.mjs` 运行验证。测试上游响应为模拟数据。实际网络、权限和账号情况见 `docs/API_DIAGNOSTICS.md`，用户任务见 `docs/ACCEPTANCE.md`。原工作台保留在 `/legacy.html#studio`，旧版基线为 `99bd323`。
