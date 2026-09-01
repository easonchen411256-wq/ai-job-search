# 求职工作台

本地运行：

```powershell
node dashboard/server.js
```

然后在浏览器打开 `http://127.0.0.1:4173`。

Windows 下也可以直接双击仓库根目录的 `启动求职工作台.bat`，它会自动启动并打开页面。关闭名为“求职工作台服务”的小窗口即可停止服务。

工作台读取并写回项目原有数据：`job_scraper/seen_jobs.json`、
`job_search_tracker.csv` 和 `job_scraper/follow_up.csv`。它不会登录招聘网站或替用户投递。

使用顺序：上传简历 → 点击“开始搜岗”登记搜索任务 → 由 Agent 运行 `/scrape` →
搜索、解析和分级完成的岗位自动显示在岗位池。网页不会伪装成搜索 Agent：它只负责
保存简历、呈现结果和记录你的人工筛选决定。
