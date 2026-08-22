---
name: china-public-job-search
version: 1.0.0
enabled: true
search_mode: websearch
description: >
  Searches public China-mainland job sources for Guangdong and Guangxi roles.
  Covers comprehensive job boards, campus recruitment, central/state-owned employer
  recruitment, foreign-company career pages, university employment notices, and
  public-institution announcements. Use for Chinese job search, 广东招聘, 广西招聘,
  校园招聘, 国企校招, 外企招聘, 产品经理, 用户研究, 用户洞察, 管培生, or psychology-major roles.
context: fork
allowed-tools: WebSearch, WebFetch, Read
---

# China Public Job Search

This is a public-web discovery skill, not a scraper for login-protected pages. It
works with `/scrape` and the Guangdong/Guangxi policy in `CLAUDE.md`.

## Source coverage

Search each relevant channel in parallel with narrow queries, then fetch the actual
JD or official recruitment notice before classification.

| Channel | Sources and use |
|---|---|
| Comprehensive jobs | BOSS直聘 (`zhipin.com`), 智联招聘 (`zhaopin.com`), 前程无忧 (`51job.com`), 猎聘 (`liepin.com`) |
| Internet and products | BOSS直聘, 拉勾 (`lagou.com`), 脉脉招聘, and employer career pages |
| Campus and graduate | 应届生求职网 (`yingjiesheng.com`), 51job 校园招聘, 智联校园招聘, university employment offices, employer campus pages |
| Central/state-owned | 国聘 (`job.iguopin.com`), group/company recruitment pages, Guangxi employer announcements; apply the Guangxi campus-only and Guangdong exclusion policy |
| Foreign and joint ventures | LinkedIn Jobs plus the employer's China/global career page; use English title variants too |
| Public institutions | Guangdong/Guangxi human-resources and public-institution recruitment notices, universities, hospitals, research institutes |

Never bypass a login, CAPTCHA, SMS/WeChat/QR verification, robots restriction, or
rate limit. When a board exposes only a login wall, use it as a user-facing lead and
seek the employer's public job page instead.

## Query pattern

For every role or psychology-major query in `search-queries.md`, run no more than
four source-focused queries per batch. Prefer:

```text
site:zhipin.com <query>
site:zhaopin.com <query>
site:51job.com <query>
site:liepin.com <query>
site:job.iguopin.com <query>
site:yingjiesheng.com <query>
site:careers.<employer-domain> <query>
```

Rotate sources between runs and deduplicate by official URL or company + title + city.
The source is a discovery lead, never proof of an open role, qualification rule, or
deadline.
