# کارت توسعه‌دهنده · Studio

## دربارهٔ پروژه

«کارت توسعه‌دهنده» یک فضای شخصی برای معرفی پروژه‌ها، گزارش فعالیت GitHub و ثبت زمان کار است. هر فرد با ورود رسمی GitHub، کارت اختصاصی خود را می‌سازد. روز برنامه‌نویس، پیام ویژهٔ همان روز روی کارت نمایش داده می‌شود.

این تجربه، بیو، زبان‌های برنامه‌نویسی، پروژه‌ها، موضوع‌ها، فعالیت اخیر، ستاره‌ها، README پروفایل و README پروژه‌های شاخص را بررسی می‌کند و از آن‌ها برای ساخت یک روایت شخصی، آمار زنده و یک کاراکتر سه‌بعدی اختصاصی الهام می‌گیرد.

## قابلیت‌ها

- کارت تبریک منحصربه‌فرد برای هر پروفایل عمومی GitHub
- تحلیل پروژه‌ها، زبان‌ها، موضوع‌ها و READMEهای عمومی
- ساخت کاراکترهای متنوع برای حوزه‌های وب، داده، موبایل، بازی، سیستم و متن‌باز
- کاراکتر خنثی با ابزارها و موضوع‌های الهام‌گرفته از پروژه‌ها
- مقایسهٔ فعالیت سالانه و تایمر ثبت زمان کار
- حرکت سه‌بعدی پیش‌فرض و طراحی مناسب برای اشتراک‌گذاری
- لینک اختصاصی و QR Code برای فرستادن کارت به دیگران
- دعوت مستقیم مهمان برای ساخت کارت خودش
- دانلود تصویر با همان ظاهر کارت نمایش‌داده‌شده
- نمایش لینک سازنده برای حمایت، دنبال‌کردن و ستاره‌دادن به پروژه

## هدف

این پروژه برای قدردانی از آدم‌هایی ساخته شده که پشت هر commit، ایده، کنجکاوی و داستانی انسانی دارند.

روز برنامه‌نویس مبارک. ✳

## معماری فعلی

پروژه به‌صورت یک مونو‌ریپو نگهداری می‌شود:

- `frontend/`: کامپوننت‌های React، Tailwind، shadcn/Radix و React Query با همان ظاهر کارت، سرو‌شده با Nginx.
- `backend/`: API و احراز هویت Django با PostgreSQL.
- `docker-compose.yml`: سه سرویس مستقل frontend، backend و PostgreSQL با یک فایل `.env` مشترک.

تصمیم‌های زیرساختی از لایهٔ نمایش جدا هستند؛ بنابراین تغییر به React و Django ظاهر کارت، متن‌ها و تجربهٔ فعلی را تغییر نمی‌دهد.

## انتشار در کانال تلگرام

پروژه می‌تواند بعد از ورود GitHub یک پست تصویری از کارت را در کانال `lyrooDev` منتشر کند. کپشن با HTML تلگرام ساخته می‌شود و از تیتر، لینک، بولد، ایتالیک، کد، نقل‌قول، جدول متنی با `<pre>` و مجموعهٔ شناسه‌های Custom Emoji مخصوص همین کانال پشتیبانی می‌کند.

برای فعال‌سازی، ربات را با دسترسی انتشار و حذف پیام به کانال اضافه کن و این مقادیر را در `.env` بگذار: `TELEGRAM_BOT_TOKEN`، `TELEGRAM_BOT_USERNAME`، `TELEGRAM_CHANNEL_ID` (مثلاً `@lyrooDev`)، `TELEGRAM_CHANNEL_URL` و `TELEGRAM_WEBHOOK_SECRET`. بعد از قرار گرفتن سایت روی HTTPS، وبهوک را با دستور `python manage.py set_telegram_webhook` ثبت کن.

تلگرام هویت یک کاربر GitHub را به‌صورت خودکار نمی‌داند. برای همین، داخل کارت دکمهٔ اتصال تلگرام ساخته می‌شود؛ کاربر از طریق deep link ربات را باز می‌کند و سپس عضویت او به حساب GitHub وصل می‌شود. با `TELEGRAM_REQUIRE_JOIN=true` انتشار تا زمان اتصال و عضویت متوقف می‌ماند و اگر کاربر بعداً کانال را ترک کند، رویداد `chat_member` به وبهوک می‌رسد و پست او حذف می‌شود. این رفتار فقط برای حساب‌هایی قابل اعمال است که اتصال تلگرام را کامل کرده‌اند.

---

# Developer Card · Studio

## About

Developer Card is a year-round workspace for public GitHub portfolios, activity reports and tracked work time. Developers sign in with GitHub to create and optionally share their card, with a special greeting on Programmer’s Day.

The experience analyzes the profile bio, programming languages, repositories, topics, recent activity, stars, profile README, and selected project READMEs. These signals inspire a personal story, live statistics, and a custom 3D developer character.

## Features

- A unique celebration card for every public GitHub profile
- Analysis of public repositories, languages, topics, and README files
- Multiple character archetypes for web, data, mobile, game, systems, and open-source builders
- Gender-neutral characters inspired by project themes and tools
- Yearly activity comparison and a persistent work timer
- Default 3D motion with a design made for sharing
- A dedicated share link and QR Code for every card
- A direct invitation for visitors to create their own card
- Image export that preserves the card shown on screen
- A creator link for following, supporting, and starring the project

## Purpose

This project celebrates the humans behind every commit: their ideas, curiosity, craft, and stories.

Happy Programmer’s Day. ✳

## Current architecture

The project is maintained as a monorepo:

- `frontend/`: React components with Tailwind, shadcn/Radix and React Query, preserving the card design and served by Nginx.
- `backend/`: Django APIs and authentication backed by PostgreSQL.
- `docker-compose.yml`: separate frontend, backend, and PostgreSQL services using one shared `.env` file.

The infrastructure layers are separated from the presentation layer, so the React and Django migration keeps the existing card design and user experience intact.

## Telegram channel publishing

The project can publish a visual card to the `lyrooDev` channel after GitHub sign-in. Captions use Telegram HTML and support headings, links, bold, italics, code, blockquotes, table-like layouts rendered with `<pre>`, and the channel’s built-in Custom Emoji ID set.

Add the bot to the channel as an administrator with permission to post and delete messages. Configure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_CHANNEL_URL`, and a random `TELEGRAM_WEBHOOK_SECRET`, then register the HTTPS webhook with `python manage.py set_telegram_webhook`.

Telegram cannot know which GitHub account belongs to a channel member by itself. The card therefore provides a Telegram deep-link connection flow. With `TELEGRAM_REQUIRE_JOIN=true`, publishing requires the linked Telegram account to be a channel member; when a linked member leaves, the `chat_member` webhook removes that member’s post.
