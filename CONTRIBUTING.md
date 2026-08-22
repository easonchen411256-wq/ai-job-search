# 参与修改

这是个人使用的 AI 求职工作台。修改应优先服务于本项目的真实使用流程：本地搜岗、岗位池筛选、简历与申请材料管理，以及申请进度记录。

## 修改前

- 先阅读 `AGENTS.md`、`CLAUDE.md` 和对应目录的 README。
- 不要提交真实简历、联系方式、薪资数据、申请记录或招聘网站登录信息。
- 岗位搜索只能使用公开页面，不绕过登录、验证码或访问限制。

## 修改后检查

- 工作台：`node dashboard/server.js`，确认 `http://127.0.0.1:4173` 可以打开。
- Python 工具：`python -m compileall tools salary_lookup.py`。
- CLI 技能：在对应 `.agents/skills/*/cli` 目录运行 `bun test`（已安装 Bun 时）。
- 文档、目录说明和实际文件保持一致。

## 提交规范

提交信息使用简短的动词开头，例如：

```text
feat: improve Guangxi job coverage
fix: make job-pool filters effective
docs: sync personal workspace guide
```

每次提交只解决一个清晰问题。推送前检查 `git status`，确认没有把个人资料或临时归档文件加入提交。

## 反馈

请在本仓库的 Issues 中描述复现步骤、期望行为和实际行为，并附上不包含个人信息的日志片段。
