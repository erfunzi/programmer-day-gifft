import {test, expect} from '@playwright/test';
import {sample} from '../src/lib/sample.js';

test('refresh restores the active tab and suggestions are an obvious disclosure', async ({page}) => {
  await page.route('**/api/config', r=>r.fulfill({json:{loginReady:true}}));
  await page.route('**/api/me', r=>r.fulfill({json:{user:null}}));
  await page.goto('/?demo=1&theme=solar-forge');
  for (const name of ['گزارش پیشرفت','زمان کار','تنظیمات','کارت و معرفی']) {
    await page.getByRole('tab',{name,exact:true}).click();
    await page.reload();
    await expect(page.getByRole('tab',{name,exact:true})).toHaveAttribute('aria-selected','true');
  }
  await page.route('**/api/cards/alex-sample', r=>r.fulfill({json:{...sample,preferences:{theme:'solar-forge',language:'fa'},analysis:{locales:{fa:{title:'توسعه‌دهنده وب',summary:'ساخت ابزارهای کاربردی',suggestions:['برای پروژه‌ها مستندات کامل بنویس.'],resume:[],skills:[]}}}}}));
  await page.route('**/api/cards/alex-sample/image?*',r=>r.fulfill({status:404,body:''}));
  await page.goto('/?u=alex-sample&tab=settings');
  await expect(page.getByRole('tab',{name:'کارت و معرفی',exact:true})).toHaveAttribute('aria-selected','true');
  const summary = page.locator('.growth-suggestions summary');
  await expect(summary).toHaveCSS('cursor','pointer');
  await summary.click();
  await expect(page.locator('.growth-suggestions')).toHaveAttribute('open','');
  await expect(page.locator('.growth-suggestions ul')).toBeVisible();
  await summary.press('Enter');
  await expect(page.locator('.growth-suggestions')).not.toHaveAttribute('open','');
  await summary.hover();
  await page.screenshot({path:`test-results/suggestions-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
});
