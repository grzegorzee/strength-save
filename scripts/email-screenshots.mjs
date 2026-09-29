// Zrzuty podglądów maili (wynik scripts/email-previews.mjs): jasny i ciemny
// motyw (prefers-color-scheme), szerokość 375 i 600 px, pełna strona.
// Użycie: node scripts/email-screenshots.mjs <katalog_z_html>
// "dark" = prefers-color-scheme: dark (Apple Mail, iOS Mail respektują
// deklarację color-scheme). "forcedark" = automatyczne przyciemnianie
// Chromium (WebContentsForceDark), przybliżenie wymuszonej inwersji Gmaila
// i Outlook.com; to przybliżenie, nie wierny render tych klientów.
import { readdirSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const dir = resolve(process.argv[2] ?? "");
const shotsDir = join(dir, "shots");
mkdirSync(shotsDir, { recursive: true });
const files = readdirSync(dir).filter((f) => f.endsWith(".html"));
const normal = await chromium.launch();
const forced = await chromium.launch({ args: ["--blink-settings=forceDarkModeEnabled=true", "--enable-features=WebContentsForceDark"] });
const variants = [["light", normal, "light"], ["dark", normal, "dark"], ["forcedark", forced, "dark"]];
for (const [variant, browser, colorScheme] of variants) {
  for (const width of [375, 600]) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, colorScheme });
    for (const file of files) {
      await page.goto(`file://${join(dir, file)}`);
      await page.screenshot({ path: join(shotsDir, `${file.replace(/\.html$/, "")}-${variant}-${width}.png`), fullPage: true });
    }
    await page.close();
  }
}
await normal.close();
await forced.close();
console.log(`${files.length * 6} zrzutów w ${shotsDir}`);
