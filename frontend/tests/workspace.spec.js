import {test,expect} from '@playwright/test';
test.beforeEach(async ({page})=>{
 await page.route('**/api/config',r=>r.fulfill({json:{loginReady:true,aiReady:true,imageReady:true}}));
 await page.route('**/api/me',r=>r.fulfill({json:{user:null}}));
});
test('React demo preserves card, tabs, timer and layout',async({page})=>{
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'دیدن نمونهٔ کارت و گزارش ←'}).click();
 await expect(page.locator('#dev-card')).toBeVisible();
 await expect(page.locator('#dev-card h2')).toHaveText('Alex Developer');
 await expect(page.locator('.theme-picker')).toBeHidden();
 await expect(page.locator('#dev-card .stats')).not.toContainText(/[۰-۹]/);
 await expect(page.locator('.rating-bar').filter({hasText:'پشتکار'})).toBeVisible();
 await expect(page.locator('.plain-guide')).toHaveCount(0);
 await page.getByRole('tab',{name:'تنظیمات'}).click();
 await expect(page.locator('.theme-picker')).toBeVisible();
 for (const [name,id] of [['شکوفهٔ آسمان','sky-bloom'],['گیلاس نیمه‌شب','cherry-noir'],['هستهٔ گرافیتی','graphite-core']]) {
   await page.getByRole('radio',{name:new RegExp(name)}).click();
   await expect(page.locator('html')).toHaveAttribute('data-theme',id);
   const backgrounds={'sky-bloom':'rgb(234, 243, 252)','cherry-noir':'rgb(16, 11, 16)','graphite-core':'rgb(17, 19, 22)'};
   await expect(page.locator('body')).toHaveCSS('background-color',backgrounds[id]);
   await page.getByRole('tab',{name:'کارت و معرفی'}).click();
   const cardBackground=await page.locator('#dev-card').evaluate(el=>getComputedStyle(el).backgroundImage);
   expect(cardBackground).not.toContain('rgb(41, 55, 42)');
   await page.screenshot({path:`test-results/theme-${id}-${test.info().project.name}.png`,fullPage:true});
   await page.getByRole('tab',{name:'تنظیمات'}).click();

   expect(new URL(page.url()).searchParams.get('theme')).toBe(id);
 }
 await page.getByRole('radio',{name:/شفق نعنایی/}).click();

 await page.getByRole('tab',{name:'گزارش پیشرفت'}).click();
 await expect(page.getByRole('heading',{name:'مسیر امسال، کنار پارسال'})).toBeVisible();
 await expect(page.getByRole('button',{name:'تحلیل مسیر من'})).toHaveCount(0);
 await page.locator('.day-cell').first().focus();
 await expect(page.getByRole('tooltip')).toContainText('مشارکت');
 const cell = await page.locator('.day-cell').first().boundingBox();
 expect(cell.width).toBe(14); expect(cell.height).toBe(14);
 await page.getByRole('img',{name:'نمودار مقایسهٔ روزهای فعال تجمعی'}).focus();
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tooltip')).toContainText('روز فعال');
 await expect(page.locator('#reports-panel .metric-grid .metric')).toHaveCount(8);
 await page.screenshot({path:`test-results/reports-${test.info().project.name}.png`,fullPage:true});
 const reportDownload=page.waitForEvent('download');
 await page.getByRole('button',{name:'دریافت گزارش'}).click();
 expect((await reportDownload).suggestedFilename()).toContain('developer-report-');

 await page.getByRole('tab',{name:'زمان کار'}).click();
 await page.getByRole('button',{name:'شروع کار',exact:true}).click();
 await expect(page.locator('#timer-clock')).not.toHaveText('00:00:00',{timeout:6000});
 await page.getByRole('tab',{name:'کارت و معرفی'}).click();
 await page.getByRole('tab',{name:'زمان کار'}).click();
 await expect(page.getByRole('button',{name:'توقف و ثبت زمان'})).toBeVisible();
 await page.getByRole('button',{name:'توقف و ثبت زمان'}).click();
 expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('tab',{name:'کارت و معرفی'}).click();
 await page.screenshot({path:`test-results/card-${test.info().project.name}.png`,fullPage:true});
 const download = page.waitForEvent('download');
 await page.getByRole('button',{name:'دانلود کارت PNG'}).click();
 const file = await download;
 expect(file.suggestedFilename()).toBe('developer-card-alex-sample.png');
 await file.saveAs(`test-results/export-${test.info().project.name}.png`);
});
