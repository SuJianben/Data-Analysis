# 2026年09月04日更新日志：Vercel 预览部署

## 本次目标

将 TKF Signal 本机数据分析面板部署到 Vercel，供他人查看当前真实数据。

## 修改范围

- Vercel 项目：`tkf-signal`
- 部署适配：`src/services/database/db.ts`
- Next.js 配置：`next.config.ts`
- 忽略规则：`.gitignore`
- 部署快照：`data/analytics-deploy.db`

## 调整内容

- 生成当前本机 SQLite 数据库的真实数据快照，作为 Vercel 初始展示数据。
- Vercel 运行时将快照复制到 `/tmp/tkf-signal/analytics.db` 读取，避免直接写入只读部署目录。
- 使用 Next.js `outputFileTracingIncludes` 确保快照被包含在服务端部署产物中。
- 保持 `.env.local`、`secrets/*.json` 等本机凭证文件不参与上传。
- Vercel 项目已关联到 `guage5751-3680s-projects/tkf-signal`。

## 部署地址

- 线上地址：<https://tkf-signal.vercel.app>
- Vercel 检查页：<https://vercel.com/guage5751-3680s-projects/tkf-signal/E4hsGoQ79dEHCXrLKTjS5UVoFRX5>

## 自检

- `/` 返回 200。
- `/menus` 返回 200，并能显示“主菜单”等真实数据字段。
- `/global-clicks` 返回 200，并能显示“商品卡片”等易读字段。
- `/api/health` 返回正常，数据库快照已成功读取。
- 未上传 OAuth、GA4、Clarity 或 AI 密钥。

## 遗留问题

- 当前 Vercel 版本展示的是部署时的真实数据快照；Vercel 临时文件系统不适合作为长期数据存储。
- 未在 Vercel 配置 GA4/OAuth/AI 密钥，因此线上同步不会自动更新本机数据；后续如需线上自动同步，应改用持久化数据库并单独配置受保护的环境变量。
