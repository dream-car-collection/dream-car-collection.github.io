# Adsterra 增量修复验收报告

验证日期：2026-10-11（Asia/Shanghai）。修改位于本地工作区，尚未部署。

**结论：代码接入修复和结构回归检查通过；真实广告填充、Adsterra 后台 request / impression 未确认。** 真实浏览器请求没有使用 route interception、fulfill、空 JS、假 iframe 或假素材。本自动化环境对官方入口返回 403，不能据此断言正常访客也会收到 403，也不能宣称全链路验收已通过。

1. **修改文件**

   | 文件 | 变更 |
   | --- | --- |
   | `config/adsterra.ts` | 集中保存四个官方入口及 Banner 参数 |
   | `config/integrations.ts` | 广告启用状态使用实际配置，不再由旧环境变量决定 |
   | `components/integrations/responsive-banner.tsx` | 在真实页面设置 `window.atOptions` 后直接注入官方脚本；互斥、防重、清理 |
   | `components/integrations/native-ad-client.tsx` | 官方属性、唯一 script/container、清理；移除超时删除 |
   | `components/integrations/social-bar.tsx` | 官方入口及 `data-cfasync="false"`、稳定实例标识 |
   | `components/integrations/ad-slot-status.ts`（新增） | 只观察显示状态，不删除 provider 内容 |
   | `app/globals.css` | 空白 UI 收起时保留真实广告内容的可显示性 |
   | `content/legal.ts` | 仅修改 Privacy 的 Adsterra 服务声明 |
   | `scripts/audit-seo.mjs` | 移除已删除 Banner 中间页的审计例外 |
   | `scripts/qa-adsterra.mjs`（新增） | 可重跑的真实网络及生命周期 QA，输出 JSON 和截图 |
   | `package.json` | 新增 `qa:ads`，没有新增依赖 |
   | `docs/adsterra-fix-report.md`（新增） | 本报告 |

   删除：`public/adsterra/banner-desktop.html`、`public/adsterra/banner-mobile.html`、`public/adsterra/frame-status.js`。

2. **删除/替换的错误入口**

   两个 Banner 的 `https://www.highrevenueformat.com/<key>/invoke.js` 已随中间页删除。Native 的 `https://pl31675044.profitableratecpmnetwork.com/57a0e4afcad84c59e38ca6ace4b65e6a/invoke.js` 和 Social 的 `https://pl31675045.profitableratecpmnetwork.com/c3/6f/00/c36f007ec75a28ac4f043cc5616b6947.js` 已替换。诊断脚本中保留旧域名匹配规则，以识别线上旧版本；它们不会加载广告。运行配置没有自造下游入口。

3–6. **最终官方 src**

   | 格式 | src |
   | --- | --- |
   | Desktop 728×90 | `https://bauval.org/22/939ec9ea4397bc6830aac8d12e33f5ae` |
   | Mobile 320×50 | `https://bauval.org/22/30d53fccfc4b6dd440b03328f431155f` |
   | Native | `https://bauval.org/21/57a0e4afcad84c59e38ca6ace4b65e6a` |
   | Social Bar | `https://bauval.org/14/c36f007ec75a28ac4f043cc5616b6947` |

   两个 Banner key、`format: 'iframe'`、宽高、`params: {}` 完全保持文档给出的值。Native container 为 `container-57a0e4afcad84c59e38ca6ace4b65e6a`，保留 `async="async"` 和 `data-cfasync="false"`。

7. **Social 属性**：已恢复 `data-cfasync="false"`，浏览器 DOM 验证通过。

8. **Banner 中间 iframe**：已删除全部 `/adsterra/banner-*.html` 及其包装层。客户端在广告所在页面的 DOM 内设置 `window.atOptions`，再加载对应的原始官方 src；不修改 provider 脚本，不改变广告位置，没有自设 sandbox、referrer 或广告运行文档。

9. **Desktop / Mobile 互斥**：每次页面初始化通过 `matchMedia('(min-width: 768px)')` 二选一，只创建一个稳定 ID 的脚本。当前页面访问期间固定选择，不因 resize 再发起广告请求；进入下一页时按当时的宽度选择。快速跨断点 resize 测试没有新请求或第二实例。

10. **Native 去重/清理**：稳定 script ID 和原始 container ID 双重防重。路由 effect 清理当前 script、container 及其内部 provider DOM，断开本组件观察器后再初始化新页。返回/前进各次页面访问均只有一个活动实例，没有累积旧节点。15 秒之后脚本和 container 仍保留。

11. **Social 全站一次**：继续由已有 Root Layout 挂载，使用唯一 `adsterra-social-bar` ID 防重，路由切换保留同一个 script。六次页面访问（含返回/前进）只有一次 Social 请求。整页刷新会开启新的文档生命周期。

12. **15 秒 kill 逻辑**：Banner 和 Native 的 15 秒删除均已移除。Native 不再设超时。Banner 的 45 秒 UI fallback 只取消空白预留和标签，保留 script、provider DOM 和观察器；后到的广告仍可显示。脚本错误同样只收起空白 UI，不会删除实例或永久封禁加载。观察器仅更新显示状态，不用属性扫描或定时轮询删除广告。

13. **CSP / Header**：项目没有自定义 CSP，也未新增 CSP 或宽泛通配放行。线上与本地文档响应均未出现 CSP、X-Frame-Options、COOP、COEP、CORP 或 Referrer-Policy header；浏览器日志未发现 CSP、mixed-content、CORS/COEP/COOP 或 `ERR_BLOCKED_BY_CLIENT` 错误。没有观察到重定向后的下游域名，因此没有新增域名放行。

14. **Privacy**：明确说明网站使用 Adsterra responsive banners、native ads 和 social bar。广告声明与已启用的实际配置一致；GA 原有声明保留。其他法律页和 Privacy 的元数据、标题、结构保持不变。

15. **Build / Type / Lint / SEO**

   | 检查 | 结果 |
   | --- | --- |
   | `npm run typecheck` | PASS |
   | `npm run lint` | PASS（包含新增 QA 脚本） |
   | `npm run build` | PASS，静态导出成功 |
   | `npm run validate` | PASS，首页和六个指南 |
   | `npm run audit:seo` | PASS，精确元数据、路由、导航、Schema、法律页、sitemap、robots、GA |
   | 修改前后基线比对 | PASS，14 个导出 HTML；除广告 DOM、构建资源 hash、获准的 Privacy 声明外，完整 DOM 和 GA/JSON-LD 相同；sitemap/robots 字节一致 |
   | 真实 Desktop / Mobile 结构 | PASS，正确入口互斥、Native/Social 单实例，无横向滚动，无 pageerror |
   | 真实 resize / route / back / forward | PASS，旧 DOM 清理、单实例、Social 同节点且仅请求一次 |
   | `git diff --check` | PASS |

   依赖已安装，本次没有引入依赖，因此未重新 install。项目没有 `npm test` 脚本。第一次 typecheck 与 build 并行时，build 清理 `.next/types` 导致 TS6053；build 完成后单独重新执行 typecheck 已通过，此失败不是源码类型错误。

16. **真实网络 QA**

   优先测试了 `https://dream-car-collection.github.io/` 的 1440px / 375px。线上仍运行修改前的下游入口，三个对应格式均返回 403、无重定向，未请求 `bauval.org`。线上 15 秒逻辑仍会删除 Banner / Native DOM；本地修改尚未发布，不能把线上旧版当作本次修复后的结果。

   随后使用构建输出的本机站点 `http://127.0.0.1:4173/`，真实加载官方远程脚本，未 mock：

   | Viewport | Desktop 次数 | Mobile 次数 | Native 次数 | Social 次数 | 初始/最终 HTTP | Redirect |
   | --- | ---: | ---: | ---: | ---: | --- | --- |
   | 1440px | 1 | 0 | 1 | 1 | 三个入口均 403 / 403 | 无；最终 URL 与官方 src 相同 |
   | 375px | 0 | 1 | 1 | 1 | 三个入口均 403 / 403 | 无；最终 URL 与官方 src 相同 |

   日志包含原始 URL、逐跳 URL/status/location、最终状态、失败原因、浏览器 loadingFailed、控制台和 pageerror。403 伴随 `net::ERR_ABORTED`，没有明确的 browser `blockedReason` 或 `corsErrorStatus`。两个尺寸均没有页面 JS 异常；provider JS 未成功取得，无法证明其内部执行正常。命令行另一次探测返回 200 空 JS，无重定向；此结果也没有被视作填充成功。

   **自动化环境无法验证填充。** 403 的具体原因尚未确认，可能涉及执行环境、访问来源或平台策略，需在部署后的普通浏览器和 Adsterra 后台核实。没有通过改变 provider URL 绕过 403。

   证据（本地 QA 产物，未入 Git）：

   - `output/playwright/production-1440.json`、`production-375.json`
   - `output/playwright/fixed-local-1440.json`、`fixed-local-375.json`
   - `output/playwright/fixed-local-lifecycle.json`
   - `output/playwright/seo-before.json`、`seo-regression.json`
   - `output/playwright/{production,fixed-local}-{1440,375}.png` 及 CLI 日志

   重跑：`npm run qa:ads -- https://dream-car-collection.github.io/ production`。本地重跑：先 serve `out/`，再执行 `npm run qa:ads -- http://127.0.0.1:4173/ fixed-local`。脚本依赖本机 Playwright CLI skill wrapper，可用 `ADSTERRA_PLAYWRIGHT_CLI` 指定已安装的 CLI 路径。退出状态只表示结构检查是否通过，不表示广告填充或后台计数成功。

17. **代码接入条件**：已实现官方 src/参数、真实页面 DOM 执行入口、viewport 互斥、实例防重、页面 DOM 清理、全局 Social、正常统计保留和保守 UI fallback。浏览器确认官方真实请求已发出。由于响应 403，尚不能确认第三方脚本后续执行、真实填充和后台计数，不能宣称 request / impression 已成功记录。

18. **剩余验收：发布后人工 DevTools / 后台验证**

   1. 用普通浏览器打开生产站，停用广告拦截器。DevTools → Network 开启 Preserve log、Disable cache；分别设为 1440px 和 375px 后完整刷新。
   2. 过滤 `bauval.org` 或四个 key，确认对应 Banner 一次、另一个 Banner 零次、Native/Social 各一次。查看每个入口的 Request URL、Status、Initiator、Referer，以及 30x 的 Location 和最终响应；若有 403 或 browser blocked，保存 HAR 和控制台错误。
   3. Elements 确认 Banner 在真实页执行、Native container 唯一且属性正确，Social 唯一并有 `data-cfasync="false"`。查看实际 iframe/素材，并给慢请求充分时间；即使未填充也确认组件没有删除仍加载的脚本。
   4. 切换页面并返回/前进，确认没有重复实例或 Social 重载；检查手机横向滚动及 Console 的 CSP、mixed-content、CORS/COEP/COOP、`ERR_BLOCKED_BY_CLIENT`、provider JS 异常。
   5. 在 Adsterra 后台选择此域名、相应广告单元、正确日期与后台时区，等待正常统计延迟后检查 request / impression。页面发出请求、HTTP 200 或显示 iframe 都不能单独证明后台已计数。

真实广告正常返回、后台产生数据仍待上述验证，本次没有用 mock 结果替代这一结论。
