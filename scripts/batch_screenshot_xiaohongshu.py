#!/usr/bin/env python3
"""
批量截图今日鸟签 H5 的海报页和详情弹窗，用于小红书发布。
输出目录: output/xiaohongshu/
命名规则:
  - 海报: {rank:02d}_{name}_海报.png
  - 详情: {rank:02d}_{name}_详情.png
"""

import json
import os
import subprocess
import sys
import time
import signal
from pathlib import Path

# ---------------------------------------------------------------------------
# 0. 路径与配置
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "output" / "xiaohongshu"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BIRDS_JSON = PROJECT_ROOT / "data" / "birds-source.json"
LOCAL_URL = "http://localhost:4173/index.html"
VIEWPORT = {"width": 390, "height": 844}   # iPhone 14 Pro 逻辑分辨率
DEVICE_SCALE = 3                           # 3x 高清截图

# ---------------------------------------------------------------------------
# 1. 读取鸟类数据
# ---------------------------------------------------------------------------
with open(BIRDS_JSON, "r", encoding="utf-8") as f:
    BIRDS = json.load(f)

print(f"共加载 {len(BIRDS)} 只鸟，开始批量截图…")

# ---------------------------------------------------------------------------
# 2. 启动本地 HTTP 服务器（后台）
# ---------------------------------------------------------------------------
server_proc = subprocess.Popen(
    [sys.executable, "-m", "http.server", "4173", "--bind", "127.0.0.1"],
    cwd=PROJECT_ROOT,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(1.5)  # 等待服务器就绪

# ---------------------------------------------------------------------------
# 3. Playwright 截图
# ---------------------------------------------------------------------------
from playwright.sync_api import sync_playwright

def wait_for_images(page, selector, timeout=8000):
    """等待指定选择器下的所有 <img> 加载完成（complete 且 naturalWidth > 0）"""
    page.wait_for_function(f"""
        () => {{
            const imgs = document.querySelectorAll('{selector} img');
            if (imgs.length === 0) return false;
            return Array.from(imgs).every(img => img.complete && img.naturalWidth > 0);
        }}
    """, timeout=timeout)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport=VIEWPORT,
        device_scale_factor=DEVICE_SCALE,
        is_mobile=True,
        has_touch=True,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    )
    page = context.new_page()

    # 先打开一次页面，让 Service Worker / 资源缓存预热
    page.goto(LOCAL_URL, wait_until="networkidle")
    time.sleep(0.5)

    for bird in BIRDS:
        rank = bird["rank"]
        bird_id = bird["id"]
        name = bird["name"]

        # ---------------------------------------------------------------
        # A. 海报页截图
        # ---------------------------------------------------------------
        print(f"  [{rank:02d}/{len(BIRDS)}] {name} — 海报页…", end=" ")

        page.evaluate(f"""
            () => {{
                // 解锁该鸟
                state.unlockedBirdIds.add('{bird_id}');
                state.unlockedBirdTimes.set('{bird_id}', Date.now());

                // 找到鸟对象
                const bird = state.birds.find(b => b.id === '{bird_id}');
                if (!bird) {{
                    console.error('Bird not found: {bird_id}');
                    return;
                }}

                // 设置为今日鸟签
                state.activeBird = bird;
                state.revealed = true;

                // 渲染并切换到海报页
                renderAll();
                goScreen('poster');
            }}
        """)

        # 等待海报卡片渲染
        page.wait_for_selector(".poster-card", state="visible", timeout=5000)
        # 等待海报中的鸟图加载
        wait_for_images(page, ".poster-card", timeout=8000)
        # 额外等待字体和阴影渲染稳定
        time.sleep(0.4)

        poster_path = OUTPUT_DIR / f"{rank:02d}_{name}_海报.png"
        page.locator(".poster-card").screenshot(path=str(poster_path))
        print(f"✓ {poster_path.name}")

        # ---------------------------------------------------------------
        # B. 详情弹窗截图
        # ---------------------------------------------------------------
        print(f"  [{rank:02d}/{len(BIRDS)}] {name} — 详情页…", end=" ")

        page.evaluate(f"""
            () => {{
                const bird = state.birds.find(b => b.id === '{bird_id}');
                if (!bird) return;

                // 确保解锁
                state.unlockedBirdIds.add('{bird_id}');
                state.unlockedBirdTimes.set('{bird_id}', Date.now());

                // 切换到鸟窝页并打开详情
                goScreen('nest');
                openBirdDetail(bird);
            }}
        """)

        # 等待详情弹窗渲染
        page.wait_for_selector(".detail-sheet", state="visible", timeout=5000)
        # 等待详情大图加载
        wait_for_images(page, ".detail-art", timeout=8000)
        time.sleep(0.4)

        detail_path = OUTPUT_DIR / f"{rank:02d}_{name}_详情.png"
        
        # 临时移除 max-height 和 overflow 限制，确保底部音频谱图等内容也被截取
        page.evaluate("""
            () => {
                const sheet = document.querySelector('.detail-sheet');
                if (sheet) {
                    sheet.dataset._origMaxHeight = sheet.style.maxHeight || '';
                    sheet.dataset._origOverflowY = sheet.style.overflowY || '';
                    sheet.style.maxHeight = 'none';
                    sheet.style.overflowY = 'visible';
                }
                // 同时确保父容器 modal 不限制高度
                const modal = document.querySelector('.bird-detail-modal');
                if (modal) {
                    modal.dataset._origAlign = modal.style.alignItems || '';
                    modal.style.alignItems = 'flex-start';
                }
            }
        """)
        time.sleep(0.3)
        
        page.locator(".detail-sheet").screenshot(path=str(detail_path))
        
        # 恢复原始样式
        page.evaluate("""
            () => {
                const sheet = document.querySelector('.detail-sheet');
                if (sheet) {
                    sheet.style.maxHeight = sheet.dataset._origMaxHeight || '';
                    sheet.style.overflowY = sheet.dataset._origOverflowY || '';
                    delete sheet.dataset._origMaxHeight;
                    delete sheet.dataset._origOverflowY;
                }
                const modal = document.querySelector('.bird-detail-modal');
                if (modal) {
                    modal.style.alignItems = modal.dataset._origAlign || '';
                    delete modal.dataset._origAlign;
                }
            }
        """)
        
        print(f"✓ {detail_path.name}")

    browser.close()

# ---------------------------------------------------------------------------
# 4. 关闭本地服务器
# ---------------------------------------------------------------------------
server_proc.send_signal(signal.SIGTERM)
server_proc.wait()

print(f"\n全部完成！截图保存在: {OUTPUT_DIR}")
print(f"  海报图: {len(BIRDS)} 张")
print(f"  详情图: {len(BIRDS)} 张")
