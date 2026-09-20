# 2026-09-18 生产环境 AI 提供方配置

## 本次目标

让 `multi-site-analytics` 生产环境实际调用已配置的 OpenAI 兼容接口，不再因缺少环境变量退回固定本地规则。

## 修改范围

- Vercel 项目 `multi-site-analytics` 的 Production 环境变量。
- 未修改应用代码、页面样式、数据结构或数据同步逻辑。

## 调整内容

- 配置 `AI_BASE_URL=https://clclapi.com/v1`。
- 配置 `AI_MODEL=gpt-5.6-sol`。
- 配置 `AI_API_KEY`，日志与文档中不保存密钥内容。
- 重新发布生产部署，使新环境变量生效。

## 自检

- 从 Vercel 拉回生产环境配置，确认接口地址与模型名和本机配置一致，密钥存在。
- 确认 `multi-site-analytics.vercel.app` 已指向新部署。
- 真实请求 `POST /api/analysis` 返回 HTTP 200、`mode=ai`、2 条分析发现和 2 条行动建议。

## 遗留问题

- 当前提示词和输入数据结构仍偏基础；生产环境已使用 AI 接口不等于分析质量已经优化完成。
- 后续需要重做分析指标预处理、证据约束和输出质量校验。
