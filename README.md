# psy-job-search

一个运行在本地的 AI 求职工作台。项目把候选人资料、职位搜索、岗位匹配、简历与求职信定制、申请记录、面试准备和能力提升组织成一套可由 Agent 执行的工作流，目标是让求职过程可重复、可追踪，并且让个人资料始终掌握在本机。

## 项目定位

`psy-job-search` 是一个以 Claude Code 为主要交互入口、以 Agent Skills 为扩展机制的本地求职自动化框架。它不提供独立的 Web 前端或集中式数据库，而是通过 Markdown、LaTeX、CSV/JSON 和本地目录保存配置、文档与搜索状态。

## 核心功能

- **候选人画像与岗位评估**：维护教育、经历、技能、行为特征、语言和求职偏好，并按技能、经历、行为/文化匹配度评估职位。
- **多来源职位搜索**：通过 `.agents/skills/` 下的可插拔 CLI 搜索 LinkedIn、Jobnet、Jobindex、Jobbank、FreeHire 和 Jobdanmark 等来源；支持 JSON、表格和纯文本输出。
- **职位去重与跟踪**：使用 `job_scraper/seen_jobs.json` 保存已见职位，使用 `job_search_tracker.csv` 记录申请状态，避免重复处理。
- **申请材料生成**：基于 LaTeX 模板生成针对具体公司和岗位的 CV 与求职信，并支持 PDF 校验。
- **申请流程管理**：归档岗位原文、记录申请材料和状态，支持排名、结果跟进和 HTML 报告等命令。
- **面试与能力提升**：根据岗位准备 STAR 面试答案、反问问题，并通过 `upskill/` 工作流规划能力提升。
- **辅助工具与质量保障**：包含薪资数据转换/查询、机器人规则检查、技能 lint、PDF 验证和 Python/CLI 测试；GitHub Actions 会执行持续集成检查。
- **隐私优先**：个人资料和本地申请材料默认由配置与忽略规则控制；推送前应确认没有把个人敏感信息加入 Git。

## 目录结构

```text
psy-job-search/
├── .agents/skills/                  # 可移植的职位门户 Agent Skills 与 CLI
├── .claude/commands/                # /setup、/scrape、/rank、/apply 等命令
├── .claude/skills/
│   ├── job-application-assistant/   # 岗位评估、材料、面试的规范与候选人配置
│   ├── job-scraper/                 # 搜索、去重、健康检查和结果展示流程
│   └── upskill/                     # 能力提升流程
├── assets/                          # 项目资源，例如 mascot 动图
├── cover_letters/                   # 求职信模板、字体和示例
├── cv/                              # CV 模板与示例
├── documents/                       # 本地 CV、岗位、学历和申请材料目录
├── job_scraper/                     # 搜索状态目录（运行时生成）
├── templates/                       # 可注册的自定义模板
├── tests/                           # Python 与工作流结构测试
├── tools/                           # 薪资、lint、PDF、robots 等辅助工具
├── upskill/                         # 能力提升数据目录
├── AGENTS.md                        # 各 Agent 运行时的统一入口说明
├── CLAUDE.md                        # 本地 Agent 行为规则与候选人配置入口
├── SETUP.md                         # 完整安装和初始化说明
└── README.md                        # 项目总览
```

## Agent 配置与使用

### 1. 安装基础环境

需要：

- Python 3.10 或更高版本（CI 使用 Python 3.12）
- [Claude Code](https://claude.com/claude-code) 及可用的 Claude 账号/API 访问
- [Bun](https://bun.sh/)，用于运行职位门户 CLI
- LaTeX：CV 使用 `lualatex`，求职信使用 `xelatex`
- Poppler（`pdfinfo`、`pdftotext`），用于 PDF 验证

各平台的详细安装步骤、字体和 LaTeX 依赖见 [`SETUP.md`](SETUP.md)。

### 2. 初始化候选人配置

在仓库根目录启动 Claude Code，然后运行：

```text
/setup
```

`/setup` 会引导填写候选人资料、目标岗位、地点、语言、搜索策略和模板偏好。规范与资料分别位于：

- [`CLAUDE.md`](CLAUDE.md)：Agent 行为规则、项目约束和候选人配置入口
- [`.claude/skills/job-application-assistant/`](.claude/skills/job-application-assistant/)：候选人画像、评估标准、写作、模板和面试规范
- [`.claude/skills/job-scraper/search-queries.md`](.claude/skills/job-scraper/search-queries.md)：职位搜索关键词与来源策略

也可以按部分重新配置，例如 `/setup --section skills`、`/setup --section experience` 或 `/setup --section search`。

### 3. 常用工作流

```text
/scrape                         # 搜索新职位并去重
/scrape data science            # 聚焦某个方向搜索
/scrape health                  # 检查职位门户健康状况
/rank                           # 对已发现职位进行匹配度排名
/apply <岗位链接或编号>          # 评估、定制材料并记录申请
/interview <岗位>                # 准备面试
/outcome                        # 更新申请结果与后续跟进
/upskill                         # 规划能力提升
/html-report                    # 生成申请汇总报告
```

当用户直接提供岗位链接或岗位文本时，Agent 会先读取岗位和公司信息、评估匹配度，再在确认后生成定制 CV 和求职信。不要把真实个人资料、申请记录或薪资数据推送到公开仓库。

### 4. 添加职位来源或模板

- 使用 `/add-portal` 为本地职位网站生成一个遵循统一接口的搜索 Skill。
- 使用 `/add-template` 注册自己的 CV 或求职信模板，并声明编译引擎、字体、版式和页数限制。
- 新门户 Skill 放在 `.agents/skills/<portal-name>/`，应包含 `SKILL.md`、CLI、依赖和测试；`/scrape` 会自动发现符合约定的门户。

## 运行环境与依赖

Python 工具的可选依赖包括：

```text
openpyxl   # 运行 tools/convert_salary_excel.py 时需要
PyYAML     # 运行 tools/lint_skills.py 时需要
```

职位门户 CLI 的依赖分别记录在 `.agents/skills/*/cli/package.json` 中，在对应目录运行 `bun install`。项目不要求常驻服务；职位搜索需要网络访问，个人文档和状态文件主要保存在本地。

常用本地检查：

```text
python tools/lint_skills.py
python tools/security_guards.py
python -m unittest discover -s tests -t . -v
```

各门户的具体参数以对应的 `SKILL.md` 为准，不要自行猜测 CLI 参数。

## 后续开发计划

- 完善中文求职场景下的职位来源、关键词和匹配规则。
- 增加更多本地招聘网站，并持续维护门户解析器的健康检查与测试。
- 改进职位排序、技能缺口分析和薪资基准的可解释性。
- 增强申请状态、提醒、跟进和材料版本之间的关联。
- 为 CV、求职信和 HTML 报告提供更多可复用模板，并继续提升 PDF 渲染质量。
- 在保护个人隐私的前提下，完善跨 Agent 运行时的兼容性与自动化质量检查。

## 许可证

本项目采用 [`LICENSE`](LICENSE) 中的许可证。使用职位网站和外部服务时，请遵守其服务条款、访问频率限制与隐私要求。
