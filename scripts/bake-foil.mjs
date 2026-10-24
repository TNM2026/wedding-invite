// 手機平板燙金預先拍成圖（Haley 2026-10-24 第十一輪）：iPhone Safari 算 SVG 濾鏡會糊、CSS 又做不出內陰影，
// 所以用 Chromium 照 3 倍解析度、套桌機的 #gold-foil（Figma 燙金數值）把每個燙金元素拍成去背 PNG，手機平板直接顯示圖。
// 用法：node scripts/bake-foil.mjs（改了燙金字的文字、字級、位置後要重拍）；node scripts/bake-foil.mjs --measure 只量尺寸
import { createServer } from 'vite';
import { chromium } from 'playwright';

const MEASURE = process.argv.includes('--measure');
// 拍圖用的寬度：除了日期（跟著螢幕寬度縮放），燙金元素在手機平板都是固定尺寸，平板寬度拍一張共用；
// 日期另拍手機版，取常見最寬的 430（較窄的手機縮小顯示仍清楚）
const SHOTS = [
  { suffix: 't', width: 834, height: 1194 },
  { suffix: 'm', width: 430, height: 932, only: ['date'] },
];
const MEASURE_WIDTHS = [360, 390, 430, 743, 744, 767, 768, 834, 1023];
// 陰影會往外擴，拍的時候四邊多留這麼多 px（style.css 的 --foil-pad 要一致）；日期本身有遮罩、外擴會被裁，不留
const PAD = 6;
const NO_PAD = new Set(['date']);

const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();

for (const vp of MEASURE ? MEASURE_WIDTHS.map((w) => ({ width: w, height: 900 })) : SHOTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: MEASURE ? 1 : 3 });
  await page.goto('http://localhost:5199/');
  await page.evaluate(() => document.fonts.ready);
  // 進場動畫全部停在終點、反光層拿掉、強制用桌機的 #gold-foil、手機版頂部花飾換回桌機原圖（帶 Figma 濾鏡）
  await page.addStyleTag({
    content: `
      *, *::before, *::after { animation: none !important; transition: none !important; }
      .gold-shine { display: none !important; }
      [data-foil] { opacity: 1 !important; -webkit-mask-image: none !important; mask-image: none !important; transform: none !important; translate: none !important;
        filter: url(#gold-foil) !important; background: none !important; }
      [data-foil]::before { content: none !important; }
      [data-foil] * { filter: none !important; }
      .intro__hint { opacity: 1 !important; filter: none !important; }
      html, body { background: transparent !important; }
      .foil-shot-hide { visibility: hidden !important; }
      .foil-shot-hide [data-foil].foil-shot-on, .foil-shot-hide .foil-shot-on * { visibility: visible !important; }
    `,
  });
  await page.evaluate(() => {
    document.querySelectorAll('[data-foil] source').forEach((s) => s.remove());
    document.querySelectorAll('[data-foil] img').forEach((img) => { img.src = img.getAttribute('src'); });
  });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);

  const names = await page.$$eval('[data-foil]:not(.gold-shine [data-foil], .gold-shine)', (els) => els.map((el) => el.dataset.foil));
  const report = [];
  for (const name of names) {
    const el = page.locator(`[data-foil="${name}"]`).first();
    const box = await el.evaluate((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
    });
    if (vp.only && !vp.only.includes(name)) continue;
    if (!box.w || !box.h) continue; // 這個寬度沒顯示（例如手機的英文字）
    if (MEASURE) { report.push(`${name} ${box.w.toFixed(2)}x${box.h.toFixed(2)} (${(box.w / box.h).toFixed(4)})`); continue; }
    const pad = NO_PAD.has(name) ? 0 : PAD;
    // 只留這一個元素看得見，其他（紙張底、信封、別的字）全部隱藏
    await page.evaluate((n) => {
      document.documentElement.classList.add('foil-shot-hide');
      document.querySelectorAll('.foil-shot-on').forEach((e) => e.classList.remove('foil-shot-on'));
      document.querySelector(`[data-foil="${n}"]`).classList.add('foil-shot-on');
    }, name);
    await page.screenshot({
      path: `public/art/foil/${name}-${vp.suffix}.png`,
      omitBackground: true,
      fullPage: true,
      clip: { x: box.x - pad, y: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2 },
    });
    report.push(`${name}-${vp.suffix}.png ${box.w.toFixed(1)}x${box.h.toFixed(1)}`);
  }
  console.log(`--- ${vp.width}px\n` + report.join('\n'));
  await page.close();
}

await browser.close();
await server.close();
