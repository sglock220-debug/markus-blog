# Cyber Camera 二维码扫描

已直接接入现有 `/cyber-camera` 页面。桌面实现保留原有 YOLO、风格切换、准星、截图和全屏，移动入口复用同一实现并调整布局。

## 使用

1. 开启视觉系统并授权摄像头。默认是「无识别模式」，不会启动 QR 或 YOLO。底部「识别」菜单可以选择无识别、YOLO识别、QR Code识别，三者互斥。
2. 点击「选项」，顶部 Tab 切换「HUD 选项 / 识别类别 / QR Code 模型」。二维码的标准／高精度模式、多码开关、间隔和本地保存选项都在 QR Tab 中；四种码制默认全选。运行与否只由识别模式决定，旧版的启用开关、去重开关与去重时间已移除，旧本地配置中的这些字段会被忽略。高级设置可折叠，长内容在面板内滚动。
3. 仅 QR Code 模式显示下方 QR SCANNER 面板，可以展开／收起。选择列表条目查看完整内容，对应实时边框显示粉色。LIVE 表示该条目仍在当前画面中。
4. 双击右侧内容或点击复制图标，复制完整文本。点击保存图标保存到本机；绿色图标表示已保存，再点可手动另存一条。
5. 每行的按钮顺序是「复制 / 保存 / 删除」。删除只作用于本次结果。右上角刷新图标清空本次结果、去重记录与编号，保留历史，不重启摄像头或 Worker。删除／清空后，移开当前二维码约 1.5 秒再对准才能重新加入，避免下一帧立即回填。
6. 「当前画面 N 目标」表示当前帧的实体码数量；「本次扫描 N 条唯一内容」表示会话列表中的唯一内容数，二者可以不同。
7. 「历史」可以查看、复制、删除、清空及导出 JSON / TXT。仅显式 HTTP(S) 地址显示「打开链接」，由用户主动打开。

## 真实支持范围

运行依赖固定为 `zxing-wasm@3.1.6`，采用 ZXing-C++ 的 WebAssembly reader。

| 码制 | 引擎读取 | 独立开关 | 本次实际样例验证 |
| --- | --- | --- | --- |
| QR Code Model 1 | 支持 | 支持 | ZXing-C++ 官方 Model 1 样例 |
| QR Code Model 2 | 支持 | 支持 | Version 1–40，每个版本分别验证 L / M / Q / H，共 160 个生成样例 |
| Micro QR Code | 支持 | 支持 | M1–M4 各一个样例 |
| rMQR | 支持 | 支持 | M / H 各一个样例 |

尺寸版本和纠错等级由解码器自动识别，不是另外的模型。不同码制有各自的版本与纠错限制，不能把 Model 2 的 1–40 / L、M、Q、H 套到 Micro QR 和 rMQR 上。支持标准不代表任意模糊、遮挡、极小或损坏的实物码都能读取。

此版本 reader 实测会把方形码的 `format` 返回为 `QRCode`，即使输入过滤器已区分 Model 1 / Model 2。代码使用 ZXing 的 AIM `symbologyIdentifier` 区分：`]Q0` 为 Model 1，`]Q1`–`]Q6` 为 Model 2；未知标识保留为未区分的 QR Code，不伪造具体类型。过滤器在引擎中生效，测试也验证 Model 2 开关不会读取 Model 1 样例。

参考：[zxing-wasm](https://github.com/Sec-ant/zxing-wasm)、[ZXing QR 解码源码](https://github.com/zxing-cpp/zxing-cpp/blob/master/core/src/qrcode/QRDecoder.cpp)。

## 实现与数据

- WASM 在专用 Worker 解码，扫码频率与画面绘制分离。每次只提交一个解码任务，完成后再调度下一次；根据解码耗时增加间隔。标准模式限制采样长边为 1280px，高精度使用视频原始分辨率并降低频率。后台标签页暂停采样。
- Worker 和约 947 KB 的 WASM 随 Vite 构建到 `dist/assets`，生产路径使用已有 `/static/`，不依赖第三方 CDN。浏览器需要支持 Worker、WebAssembly 和 Canvas。
- 空码制列表暂停解码，不能直接把空数组传给引擎（引擎会把它解释为“所有条码格式”）。多码启用时 `maxNumberOfSymbols: 0` 不限制目标数。
- 当前画面目标、本次会话结果、永久历史分开维护。当前帧按位置跟踪所有实体码，允许多个码内容相同；会话使用按完整解码文本建立的 Map，空文本的二进制结果使用原始字节。格式、位置、ECI 编码和离开时长不会让相同文本产生第二条记录。首次识别时间保留，仅更新最近识别时间；相同内容的多个边框关联同一条列表结果。会话保留数量限制可见列表，Map 仍保留超出显示范围的内容身份和首次时间，避免再次出现时重建重复条目；清空时整体释放。
- 手动删除的内容进入临时忽略 Map。后续扫描帧确认该内容消失约 1.5 秒才解除忽略；瞬间漏检不会立即解除，暂停／切换模式不算已离开画面。清空同时覆盖下一帧（包括已经在途的解码），保证当前画面不立即回填；不重建 Worker，不申请新的摄像头权限。
- QR 框使用真实四角与 `object-fit: cover` 换算，ResizeObserver 跟随舞台尺寸／全屏变化。当前视频没有 CSS 镜像，因此画面、截图和 QR 坐标保持同一方向。截图也复用 cover 裁剪。
- 退出 QR 模式、停用摄像头、切换码制／精度、卸载页面会终止 Worker 与调度器，代次校验丢弃旧异步结果；只有 QR 模式且摄像头运行时才能创建解码 Worker。YOLO 只在其模式下连接 WebSocket 并启动检测定时器；退出时关闭连接、撤销重连计时器，旧连接回调失效。模式切换保留 QR 本次结果及设置，不停止媒体流，也不重新申请权限。停止和切换摄像头释放原来的媒体轨道。摄像头授权等待期间离开页面，也会释放随后取得的轨道。
- `localStorage` 保存 QR 配置、HUD 准星与 COCO 类别选择。历史另存，包含唯一 ID、完整文本、格式、内容类型、原始字节／ECI 字节、识别时间与保存时间等。JSON 保留完整记录；TXT 导出可读文本。自动保存按码制与原始内容去重，手动允许再次保存；存储失败明确提示，不显示虚假的保存成功状态。
- QR 扫描本身不上传画面或内容。切换到 YOLO 模式后，仍按原有协议向 YOLO 服务发送摄像头画面。所有结果通过 Vue 文本插值展示，禁止 HTML 注入；HTTP(S) 外链使用 `noopener noreferrer`。
- 历史属于当前浏览器与站点来源，清理站点数据、切换设备／浏览器不会同步；可用导出进行备份。

## 文件清单

修改：

- `src/views/desktop/CyberCamera.vue`：接入 QR、Tab 设置、结果面板，完善摄像头生命周期与 cover 坐标／截图。
- `src/views/mobile/CyberCamera.vue`：复用完整相机实现，取代原先未接通的移动菜单与简化识别路径。
- `package.json` / `package-lock.json`：新增运行依赖及测试命令；测试依赖 `@playwright/test@1.64.1`、`pngjs@7.0.0`。
- `.gitignore`：忽略浏览器测试临时结果。
- `../dist/`：更新生产构建，包括本地 Worker / WASM。

新增：

- `src/services/qrScanner.js`：格式、配置校验、内容分类、安全 URL、坐标换算和目标／会话管理。
- `src/services/qrWorkerClient.js`：Worker 通信、超时及终止。
- `src/services/qrScanner.worker.js`：实际 WASM 解码与结果元数据。
- `src/composables/useQrScanner.js`：扫描调度、生命周期、设置／历史持久化、复制、保存、导出和绘制。
- `src/components/camera/CameraSettings.vue`：Tab 设置，保留 COCO 类别搜索、分页与勾选。
- `src/components/camera/QrResultsPanel.vue`：实时／会话结果、历史和逐条操作。
- `tests/qrScanner.test.mjs`、`tests/qrCamera.spec.mjs`、`tests/qr.playwright.config.mjs`、`tests/qrFixtures.mjs`、`tests/fixtures/`：测试与官方样例及许可。
- `QR_CAMERA.md`：本说明。

## 本轮修复涉及的文件

- `src/services/qrScanner.js`：内容 Map 去重、首次／最近时间、删除／清空、暂时忽略和重入；移除旧的独立启用与时间去重设置。
- `src/composables/useQrScanner.js`：由识别模式控制任务生命周期、保留会话、发布删除／清空状态。
- `src/views/desktop/CyberCamera.vue`：三种模式菜单和 HUD，QR 面板显示条件，YOLO 连接／重连与旧回调清理；移动入口继续复用此实现。
- `src/components/camera/QrResultsPanel.vue`：复制／保存／删除、会话刷新、首次／最近时间和两类计数说明。
- `src/components/camera/CameraSettings.vue`：保留现有 Tab 与参数，移除冲突的 QR 启用和时间去重控件。
- `tests/qrScanner.test.mjs`、`tests/qrCamera.spec.mjs`、`tests/qrFixtures.mjs`：新行为与原有功能回归测试。
- `QR_CAMERA.md`、`../dist/`：更新说明与生产产物。本轮没有新增依赖。

## 验证

在 `frontend` 目录运行：

```powershell
npm install
npm run test:qr
npm run build
npx playwright install chromium
npm run test:qr:browser
```

已有 Chromium 可通过环境变量 `QR_TEST_BROWSER` 指定其可执行文件。浏览器测试会自动启动 localhost:5179 的 Vite；生产构建用例另启临时端口，模拟项目已有的 `/static/` 部署路径，因此需先执行 build。

本次验证：

- Node 测试 11 / 11 通过：整段会话按内容合并、多个实体码关联唯一内容、首次与最后识别时间、删除与消失后重入、清空时在途帧忽略、暂停不算离开、显示上限外内容再次出现仍保留首次记录，以及原有 URL／配置校验、坐标换算、四种码制和 160 个 Model 2 版本／纠错组合、中文 ECI、多码读取。
- Playwright 7 / 7 通过：使用真实 Worker / WASM 和测试画布摄像头流，YOLO 传输端使用测试桩。覆盖两个同内容 GitHub 实体码和 Wikipedia 码连续扫描 30 秒（当前帧 3 目标、本次列表 2 条）、首次时间不变、单条删除后的抑制及离开重入、清空后不立即回填、保留永久历史、编号重置、模式返回保留本次结果；还检查默认无 Worker、QR→YOLO 后不再提交 QR 任务、无识别时两套引擎均停、反复切换时最多一个 QR Worker且摄像头权限申请次数不增加。原有复制、保存、导出、历史刷新恢复、COCO 类别设置、移动布局、切镜头、全屏、权限／存储／剪贴板错误与生产 /static/ 本地 Worker / WASM 加载也通过。
- 生产构建通过；项目没有既有 lint 命令。构建仍提示现有主应用 chunk 大于 500 KB，未扩展本次范围去重构全站分包。
- 已查看桌面与移动端测试截图，确认设置和结果在视口内、长设置内部滚动。

仍需人工实机验证（未标记通过）：

- 真实摄像头的授权、前后镜头设备选择与浏览器实际剪贴板权限。
- 真实打印／屏幕码的对焦、距离、光线、倾斜、镜像码和高密度 Version 40。
- 实际 YOLO Worker 服务与 QR 模式来回切换的端到端效果和弱设备性能。两套引擎不会同时持续运行。
- iOS Safari、Android 真机、系统全屏限制、横竖屏和设备特有的安全区。
- 生产服务器是否以正确 MIME 提供 WASM，以及其 CSP 是否允许本地 Worker / WASM。自动化已验证本地生产包的资源路径，但未部署远程服务器。
