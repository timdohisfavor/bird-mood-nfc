# JOYIBIRD V0.2 高分辨率宠物动作资产生产说明

## 目标

重新生成 6 只默认宠物的 11 个标准动作，得到单动作、透明背景、高分辨率资产。最终小程序使用的 PNG 必须达到 `home.png` 的边缘质量标准：

- `720x720` PNG
- 真实透明 alpha
- 单只宠物完整身体，居中，有安全留白
- 没有紫边、绿边、硬抠边、锯齿边、低分辨率 contact-sheet 放大感
- 风格保持 3D plush toy / soft vinyl toy

当前 contact sheet 切图的单动作原始尺寸只有约 `240-330px`，不能作为最终资产，只能作为动作方向稿。

## 目录

- Prompt manifest: `docs/assets/pet-design/hires-prompts/manifest.json`
- 单张 prompt: `docs/assets/pet-design/hires-prompts/<pet-id>/<action>.txt`
- 生成源图: `docs/assets/pet-design/hires-generated/raw/<pet-id>/<action>.png`
- 处理后透明资产: `miniprogram/assets/pets-hires/<pet-id>/<action>.png`
- QA 图: `docs/assets/pet-design/hires-generated/qa/`

## 命令

生成 66 个 prompt：

```bash
npm run pets:hires:prompts
```

用 Seedream 生成源图，需要先配置 `SEEDREAM_API_KEY`：

```bash
export SEEDREAM_API_KEY="..."
npm run pets:hires:generate:seedream
```

只生成一个资产打样：

```bash
npm run pets:hires:generate:seedream -- --asset chestnut-flanked-white-eye/happy --limit 1
```

把源图处理成 `720x720` 透明 PNG：

```bash
npm run pets:hires:process
```

验收透明资产并生成 QA 总览：

```bash
npm run pets:hires:validate
```

## 替换策略

1. 先打样 `chestnut-flanked-white-eye/happy`。
2. 对比 `miniprogram/assets/pets/chestnut-flanked-white-eye/home.png` 的边缘和材质。
3. 打样通过后批量生成 66 张。
4. 验收通过后，把 `miniprogram/assets/pets-hires/<pet-id>/*.png` 覆盖到 `miniprogram/assets/pets/<pet-id>/*.png`。
5. 重新运行：

```bash
python3 scripts/build_miniprogram_pet_asset_manifest.py
npm run smoke:v01
```
