# Cyber Camera — Code 识别

## 使用与默认行为

入口仍为 `/cyber-camera`。底部识别菜单包含「无识别模式 / YOLO识别 / Code识别」，三种模式互斥。默认无识别，不会启动扫码 Worker；Code 模式沿用内部值 `qrcode`，保留既有设置和历史的 localStorage 键，避免破坏旧数据。刷新页面仍从无识别模式开始，摄像头需用户主动开启。

设置顶部为「HUD 选项 / 识别类别 / Code 码制」。Code 页提供四个折叠分组，默认只展开 QR 家族。每组支持逐项选择、组内全选／取消与计数；总选区支持全部选择／取消和总计数。只有原来的四种 QR 格式默认选中，其余格式默认关闭。旧设置已有的 QR 选择（包括全部取消）照常保留。

扫描结果面板统一为 CODE SCANNER。仍支持当前画面多个实体码、本次唯一内容、选择与边框联动、双击／图标复制、保存、单条删除、刷新本次、历史删除／清空和 JSON／TXT 导出。当前实体码计数与本次唯一记录数分开显示。

同一码制与完整解码文本才会合并；不同码制编码相同文本保留为独立记录。空文本的二进制结果按码制与原始字节比较。保留首次时间，更新最近时间。手动删除或清空后，当前内容暂时忽略，确认消失约 1.5 秒后才允许重新加入；清空覆盖已在途的下一帧，不重启摄像头或 Worker，且保留永久历史。

## 实际能力

继续使用 `zxing-wasm@3.1.6`，没有新增依赖。所有选择值已对照安装包的 `READABLE_BARCODE_FORMATS` 校验，并传入实际 WASM 解码器。

| 分类 | 可选择的格式 | 样例验证 |
| --- | --- | --- |
| QR 家族（4 项） | Model 1、Model 2、Micro QR、rMQR | 官方 Model 1 样例；Model 2 Version 1–40 × L/M/Q/H；Micro M1–M4；rMQR M/H |
| 其他 2D（3 项） | Aztec、Data Matrix、PDF417 | 三项均通过实际生成样例解码和格式过滤测试 |
| 商品 1D（9 项） | EAN-8、EAN-13、UPC-A、UPC-E、DataBar Omni / Stacked / Limited / Expanded / Expanded Stacked | 九项均通过实际生成样例解码和格式过滤测试 |
| 工业／物流 1D（10 项） | Code 39、Code 39 Extended、Code 93、Code 128、Code 32、Codabar、ITF、Telepen、Telepen Numeric、PZN | 十项均通过实际生成样例解码和格式过滤测试 |

合计 26 项可用选项。Aztec 选择的是引擎的家族过滤器（包含 Code / Rune），PDF417 是其家族过滤器（包含 Compact / Micro 变体）；未把这些变体重复做成独立开关。常见样例通过不等于已逐一验证所有子变体。

MaxiCode 在第二组中显示为禁用，并明确说明原因：此 WASM reader 要求纯净、正向、无倾斜、带足够白边的单码图（isPure），没有普通实时视频的定位能力。本次不把它伪装成可用的实时扫描选项，也不把 isPure 施加给其他码制。

Model 1 / Model 2 的过滤器可独立生效；结果格式可能返回 QRCode 家族，继续依据 AIM 标识 ]Q0 与 ]Q1–]Q6 区分。其他格式保留引擎实际返回的格式及内容；例如标准 Code 39 可能返回 Code39，UPC 可能按引擎规则输出标准化数字，代码不自行截取、补位或改写内容。

商品条码的纯数字显示为「商品编码」，不推测商品名称，不补网址，也不会自动跳转。未知数据保留原始文本／字节。HTML 仅作为文本显示；只有显式 HTTP(S) 地址提供主动打开按钮。

参考：[zxing-wasm 格式与 MaxiCode 限制](https://github.com/Sec-ant/zxing-wasm)、[ReaderOptions](https://sec-ant.github.io/zxing-wasm/docs/interfaces/full.ReaderOptions.html)。

## 聚焦扫描

默认关闭。Code 页勾选「聚焦扫描模式」后，显示青色四角框与框外半透明遮罩；框内正常亮度。可选自动／方形／横向矩形，大小范围 40%–95%。自动模式在只选一维码时使用横框，否则使用方框。必须把完整条码及其留白放入框内；部分进入不保证解码。

实际流程：

1. 使用舞台的 CSS 像素尺寸计算框位置，给 HUD 顶部和底部结果／工具栏留出空间。
2. 根据 `max(stageWidth/videoWidth, stageHeight/videoHeight)` 反算 object-fit: cover 的缩放和裁剪偏移。镜像时先反算横向显示坐标。
3. `drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, ...)` 只复制该视频区域，并把其像素交给现有 Worker。框外像素没有进入解码器。
4. 解码四角先从裁剪图坐标恢复到完整视频归一化坐标，再映射到舞台；镜像预览的识别框也相应翻转。
5. ResizeObserver 监视舞台及工具区尺寸变化；布局发生变化时丢弃旧布局在途结果。全屏、窗口和面板布局变化后重新计算。CSS 坐标不乘 devicePixelRatio，因此高 DPI 不会把扫描区域放大一倍。

框内仍可同时解码多个目标。聚焦模式不会在首次成功时自动展开结果面板，以免改变取景范围；手动展开时使用固定高度、内部滚动，横屏使用更紧凑高度。关闭聚焦恢复全视频读取。拖动大小、切换形状、镜像和聚焦开关复用已加载的 Worker／WASM，通过布局代次丢弃旧帧，不反复初始化引擎。历史上曾在框内或全画面识别过的本次记录会保留；LIVE 和当前画面计数只反映本次实际扫描到的目标。

HUD 页新增「镜像摄像头画面」，默认关闭。预览、Code 框、YOLO 框和截图同步处理镜像。

## 高精度与“纠错百分比”

无法仅凭截图确定原专业应用百分比控件的具体含义；也不能把它认定为 QR 的标准纠错等级。安装包与官方 ReaderOptions 没有通用的 0%–100% 纠错接口。本次保留真实有效的两档，不添加未经验证的百分比映射。

- 标准（默认）：采样长边最多 1280 像素；默认 QR 配置下 tryHarder=false，保留旋转、反色和多尺度检测。勾选 Aztec 或 Data Matrix 时会自动启用 tryHarder，实际混合样例验证表明其充分定位搜索是必要的。
- 高精度：保留当前视频或聚焦裁剪区的原始像素；tryHarder=true、tryDenoise=true（二维形态学降噪），保留旋转、反色与多尺度；默认间隔从 250ms 提高至 650ms，并按耗时增加空闲间隔。

每帧只解码一次，无重复解码堆积。每次最多一个 Worker 任务。高精度不是成功率、可恢复损坏百分比，也不改变码本身已经编码好的纠错等级。设置中对此有说明。

## 生命周期与兼容

Code 与 YOLO 互斥，退出 Code、停摄像头或离开页面时停止调度并终止 Worker；代次检查阻止旧结果写回。模式切换不停止媒体轨道，也不重新申请相机权限，返回 Code 后保留本次会话。YOLO 的连接、检测循环、重连计时器和旧回调继续按前轮修复清理。

Worker 与约 947KB 的 WASM 仍随生产包部署到 `/static/assets/`，无第三方 CDN 解码请求。码制全部取消时暂停，而不是把空数组交给引擎（其空数组含义是扫描所有格式）。

旧的 `cyber-camera.qr.settings.v1` 与 `cyber-camera.qr.history.v1` 键沿用。旧 QR 配置只新增 focusEnabled=false、focusShape=auto、focusSize=70、mirrored=false 等默认字段，不默认启用新增格式。已有历史原样读取、查看、复制、导出。历史只保存在当前浏览器，可用导出备份；容量不足时显示错误。

Code 扫描本身不上传摄像头或内容；YOLO 模式仍使用原有服务。会话 Map 为避免重复保留已见内容的首次信息，直到用户清空／离开；显示条数仍受设置限制。

## 摄像头统一关闭流程

红色关闭按钮调用既有 stopCamera：先把识别模式恢复为 none，使同步监听立即停止 Code Worker、计时器并使旧结果失效；再停止 YOLO 检测／连接与重连，清空当前帧、目标数量、来源尺寸和菜单状态；最后解绑当前流监听、停止媒体轨道、暂停并清空 video.srcObject，清除旧检测画布。

Code 面板、聚焦层及 YOLO 状态／边框都依据 cameraActive（已开始播放且不在启动中）与当前模式显示。关闭期间不显示扫描结果面板；再次开启为无识别，不自动启动任何引擎。本次会话结果、设置和永久历史保留，只有主动选择 Code 后才重新显示。

镜头切换仍复用同一停止流程，但使用内部 forCameraSwitch 选项保留当前模式并重新获取镜头，避免切镜头退回无识别。普通关闭、退出页面、启动失败、当前媒体轨道 ended 或流 inactive 全部退出到 none。旧流事件在解绑之外还有流身份与摄像头代次检查，防止旧镜头晚到事件关闭新镜头；启动失败也走统一清理。

本轮关闭问题涉及：src/views/desktop/CyberCamera.vue（流程及派生 UI 状态）、src/composables/useQrScanner.js（停止状态禁止绘制）、tests/qrCamera.spec.mjs（关闭与竞争回归）、本说明及 dist/。移动入口已经共用桌面完整实现，无需复制另一套修复。Worker 原有的终止与结果代次校验继续复用。

## 本轮修改文件

- `src/services/qrScanner.js`：四组码制目录、配置兼容、按码制与内容去重、商品编码分类和标签。
- `src/services/codeGeometry.js`（新增）：聚焦框、cover／镜像反变换、坐标恢复和真实 reader 参数。
- `src/services/qrScanner.worker.js`、`src/services/qrWorkerClient.js`：多码制 reader 参数及 Code 错误提示。
- `src/composables/useQrScanner.js`：聚焦裁剪、布局监测、结果坐标恢复、镜像绘制及状态名称。
- `src/components/camera/CameraSettings.vue`：四类折叠、组内／全局选择、聚焦及高级识别设置。
- `src/components/camera/CodeFocusOverlay.vue`（新增）：聚焦框和遮罩。
- `src/components/camera/QrResultsPanel.vue`：Code 名称、标签与历史导出文件名。
- `src/views/desktop/CyberCamera.vue`：Code 模式菜单／HUD、聚焦层、镜像预览／YOLO 框／截图；移动入口继续共用。
- `tests/qrScanner.test.mjs`、`tests/qrCamera.spec.mjs`、`tests/qrFixtures.mjs`：扩展实际格式与聚焦测试。
- `QR_CAMERA.md`、`../dist/`：说明与生产构建。保留旧内部文件名，避免无必要的迁移。

## 验证命令

在 frontend 目录：

```powershell
npm run test:qr
npm run build
npx playwright install chromium
npm run test:qr:browser
```

已有 Chromium 可用 QR_TEST_BROWSER 指定可执行文件。浏览器测试会启动 localhost:5179，生产包测试另开临时端口模拟 /static/ 部署；需先 build。

当前验证：

- Node 16 项测试通过：新目录均在实际 API 枚举内、旧配置默认值、26 项格式真实样例（原 QR 4 种及新增 22 项）、过滤器、六种 1D/2D 混合读取、不同码制同内容去重、聚焦 cover／镜像数学换算与原有删除／清空／30 秒逻辑／安全回归。
- Playwright 全部 12 项通过（原有 10 项，加桌面／移动关闭流程回归）：四类分组默认展开状态、全局与组内选择、禁用 MaxiCode、六种混合条码真实读取、仅选 EAN-13 后其他格式停止识别、数字商品编码不提供 URL、旧 QR 配置和历史兼容。聚焦用例验证桌面框内多个二维码、框外内容不加入、手机竖屏高 DPI 镜像、横屏，以及关闭聚焦恢复全画面。原有 30 秒去重、删除／清空、复制／保存／导出、模式互斥、镜头／全屏和错误处理均保留回归。摄像头使用测试画布视频流，Code 使用真实 WASM，YOLO 传输端使用测试桩。
- 关闭专项在桌面和移动端分别连续开启／关闭五次，覆盖 Code 与 YOLO；检查 none、已停止的 Track、零存活 Code Worker、隐藏面板／聚焦层／YOLO 标签、保留会话首次时间及永久历史。真实 WASM 回复延后到关闭后再交付不会恢复 UI；模拟旧流事件、当前 ended／inactive，以及切镜头时权限拒绝均按预期处理。已查看两端关闭截图。系统级权限撤销使用事件模拟，真实设备仍需人工验证。
- 生产构建及 git diff --check 通过。项目没有现成 lint 命令；仍存在原有主应用 chunk 体积提示。

尚需人工实机验证：真实打印和屏幕条码的距离／对焦／光线／损伤、实际摄像头前后镜头选择、手机真实权限与剪贴板、iOS Safari / Android 真机性能、实际 YOLO 服务来回切换，以及远程服务器的 WASM MIME / CSP。每种格式的生成样例通过不表示任意损坏实物都可识别。MaxiCode 实时读取明确未支持；家族内未列出专门样例的子变体未逐项验证。
