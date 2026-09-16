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
 const years=page.getByRole('navigation',{name:'سال مشارکت‌ها'});
 await expect(years.getByRole('button',{name:'2019',exact:true})).toHaveCount(0);
 await years.getByRole('button',{name:'2020',exact:true}).click();
 await expect(page.getByRole('heading',{name:'ریتم مشارکت 2020'})).toBeVisible();
 await expect(page.locator('.day-cell')).toHaveCount(366);
 await years.getByRole('button',{name:String(new Date().getFullYear()),exact:true}).click();

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

test('public card copies its themed link and dismisses the toast after five seconds', async ({page}) => {
 const {sample} = await import('../src/lib/sample.js');
 await page.route('**/api/cards/alex-sample', r => r.fulfill({json:sample}));
 await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {value:{writeText:async text => {window.copiedLink=text;}}}));
 await page.goto('/?u=alex-sample&theme=neon-arcade');
 const copy=page.getByRole('button',{name:'کپی لینک',exact:true});
 await expect(copy).toBeVisible();
 await expect(page.getByRole('button',{name:'توقف اشتراک‌گذاری'})).toHaveCount(0);
 await copy.click();
 await expect(page.locator('.toast')).toContainText('لینک کارت کپی شد');
 expect(await page.evaluate(()=>window.copiedLink)).toContain('?u=alex-sample&theme=neon-arcade');
 const theme = await page.locator('.visitor-invite').evaluate(el=>({actual:getComputedStyle(el).backgroundColor,expected:getComputedStyle(document.documentElement).getPropertyValue('--theme-chip').trim()}));
 expect(theme.actual).not.toBe('rgb(36, 50, 33)');
 await expect(page.locator('.toast')).toHaveCount(0,{timeout:6500});
 await copy.click();
 await expect(page.locator('.toast')).toBeVisible();
});

test('Telegram initial publication survives reload and later publication requires a click', async ({page}) => {
 const {sample} = await import('../src/lib/sample.js');
 let sent=0, state={configured:true, linked:false, joined:false, initialPublish:true,canPublish:true};
 await page.route('**/api/me',r=>r.fulfill({json:{user:{id:1,login:sample.user.login}}}));
 await page.route('**/api/me/profile',r=>r.fulfill({json:sample}));
 await page.route('**/api/me/time',r=>r.fulfill({json:{timezone:'Asia/Tehran',active:null,history:[],daily:{},total:0,today:0,elapsedDays:1,averagePerCalendarDay:0,activeDays:0}}));
 await page.route('**/api/me/ai',r=>r.fulfill({json:{title:'معرفی',summary:'تحلیل',resume:['معرفی حرفه‌ای نمونه'],skills:[]}}));
 await page.route('**/api/me/image?*',r=>r.fulfill({status:404,body:''}));
 await page.route('**/api/me/telegram',r=>r.fulfill({json:state}));
 await page.route('**/api/me/telegram/publish',r=>{
   sent++;
   state={...state,initialPublish:false,canPublish:false,messagePresent:true};
   return r.fulfill({json:{published:true,created:true,messageId:sent}});
 });
 await page.goto('/?theme=solar-forge');
 await expect.poll(()=>sent).toBe(1);
 await expect(page.locator('.toast')).toContainText('۲ ساعت');
 const box=await page.locator('.developer-introduction').boundingBox();
 const grid=await page.locator('.result-grid').boundingBox();
 expect(Math.abs(box.width-grid.width)).toBeLessThan(2);
 await page.reload();
 await expect(page.getByRole('button',{name:'انتشار در کانال تلگرام',exact:true})).toBeDisabled();
 expect(sent).toBe(1);
 state={...state,canPublish:true,messagePresent:false};
 await page.reload();
 const publish=page.getByRole('button',{name:'انتشار در کانال تلگرام',exact:true});
 await expect(publish).toBeEnabled();
 expect(sent).toBe(1);
 await publish.click();
 await expect.poll(()=>sent).toBe(2);
 await expect(page.getByText('وارد شدی؛ کارت و گزارش‌ها آماده‌ می‌شوند…')).toHaveCount(0);
});
