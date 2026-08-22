# South China Search Queries

This workspace searches **Guangdong and Guangxi only**. Run both the role-led
and psychology-major-led channels in `.claude/skills/job-application-assistant/
10-china-mainland-workflow.md`. Use official employer career sites and official
campus recruitment notices as the preferred source; job boards are discovery
sources and require a JD/detail fetch before a role is classified.

## Sources

Search public pages without logging in. The default source catalogue is:

- **综合招聘：** BOSS直聘、智联招聘、前程无忧、猎聘；
- **互联网/产品：** BOSS直聘、拉勾、脉脉招聘及企业招聘官网；
- **校招/应届：** 应届生求职网、51job 校园招聘、智联校园招聘、高校就业网、**高校人才网（高才网，gaoxiaojob.com）**及企业校招官网；
- **央国企：** 国聘、集团/企业招聘官网、广西相关招聘公告（严格执行广西仅校招/管培、广东默认跳过）；
- **外企/合资：** LinkedIn Jobs 与企业中国区/全球招聘官网；
- **事业单位/研究机构：** 广东、广西人社/事业单位公告，高校、医院、研究院官网；广西另查**广西人才网（gxrc.com）**、广西教育厅及学校官网。

Run each channel through `china-public-job-search` in small batches and resolve a
public employer page wherever possible. This is broad national-channel coverage, not
a claim that every closed, app-only, or login-only platform can be automated.
If a site requires login, CAPTCHA, or SMS/WeChat verification, do not bypass it;
record the result as `Needs user` and continue with other public sources.

## Location terms

Use both province and city wording where relevant:

```text
广东 OR 广东省 OR 广州 OR 深圳 OR 珠海 OR 佛山 OR 东莞 OR 中山 OR 惠州 OR 汕头
广西 OR 广西壮族自治区 OR 南宁 OR 桂林 OR 柳州 OR 北海 OR 玉林 OR 梧州
```

Do not assume a city preference. Use the configured city table in `CLAUDE.md` only
after the candidate fills it.

## P0 role-led queries

```text
"AI产品经理" (广东 OR 广西)
"AI应用产品经理" (广东 OR 广西)
"人工智能产品经理" OR "大模型产品经理" (广东 OR 广西)
"生成式AI产品经理" OR "AIGC产品经理" (广东 OR 广西)
"智能体产品经理" OR "Agent产品经理" (广东 OR 广西)
"算法产品经理" OR "产品经理（AI方向）" OR "产品经理（智能化方向）" (广东 OR 广西)
("AI产品经理" OR "AI应用产品经理" OR "AIGC产品经理" OR "智能体产品经理") (秋招 OR 校园招聘 OR 2027届 OR 2026届 OR 应届生 OR 提前批 OR 实习转正) (广东 OR 广西)
("AI产品经理" OR "人工智能产品经理" OR "大模型产品经理") (最新发布 OR 近7天 OR 近14天) (广东 OR 广西)
"Agent产品经理" OR "智能体产品经理" (广东 OR 广西)
"大模型产品经理" (广东 OR 广西)
"产品经理" OR "产品策划" OR "策略产品经理" (广东 OR 广西)
"用户研究" OR "用户体验研究" OR "用户洞察" (广东 OR 广西)
"消费者洞察" OR "市场研究" OR "产品研究" (广东 OR 广西)
"UX Research" OR "User Research" OR "Consumer Insights" (Guangdong OR Guangxi)
```

### AI 产品经理秋招扩展（每轮选中 AI Product/Product 时必跑）

AI 产品岗位在 BOSS 直聘等平台经常使用项目名称、方向括号或校招批次发布，不能只搜精确的“AI产品经理”。每轮至少覆盖以下来源组合：

```text
site:zhipin.com (AI产品经理 OR AI应用产品经理 OR AIGC产品经理 OR 大模型产品经理) (秋招 OR 校园招聘 OR 2027届 OR 应届生)
site:zhaopin.com (人工智能产品经理 OR 智能体产品经理 OR 产品经理（AI方向）) (校招 OR 2027届)
site:51job.com (AI产品经理 OR 大模型产品经理 OR 产品经理（智能化方向）) (校园招聘 OR 应届生)
site:liepin.com (AI产品经理 OR 生成式AI产品经理 OR 算法产品经理) (秋招 OR 校招)
site:yingjiesheng.com (AI产品经理 OR 人工智能产品经理 OR AIGC OR 智能体) (2027届 OR 秋招 OR 校招)
site:lagou.com (AI产品经理 OR 大模型产品经理 OR Agent产品经理) (校招 OR 应届生)
site:*.com (AI产品经理 OR 人工智能产品经理 OR 大模型产品经理) (2027校园招聘 OR 秋招) (广州 OR 深圳 OR 珠海 OR 佛山 OR 东莞)
```

BOSS 只能看到登录墙或摘要时，保存为 P2“待核验线索”，并继续从企业校招官网、应届生、51job 校招和高校就业网寻找同一岗位的公开 JD；没有公开 JD 不得标为 P0/P1。每轮优先检索最近 14 天发布或仍有未来截止日期的岗位，并按公司+岗位+城市去重。

## Source-focused query templates

For a selected role query, pair it with a small rotating set of source domains. Keep
each run bounded and use the employer's own page for final JD parsing:

```text
site:zhipin.com <role query>
site:zhaopin.com <role query>
site:51job.com <role query>
site:liepin.com <role query>
site:lagou.com <role query>
site:job.iguopin.com <role query>
site:yingjiesheng.com <role query>
site:gaoxiaojob.com <role query>
site:gxrc.com <role query>
site:jyt.gxzf.gov.cn <role query>
site:*.edu.cn <role query> (校园招聘 OR 就业网)
site:*.gov.cn <role query> (招聘 OR 公开招聘)
```

For foreign and joint-venture roles, also run English variants against LinkedIn and
the employer's own careers domain. For a company-specific query, search:

```text
<company> (校园招聘 OR 社会招聘 OR careers) (广东 OR 广西)
site:<company-careers-domain> <role query>
```

## Management-trainee queries

管培生秋招常以项目名称而非“管培生”发布。每轮必须覆盖“直接称呼、培养项目别名、
产品/科技方向、企业官网/高校就业网”四类查询；凡明确有轮岗、培养、储备或未来领导者
机制的应届项目，即使标题不含“管培生”，也按 `Management Trainee` 评估并在备注写明项目别名。

```text
"管理培训生" OR 管培生 (广东 OR 广西)
"产品管培" OR "科技管培" OR "数字化管培" (广东 OR 广西)
"Management Trainee" OR "Graduate Program" (Guangdong OR Guangxi)
(秋招 OR 校园招聘 OR 2027届) (管培生 OR 管理培训生 OR MT OR 储备干部) (广东 OR 广西)
(星计划 OR 菁英计划 OR 领航计划 OR 先锋计划 OR 未来领导者 OR 青年人才计划 OR 储备人才) (广东 OR 广西) (秋招 OR 校园招聘)
(产品 OR 科技 OR 数字化 OR 战略 OR 运营 OR 商业) (管培 OR 培养生 OR 轮岗 OR 储备干部) (广东 OR 广西)
site:gaoxiaojob.com (管理培训生 OR 管培生 OR 储备干部) (广东 OR 广西)
site:yingjiesheng.com (管理培训生 OR 管培生 OR 星计划 OR 菁英计划) (广东 OR 广西)
site:gxrc.com (管理培训生 OR 管培生 OR 储备干部) 广西
```

## No-major-restriction queries（每轮必跑）

大量央国企/集团秋招岗位不限专业。每轮必须单独检索“不限专业/专业不限”岗位，
并在核验 JD 时确认是否确实无专业限制；标题未写但 JD 写明专业不限的同样收录。
此类岗位若属于秋招管培/培养项目，归入 `Management Trainee`；其他方向按实际职责归类。
广东央国企仅在本类“专业不限或明确接受心理学专业”的校招/管培岗位放开收录，其余仍按
“广东央国企默认跳过”处理；广西央国企仍按仅校招/管培收录。

```text
(广东 OR 广西) (不限专业 OR 专业不限) (秋招 OR 校园招聘 OR 管培生 OR 管理培训生)
(广东 OR 广西) (不限专业 OR 专业不限) (2027届 OR 应届生)
site:job.iguopin.com (不限专业 OR 专业不限) (广东 OR 广西) (秋招 OR 校园招聘)
site:gaoxiaojob.com (不限专业 OR 专业不限) (广东 OR 广西) (管理培训生 OR 管培生)
site:yingjiesheng.com (不限专业 OR 专业不限) (广东 OR 广西) (秋招 OR 校园招聘)
site:gxrc.com 广西 (不限专业 OR 专业不限) (校招 OR 校园招聘 OR 管培生)
广西 (央国企 OR 集团) (不限专业 OR 专业不限) (秋招 OR 校园招聘 OR 管培生)
```

核验规则：JD 未明确写专业限制，或专业要求为“不限/理学/工学/管理类等大范围”时，
在 `psychology_trigger` 按实际情况标记；若 JD 明确要求特定专业且不包含心理学，
标 `Skip` 并注明依据。

## Psychology-major-led queries

Search these without a title constraint, then fetch the full JD to confirm the
major requirement:

```text
"心理学" (广东 OR 广西) 招聘
"应用心理学" (广东 OR 广西) 校招
"心理学类" (广东 OR 广西) 招聘
"心理学优先" (广东 OR 广西)
"心理学" "用户研究" (广东 OR 广西)
"心理学" "消费者洞察" (广东 OR 广西)
"心理学" "人才测评" OR "组织发展" (广东 OR 广西)
```

## Psychology-teacher queries（最高优先级：广东、广西所有心理教师相关岗位）

只要与心理教师相关都要收录：高校、职校、中职、技师学院、技校、中小学、教育机构
的心理学/心理健康教育教师岗位。校招、社招、公办、民办均纳入，不受“广西央国企仅
校招/管培”和“广东央国企/事业单位默认跳过”规则限制。优先检索人社局、教育局、
学校官网与高校人才网公告：

```text
(广东 OR 广西) (高校 OR 高职 OR 职校 OR 中职 OR 技师学院 OR 技校 OR 中小学) (心理教师 OR 心理学教师 OR 心理健康教育教师 OR 心理健康教师) 招聘
(广东 OR 广西) (心理专任教师 OR 心理学专任教师 OR 心理健康专任教师 OR 心理健康教育专任教师) (校招 OR 社会招聘 OR 公开招聘)
(广东 OR 广西) (心理辅导教师 OR 心理健康教育中心教师 OR 心理健康课教师 OR 心理学科教师 OR 心理学讲师) 招聘
(广东 OR 广西) 心理健康教育 教师 岗位 (招聘 OR 公告)
site:*.edu.cn (广东 OR 广西) (心理健康 OR 心理学) 教师 招聘
site:*.gov.cn (广东 OR 广西) (心理健康 OR 心理学) 教师 公开招聘
site:gaoxiaojob.com (广东 OR 广西) (心理健康 OR 心理学) 教师
```

## Guangxi dedicated coverage（每轮必跑）

广西心理教师和高校岗位不能只依赖综合招聘平台。每轮至少分别检索高校人才网、高校官网、
广西人才网和广西教育/人社公告；对高才网命中项应打开职位详情或原始公告核验，不只保存关键词页。

```text
site:gaoxiaojob.com 广西 (心理学 OR 应用心理学 OR 心理健康教育) (教师 OR 专任教师 OR 教研室 OR 教育系)
site:gaoxiaojob.com 广西 (心理教师 OR 心理健康教师 OR 心理辅导教师 OR 心理咨询师) 招聘
site:gxrc.com 广西 (心理学 OR 心理健康教育) (教师 OR 专任教师 OR 辅导员) 招聘
site:jyt.gxzf.gov.cn (心理教师 OR 心理健康教育 OR 心理学) (招聘 OR 公开招聘)
site:*.edu.cn 广西 (心理学 OR 心理健康教育) (教师 OR 专任教师 OR 辅导员) 招聘
广西 (管理培训生 OR 管培生 OR MT OR 储备干部 OR 星计划 OR 菁英计划) (秋招 OR 校园招聘)
```

## Guangxi SOE campus-only queries

```text
广西 (央企 OR 国企 OR 国有企业) (校招 OR 校园招聘 OR 应届生 OR 管理培训生)
广西 (央企 OR 国企 OR 国有企业) (社招 OR 社会招聘)
```

The second query is an audit query: confirmed Guangxi SOE social recruitment is
recorded as `Skip` with the reason, not presented as an opportunity. Guangdong SOE
results are also `Skip` by default. **Exception:** 广西高校/职校/技校心理健康专任
教师岗位校招、社招均纳入搜索，不受本规则限制。

## Freshness and evidence rules

- Prefer postings from the last 14 days or with a future confirmed deadline.
- A role with an unknown date may remain P2 only if its posting is still visibly open.
- Search snippets are leads, not JD evidence. Never set psychology trigger,
  recruitment type, employer type, deadline, or hard constraint from a snippet alone.
- Store the original and official URL when both exist.
