import { test, expect } from '@playwright/test';
import { sample } from '../src/lib/sample.js';

test.beforeEach(async ({page}) => {
  await page.route('**/api/config', r=>r.fulfill({json:{loginReady:true,aiReady:false,imageReady:false}}));
  await page.route('**/api/me/time', r=>r.fulfill({json:{timezone:'Asia/Tehran',active:null,history:[],daily:{},total:0,today:0,elapsedDays:1,averagePerCalendarDay:0,activeDays:0}}));
  await page.route('**/api/me/telegram', r=>r.fulfill({json:{configured:false}}));
  await page.route('**/api/me/image?*', r=>r.fulfill({status:404,body:''}));
  await page.route('**/api/me/ai', r=>r.fulfill({json:{locales:{fa:{title:'معرفی',summary:'تحلیل',resume:[],skills:[]}}}}));
});

test('session, report and logout use the same themed loading state', async ({page}) => {
  let sessionRelease, reportRelease, logoutRelease;
  const sessionWait = new Promise(r=>sessionRelease=r);
  const reportWait = new Promise(r=>reportRelease=r);
  const logoutWait = new Promise(r=>logoutRelease=r);
  let loggedIn=true;
  await page.route('**/api/me', async r=>{await sessionWait;await r.fulfill({json:{user:loggedIn?{id:1,login:sample.user.login}:null}});});
  await page.route('**/api/me/profile',r=>r.fulfill({json:sample}));
  await page.route('**/api/me/activity',async r=>{await reportWait;await r.fulfill({json:{year:2026,current:{days:[],commits:0},previous:{days:[],commits:0}}});});
  await page.route('**/auth/logout',async r=>{await logoutWait;loggedIn=false;await r.fulfill({json:{}});});
  await page.goto('/?theme=solar-forge');
  await expect(page.getByRole('status').filter({hasText:'در حال بررسی وضعیت ورود…'})).toBeVisible();
  await expect(page.locator('.login-button')).toHaveCount(0);
  sessionRelease();
  await expect(page.locator('#dev-card')).toBeVisible();
  await expect(page.locator('.login-button')).toHaveCount(0);
  await page.getByRole('tab',{name:'گزارش پیشرفت'}).click();
  await expect(page.locator('.loading-state--report')).toBeVisible();
  await expect(page.locator('.loading-metrics>div')).toHaveCount(8);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.loading-state--report .loading-spinner')).toHaveCSS('animation-name','none');
  await page.screenshot({path:`test-results/report-loading-${test.info().project.name}.png`,fullPage:true});
  reportRelease();
  await expect(page.locator('.loading-state--report')).toHaveCount(0);
  await expect(page.locator('#reports-panel .metric')).toHaveCount(8);
  await page.getByRole('button',{name:'خروج',exact:true}).click();
  await expect(page.getByRole('button',{name:'در حال خروج…'})).toBeDisabled();
  await expect(page.getByRole('status').filter({hasText:'در حال خروج…'})).toBeVisible();
  logoutRelease();
  await expect(page.locator('.login-button')).toBeVisible();
});

test('sign-in rechecks an existing session and avoids a second GitHub authorization', async ({page}) => {
  let requests=0, release;
  const wait = new Promise(r=>release=r);
  await page.route('**/api/me',async r=>{
    requests++;
    if(requests>1) await wait;
    await r.fulfill({json:{user:requests>1?{id:1,login:sample.user.login}:null}});
  });
  await page.route('**/api/me/profile',r=>r.fulfill({json:sample}));
  let oauthCalls=0;
  page.on('request',r=>{if(r.url().endsWith('/auth/github'))oauthCalls++;});
  await page.goto('/');
  await page.locator('.login-button').click();
  await expect(page.locator('.login-button')).toBeDisabled();
  await expect(page.locator('.login-button')).toContainText('در حال ورود…');
  release();
  await expect(page.locator('#dev-card')).toBeVisible();
  expect(oauthCalls).toBe(0);
});
