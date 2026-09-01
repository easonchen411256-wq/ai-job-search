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
| Comprehensive jobs | BOSS直聘 (`zhipin.com`), 智联招聘 (`zhaopin.com`), 前程无忧 (`51job.com`), 猎聘 (`liepin.com`), 牛客网 (`nowcoder.com`), 实习僧 (`shixiseng.com`) |
| Internet and products | BOSS直聘, 拉勾 (`lagou.com`), 脉脉招聘, 牛客网, 实习僧, and employer career pages |
| Campus and graduate | 应届生求职网 (`yingjiesheng.com`), 51job 校园招聘, 智联校园招聘, 国家大学生就业服务平台/教育部24365, university employment offices, employer campus pages |
| Public employment | 中国公共招聘网、广东公共就业服务、广东/广州/深圳人才网、广西人才网、南宁人才网 |
| Central/state-owned | 国聘 (`job.iguopin.com`), 国资委/央国企平台, group/company recruitment pages, Guangxi employer announcements; apply the Guangxi campus-only and Guangdong exclusion policy |
| Foreign and joint ventures | LinkedIn Jobs, Indeed, Glassdoor plus the employer's China/global career page; use English title variants too |
| Public institutions | Guangdong/Guangxi human-resources and public-institution recruitment notices, education bureaus, universities, hospitals, research institutes |

Never bypass a login, CAPTCHA, SMS/WeChat/QR verification, robots restriction, or
rate limit. When a board exposes only a login wall, use it as a user-facing lead and
seek the employer's public job page instead.

## Query pattern

For every role or psychology-major query in `search-queries.md`, run no more than
four source-focused queries per batch. For AI-product autumn searches, use separate
batches for job boards and employer campus pages so a login wall on BOSS does not
hide newer postings. Prefer:

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

## AI-product autumn coverage

When the query includes AI product or product roles, expand the title search to
`AI产品经理`, `AI应用产品经理`, `人工智能产品经理`, `大模型产品经理`, `生成式AI产品经理`,
`AIGC产品经理`, `智能体产品经理`, `Agent产品经理`, `算法产品经理`, `产品经理（AI方向）`,
`产品经理（智能化方向）` and `产品策划（AI方向）`. Pair these with `秋招`, `校园招聘`,
`2027届`, `2026届`, `应届生`, `提前批`, `实习转正`, `最新发布`, `近7天` and `近14天`.
Search BOSS直聘, 智联招聘, 51job, 猎聘, 拉勾, 应届生 and employer campus pages
separately. A login-walled result is a P2 discovery lead only; verify it against a
public JD or official campus notice before assigning P0/P1.
