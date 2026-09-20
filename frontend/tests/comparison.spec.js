import { test, expect } from '@playwright/test';
import { activityStats } from '../src/lib/activity.js';

test('comparison follows account years and explains exact metric dates', async ({page}) => {
  await page.route('**/api/config', r=>r.fulfill({json:{loginReady:true}}));
  await page.route('**/api/me', r=>r.fulfill({json:{user:null}}));
  await page.goto('/?theme=solar-forge');
  await page.getByRole('button',{name:'دیدن نمونهٔ کارت و گزارش ←'}).click();
  await page.getByRole('tab',{name:'گزارش پیشرفت'}).click();
  await expect(page.getByRole('heading',{name:'مسیر مشارکت‌های تو'})).toBeVisible();
  const select = page.getByLabel('سال مقایسه');
  await expect(select.locator('option')).toHaveCount(new Date().getUTCFullYear()-2020);
  await select.selectOption('2020');
  await expect(page.locator('.chart-legend')).toContainText('2020');
  await expect(page.locator('#reports-panel .metric').first()).toContainText('2020:');
  await page.locator('#reports-panel .metric').first().focus();
  await expect(page.locator('.metric-tooltip').first()).toContainText('2020:');
  await expect(page.locator('.metric-tooltip').first()).not.toContainText('،');
  await page.screenshot({path:`test-results/comparison-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('tab',{name:'تنظیمات'}).click();
  await page.locator('#language').selectOption('en');
  await page.screenshot({path:`test-results/select-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole('tab',{name:'Progress report'}).click();
  await expect(page.getByLabel('Comparison year')).toHaveValue('2020');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#reports-panel .metric').first()).toHaveCSS('animation-name','none');
});

test('metric dates preserve tied peaks and consecutive streak boundaries', () => {
  const stats = activityStats({days:[{date:'2024-02-28',count:3},{date:'2024-02-29',count:5},{date:'2024-03-01',count:5},{date:'2024-03-03',count:1}]});
  expect(stats.bestDates).toEqual(['2024-02-29','2024-03-01']);
  expect(stats.longestRange).toEqual(['2024-02-28','2024-03-01']);
  expect(stats.longest).toBe(3);
});
