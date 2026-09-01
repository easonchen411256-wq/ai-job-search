/*
 * Local Job Search Console. No dependencies: Node.js plus the repository's
 * existing JSON/CSV files are the complete data layer.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 4173);
const JOBS_FILE = path.join(ROOT, "job_scraper", "seen_jobs.json");
const TRACKER_FILE = path.join(ROOT, "job_search_tracker.csv");
const TASKS_FILE = path.join(ROOT, "job_scraper", "follow_up.csv");
const RESUME_DIR = path.join(ROOT, "documents", "cv");
const SEARCH_REQUEST_FILE = path.join(ROOT, "job_scraper", "search_request.json");
const SEARCH_LOG_FILE = path.join(ROOT, "job_scraper", "search_run.log");
const TRACKER_HEADER = ["date", "company", "sector", "role", "role_type", "channel", "status", "contact_person", "fit_rating", "notes", "cv_file", "cover_letter_file", "source"];
const TASK_HEADER = ["task_id", "company", "job_title", "job_url", "task_type", "event_type", "title", "date", "start_time", "end_time", "deadline", "priority", "status", "source", "auto_created", "related_job_status", "notes", "created_at", "completed_at"];
const STAGES = new Set(["pending_review", "ready_to_apply", "applied", "interview", "offer", "rejected"]);
const PRIORITIES = new Set(["P0", "P1", "P2", "Skip"]);
// Single source of truth for search-task defaults. The dashboard front-end reads
// this from /api/data and renders its checkboxes dynamically, so a channel or role
// family is added here and nowhere else.
const DEFAULT_SEARCH_CONFIG = {
  scope: "广东、广西",
  keywords: "AI 产品、产品经理、用户研究、用户洞察、管培生、心理教师",
  role_families: ["AI Product", "Product", "UXR / Insight", "Management Trainee", "Psychology Teaching"],
  sources: [
    "BOSS直聘",
    "智联招聘 / 51job",
    "猎聘 / 拉勾 / 脉脉",
    "牛客网 / 实习僧 / 应届生",
    "Indeed / Glassdoor / LinkedIn",
    "应届生 / 高校就业网",
    "国家大学生就业服务平台 / 教育部24365",
    "高校人才网（高才网）",
    "中国公共招聘网 / 广东公共就业服务",
    "广东人才网 / 广州人才网 / 深圳人才网",
    "广西人才网 / 南宁人才网 / 广西教育人社公告",
    "国聘 / 国企官网",
    "国资委 / 国资央企招聘平台",
    "地方国资委 / 产业集团招聘页",
    "企业官方招聘页",
    "外企中国区 / 远程招聘官网",
    "公开招聘公告",
    "高校学工 / 心理健康中心",
    "卫健 / 医院系统招聘",
    "省市人社 / 教育局公告",
    "事业单位 / 科研院所 / 医学院校官网"
  ],
  psychology_trigger: true,
  notes: "心理教师相关岗位为最高优先：广东、广西高校/职校/技校/中小学等心理教师岗位，秋招、实习和社招均纳入搜索。"
};
const DEFAULT_SEARCH_KEYWORDS = DEFAULT_SEARCH_CONFIG.keywords;
let activeSearchProcess = null;

function now() { return new Date().toISOString(); }
function today() { return now().slice(0, 10); }
function keyFor(company, title) { return `${company || ""}__${title || ""}`.trim().toLowerCase(); }
function safeText(value) { return typeof value === "string" ? value.trim() : ""; }
function id() { return crypto.randomUUID(); }
function normaliseRecruitmentType(value, ...context) {
  const raw = [value, ...context].map(safeText).join(" ").toLowerCase();
  if (/实习|intern(ship)?/.test(raw)) return "实习";
  if (/秋招|校园招聘|校招|应届生招聘|应届毕业生|campus|graduate[_\s-]?program/.test(raw)) return "秋招";
  if (/社招|社会招聘|社会人才|社会岗|social/.test(raw)) return "社招";
  return "待核验";
}
function buildCoveragePlan(config) {
  const roles = new Set(config.role_families || []);
  const queryGroups = [];
  if (roles.has("AI Product") || roles.has("Product")) queryGroups.push("AI产品：直接岗位名称", "AI产品：秋招/校招别名", "AI产品：企业校招官网", "AI产品：BOSS/综合平台最近发布");
  if (roles.has("Management Trainee")) queryGroups.push("管培：直接称呼", "管培：秋招项目别名", "管培：产品/科技培养项目", "管培：企业官网/高校就业网");
  if (roles.has("Psychology Teaching")) queryGroups.push("心理教师：高校人才网", "心理教师：广西人才网/教育人社", "心理教师：高校官网", "心理教师：公开招聘公告");
  queryGroups.push("不限专业：央国企/集团秋招", "不限专业：综合平台/就业网");
  return {
    sources_required: [...new Set(config.sources || [])], sources_checked: [],
    query_groups_required: queryGroups, query_groups_checked: [], blocked: []
  };
}

function ensureFile(file, initial) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, initial, "utf8");
}
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, file);
}
function appendSearchLog(message) {
  fs.mkdirSync(path.dirname(SEARCH_LOG_FILE), { recursive: true });
  const line = String(message).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
  if (!line) return;
  const noisy = [
    /^stderr:\s*$/,
    /WARN codex_/,
    /succeeded in \d+ms/,
    /exited \d+ in \d+ms/,
    /stderr: exec /,
    /^stderr: web search:\s*$/,
    /tokens used \d+/,
    /You are the local search executor/
  ];
  if (noisy.some((pattern) => pattern.test(line))) return;
  fs.appendFileSync(SEARCH_LOG_FILE, `${now()} | ${line}\n`, "utf8");
}
function recentSearchLog() {
  try {
    return fs.readFileSync(SEARCH_LOG_FILE, "utf8").trim().split(/\r?\n/).filter(Boolean)
      .map((line) => line.replace(/\s+/g, " ").trim().slice(0, 140)).slice(-8);
  } catch { return []; }
}
function startSearchExecutor(request) {
  if (activeSearchProcess) return false;
  const config = request.search_config || {};
  const coverage = request.coverage || buildCoveragePlan(config);
  const prompt = `You are the local search executor for this personal job-search workspace.\n\nTask: find currently open public job postings in ${config.scope || "Guangdong and Guangxi"} for: ${config.keywords || DEFAULT_SEARCH_KEYWORDS}. Role families: ${(config.role_families || []).join(", ")}. Channels: ${(config.sources || []).join(", ")}. Psychology-major trigger: ${config.psychology_trigger ? "enabled" : "disabled"}. Extra constraints: ${config.notes || "none"}.\n\nRead CLAUDE.md and .claude/skills/job-scraper/SKILL.md first.\n\nCoverage contract (all entries must be checked or explicitly recorded as blocked): ${JSON.stringify(coverage)}. After each source batch, PATCH /api/search-request with the accumulated sources_checked plus coverage: {sources_checked, query_groups_checked, blocked}. Do not mark the task completed while a required item is neither checked nor blocked.\n\nNo-major-restriction lane (mandatory every run): many central/state-owned and group campus programs accept any major. Actively query 不限专业/专业不限 postings on 国聘、应届生求职网、高才网、广西人才网 and official campus notices, and open the JD before storing. A posting whose JD states 专业不限/不限专业 or accepts psychology majors enters the pool; quote the JD wording in psychology_evidence or notes. Guangdong SOE default-Skip does NOT apply to verified major-unrestricted campus or management-trainee postings. Guangxi SOE postings remain campus/management-trainee only.\n\nPsychology-teacher roles are the TOP-PRIORITY lane. When the user enters “心理教师”, treat it as an umbrella query, not an exact-title query: automatically expand the search to every title matching “心理 + any description + 教师”, such as 心理健康教师、心理健康教育教师、心理学教师、心理专任教师、心理辅导教师、心理健康课教师 and 心理学科教师. Search these roles at universities, vocational colleges, technical schools, primary/secondary schools, and education institutions in both provinces. Campus and social, public and private employers all count. Record every matching posting even as a P2 discovery lead when the full JD is not public, and label it “心理教师相关” in the notes.\n\nRun a mandatory Guangxi coverage lane in addition to the general search: query 高校人才网/高才网 (gaoxiaojob.com), 广西人才网 (gxrc.com), 广西教育厅公告, 广西高校官网 and public education/personnel notices. For gaoxiaojob results, open the job-detail or original announcement before storing; do not stop at its keyword-result page.\n\nFor Management Trainee, do not only search the literal terms “管理培训生” and “管培生”. Search autumn-campus aliases such as MT、储备干部、星计划、菁英计划、领航计划、先锋计划、未来领导者、青年人才计划、培养生 and rotation programs, including product/technology/digital/strategy/operations streams. If a verified campus project clearly has a rotation, cultivation, reserve-talent or future-leader mechanism, classify it as Management Trainee even if its title uses a project name.\n\nUse Chinese display titles and Chinese city names: translate common English titles/cities (e.g. AI Product Manager -> AI产品经理, User Research -> 用户研究, Shenzhen -> 深圳), and keep the original English title in title_en or notes when translating.\n\nRun two clearly separated lanes: (1) discovery: cover every selected source category with targeted queries, including BOSS直聘, 智联招聘, 51job, 猎聘, 拉勾, 脉脉, 应届生, 高校就业网, 高校人才网, 广西人才网, 国聘, 国资委/国资央企招聘平台, state-owned employer pages, official company careers pages, 高校学工/心理健康中心公告, 卫健/医院系统招聘公告, 省市人社/教育局公告, LinkedIn/foreign-company pages, and public recruitment notices; (2) verification: fetch public JD or official notice before assigning fit. Do not log in, bypass CAPTCHA, fill forms, submit applications, or invent requirements. A login-walled board result may be saved as a P2 discovery lead only, with rank_verdict='待核验线索', evidence_gaps naming the missing JD/eligibility, and notes stating it must be opened and verified by the user. Do not label a lead P0 or P1. For every verified live posting, parse the JD and classify it P0/P1/P2/Skip.\n\nEvery posting added to the job pool MUST include recruitment_type: use “实习” for internship roles, “秋招” for campus/autumn-graduate recruitment, and “社招” for social/experienced-hire recruitment. Infer it from the public title, notice or JD; if evidence is insufficient, set it to “待核验”. Use source batches and update progress after each batch; target broad coverage rather than stopping after the first two verified roles.\n\nThe dashboard server is already running at http://127.0.0.1:4173. Add each verified job or clearly marked discovery lead with POST /api/jobs using its source URL, title, company, Guangdong/Guangxi location, role family, priority, recruitment_type, psychology evidence where applicable, strengths, gaps, and evidence gaps. At the end PATCH status=completed, progress=100. In the final message, report which Guangxi source categories, Management-Trainee query groups and no-major-restriction sources were actually checked. If blocked by network or no reliable results, PATCH completed with an honest message and zero or fewer jobs; only use failed for a real execution error. Do not edit source code, resumes, or application forms.`;
  const command = "codex.cmd exec --approve-for-me --output-last-message job_scraper\\last_search_agent_message.md -";
  // The nested executor must not inherit this desktop session's own Codex session
  // variables: reusing the same session/thread/override values makes the local API
  // load a duplicate tool set ("Tool names must be unique") and the run aborts.
  const childEnv = { ...process.env };
  for (const key of ["CODEX_SESSION_ID", "CODEX_THREAD_ID", "CODEX_INTERNAL_ORIGINATOR_OVERRIDE", "CODEX_PERMISSION_PROFILE"]) delete childEnv[key];
  const child = spawn("cmd.exe", ["/d", "/s", "/c", command], { cwd: ROOT, windowsHide: true, env: childEnv });
  activeSearchProcess = child; appendSearchLog("本地 Codex 搜岗执行器已启动。");
  child.stdout.on("data", (data) => appendSearchLog(data.toString("utf8")));
  child.stderr.on("data", (data) => appendSearchLog(`stderr: ${data.toString("utf8")}`));
  child.on("error", (error) => {
    appendSearchLog(`执行器启动失败：${error.message}`); activeSearchProcess = null;
    const current = readJson(SEARCH_REQUEST_FILE, {}); current.status = "failed"; current.current_step = "执行器启动失败"; current.message = error.message; current.updated_at = now(); writeJson(SEARCH_REQUEST_FILE, current);
  });
  child.on("close", (code) => {
    activeSearchProcess = null; appendSearchLog(`本地执行器已退出，退出码 ${code ?? "unknown"}。`);
    const current = readJson(SEARCH_REQUEST_FILE, {});
    if (current.status === "running") { current.status = code === 0 ? "completed" : "failed"; current.progress = code === 0 ? 100 : current.progress || 0; current.current_step = code === 0 ? "本轮搜岗执行结束" : "搜岗执行失败"; current.message = code === 0 ? (current.message || "执行器已结束；请查看岗位池与运行日志。") : "执行器异常退出；请查看运行日志。"; current.updated_at = now(); writeJson(SEARCH_REQUEST_FILE, current); }
  });
  child.stdin.end(prompt, "utf8"); return true;
}
function parseCsv(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); if (row.some((part) => part !== "")) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] || ""])));
}
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function writeCsv(file, header, rows) {
  const content = [header, ...rows.map((row) => header.map((name) => row[name] ?? ""))]
    .map((row) => row.map(csvCell).join(",")).join("\n").concat("\n");
  fs.writeFileSync(file, content, "utf8");
}
function readCsv(file, header) {
  ensureFile(file, `${header.join(",")}\n`);
  return parseCsv(fs.readFileSync(file, "utf8"));
}
function normaliseStage(stage) {
  const value = safeText(stage).toLowerCase();
  if (["drafted", "ready_to_apply"].includes(value)) return "ready_to_apply";
  if (["applied", "active"].includes(value)) return "applied";
  if (["interview"].includes(value)) return "interview";
  if (["offer", "hired"].includes(value)) return "offer";
  if (["rejected", "no_response", "offer_declined", "withdrawn"].includes(value)) return "rejected";
  return "pending_review";
}
function readStore() {
  ensureFile(JOBS_FILE, '{"seen": {}}\n');
  const store = readJson(JOBS_FILE, { seen: {} });
  if (!store.seen || typeof store.seen !== "object") store.seen = {};
  return store;
}
function getJobs() {
  const store = readStore();
  const tracker = readCsv(TRACKER_FILE, TRACKER_HEADER);
  const byTracker = new Map(tracker.map((row) => [keyFor(row.company, row.role), row]));
  return Object.entries(store.seen).map(([key, raw]) => {
    const tracked = byTracker.get(keyFor(raw.company, raw.title));
    const workflow = raw.workflow_status || (tracked ? normaliseStage(tracked.status) : "pending_review");
    return {
      key, title: raw.title || "未命名岗位", company: raw.company || "未知公司", url: raw.official_url || raw.url || "",
      source: raw.source || raw.portal || "", province: raw.province || "unknown", city: raw.city || "unknown",
      company_type: raw.company_type || "unknown", recruitment_type: normaliseRecruitmentType(raw.recruitment_type, raw.title, raw.notes, raw.source, raw.responsibilities),
      role_family: raw.role_family || "other", psychology_trigger: Boolean(raw.psychology_trigger),
      psychology_trigger_type: raw.psychology_trigger_type || "none", psychology_evidence: raw.psychology_evidence || "",
      priority: raw.priority || "P2", workflow_status: workflow, deadline: raw.deadline || "",
      rank_score: raw.rank_score ?? null, rank_verdict: raw.rank_verdict || "", strengths: raw.strengths || [], gaps: raw.gaps || [],
      responsibilities: raw.responsibilities || "", must_have_skills: raw.must_have_skills || [], nice_to_have_skills: raw.nice_to_have_skills || [],
      hard_constraints: raw.hard_constraints || [], evidence_gaps: raw.evidence_gaps || [], notes: raw.notes || "", first_seen: raw.first_seen || "",
      discovery_status: raw.status || "new", tracker_status: tracked?.status || ""
    };
  }).sort((a, b) => (a.priority + a.company).localeCompare(b.priority + b.company, "zh-CN"));
}
function getTasks() { return readCsv(TASKS_FILE, TASK_HEADER); }
function send(res, status, body, type = "application/json; charset=utf-8") { res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" }); res.end(body); }
function sendJson(res, status, value) { send(res, status, JSON.stringify(value)); }
function readBody(req) { return new Promise((resolve, reject) => { let body = ""; req.on("data", (chunk) => { body += chunk; if (body.length > 1_000_000) reject(new Error("Request too large")); }); req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("Invalid JSON")); } }); }); }
function mergeTracker(job, stage) {
  if (!["applied", "interview", "offer", "rejected"].includes(stage)) return;
  const rows = readCsv(TRACKER_FILE, TRACKER_HEADER);
  const target = keyFor(job.company, job.title);
  const trackerStatus = stage === "offer" ? "offer" : stage;
  const existing = rows.find((row) => keyFor(row.company, row.role) === target);
  if (existing) existing.status = trackerStatus;
  else rows.push({ date: today(), company: job.company, sector: "", role: job.title, role_type: job.role_family || "", channel: job.source || "online", status: trackerStatus, contact_person: "", fit_rating: job.rank_score ?? "", notes: "已由工作台确认状态", cv_file: "", cover_letter_file: "", source: job.url || "" });
  writeCsv(TRACKER_FILE, TRACKER_HEADER, rows);
}
function createDeadlineTask(job) {
  if (!job.deadline) return;
  const tasks = getTasks();
  const exists = tasks.some((task) => task.company === job.company && task.job_title === job.title && task.event_type === "application_deadline");
  if (!exists) {
    tasks.push({ task_id: id(), company: job.company, job_title: job.title, job_url: job.url || "", task_type: "recruitment_event", event_type: "application_deadline", title: "网申截止", date: "", start_time: "", end_time: "", deadline: job.deadline, priority: job.priority || "P2", status: "pending", source: job.source || "", auto_created: "true", related_job_status: job.workflow_status || "pending_review", notes: "来自已确认岗位截止日期", created_at: now(), completed_at: "" });
    writeCsv(TASKS_FILE, TASK_HEADER, tasks);
  }
}
function dashboardData() {
  const jobs = getJobs(); const tasks = getTasks();
  const counts = Object.fromEntries(["pending_review", "ready_to_apply", "applied", "interview", "offer", "rejected", "P0", "P1", "P2", "Skip"].map((item) => [item, 0]));
  jobs.forEach((job) => { counts[job.workflow_status] = (counts[job.workflow_status] || 0) + 1; counts[job.priority] = (counts[job.priority] || 0) + 1; });
  const resumes = fs.existsSync(RESUME_DIR) ? fs.readdirSync(RESUME_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => ({ name: entry.name, size: fs.statSync(path.join(RESUME_DIR, entry.name)).size })) : [];
  const searchRequest = fs.existsSync(SEARCH_REQUEST_FILE) ? readJson(SEARCH_REQUEST_FILE, null) : null;
  return { jobs, tasks, counts, resumes, search_request: searchRequest, search_log: recentSearchLog(), search_defaults: DEFAULT_SEARCH_CONFIG, generated_at: now() };
}
async function api(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/data") return sendJson(res, 200, dashboardData());
  if (req.method === "POST" && pathname === "/api/resumes") {
    const input = await readBody(req); const original = safeText(input.name);
    const extension = path.extname(original).toLowerCase();
    if (!['.pdf', '.doc', '.docx', '.txt'].includes(extension)) return sendJson(res, 400, { error: "仅支持 PDF、Word 或 TXT 简历" });
    if (typeof input.content !== "string" || !input.content.startsWith("data:")) return sendJson(res, 400, { error: "简历文件无效" });
    const raw = input.content.slice(input.content.indexOf(",") + 1); const buffer = Buffer.from(raw, "base64");
    if (!buffer.length || buffer.length > 12 * 1024 * 1024) return sendJson(res, 400, { error: "简历文件需小于 12MB" });
    const stem = path.basename(original, extension).replace(/[^\w\u4e00-\u9fff.-]/g, "_").slice(0, 80) || "resume";
    fs.mkdirSync(RESUME_DIR, { recursive: true }); fs.writeFileSync(path.join(RESUME_DIR, `${stem}${extension}`), buffer);
    return sendJson(res, 201, { ok: true });
  }
  if (req.method === "POST" && pathname === "/api/search-request") {
    const input = await readBody(req);
    const resumes = fs.existsSync(RESUME_DIR) ? fs.readdirSync(RESUME_DIR).filter((name) => !name.startsWith(".")) : [];
    if (!resumes.length) return sendJson(res, 400, { error: "请先上传简历" });
    const list = (value) => Array.isArray(value) ? value.map(safeText).filter(Boolean).slice(0, 20) : [];
    const searchConfig = { scope: safeText(input.scope) || DEFAULT_SEARCH_CONFIG.scope, keywords: safeText(input.keywords) || DEFAULT_SEARCH_CONFIG.keywords, role_families: list(input.role_families), sources: list(input.sources), psychology_trigger: Boolean(input.psychology_trigger), notes: safeText(input.notes) };
    if (activeSearchProcess) return sendJson(res, 409, { error: "已有搜岗任务正在执行，请等待完成后再创建下一轮。" });
    const request = { requested_at: now(), updated_at: now(), status: "running", progress: 1, current_step: "正在启动本地搜岗执行器", current_source: "初始化", message: "已启动本地搜索。正在读取简历、检索条件和公开招聘渠道。", sources_checked: [], coverage: buildCoveragePlan(searchConfig), jobs_found: 0, jobs_parsed: 0, resumes, search_config: searchConfig, instruction: "Run the ai-job-search /scrape workflow. Discover, parse, and classify only; do not log in, fill forms, or submit applications." };
    fs.writeFileSync(SEARCH_LOG_FILE, "", "utf8"); writeJson(SEARCH_REQUEST_FILE, request);
    if (!startSearchExecutor(request)) return sendJson(res, 409, { error: "已有搜岗任务正在执行。" });
    return sendJson(res, 202, { ok: true, message: "已启动本地搜岗执行器" });
  }
  if (req.method === "PATCH" && pathname === "/api/search-request") {
    const input = await readBody(req); const request = fs.existsSync(SEARCH_REQUEST_FILE) ? readJson(SEARCH_REQUEST_FILE, {}) : {};
    const statuses = new Set(["pending_execution", "running", "completed", "failed"]);
    if (input.status && statuses.has(input.status)) request.status = input.status;
    if (Number.isFinite(input.progress)) request.progress = Math.max(0, Math.min(100, Math.round(input.progress)));
    for (const field of ["current_step", "current_source", "message"]) if (typeof input[field] === "string") request[field] = input[field].slice(0, 500);
    for (const field of ["jobs_found", "jobs_parsed"]) if (Number.isFinite(input[field])) request[field] = Math.max(0, Math.round(input[field]));
    if (Array.isArray(input.sources_checked)) request.sources_checked = input.sources_checked.map((item) => safeText(item)).filter(Boolean).slice(0, 20);
    if (input.coverage && typeof input.coverage === "object") {
      const coverage = request.coverage || buildCoveragePlan(request.search_config || {});
      const allowedSources = new Set(coverage.sources_required || []); const allowedGroups = new Set(coverage.query_groups_required || []);
      if (Array.isArray(input.coverage.sources_checked)) coverage.sources_checked = input.coverage.sources_checked.map(safeText).filter((item) => allowedSources.has(item)).slice(0, 20);
      if (Array.isArray(input.coverage.query_groups_checked)) coverage.query_groups_checked = input.coverage.query_groups_checked.map(safeText).filter((item) => allowedGroups.has(item)).slice(0, 20);
      if (Array.isArray(input.coverage.blocked)) coverage.blocked = input.coverage.blocked.map(safeText).filter(Boolean).slice(0, 20);
      request.coverage = coverage;
    }
    request.updated_at = now(); writeJson(SEARCH_REQUEST_FILE, request); return sendJson(res, 200, { ok: true, request });
  }
  if (req.method === "POST" && pathname === "/api/jobs") {
    const input = await readBody(req); const company = safeText(input.company); const title = safeText(input.title);
    if (!company || !title) return sendJson(res, 400, { error: "公司和岗位名称不能为空" });
    const store = readStore(); const key = `${keyFor(company, title)}__${Date.now()}`;
    const stringList = (value) => Array.isArray(value) ? value.map(safeText).filter(Boolean).slice(0, 12) : [];
    const job = { title, company, url: safeText(input.url), official_url: safeText(input.official_url) || safeText(input.url), source: safeText(input.source) || "manual", province: safeText(input.province) || "unknown", city: safeText(input.city) || "unknown", company_type: safeText(input.company_type) || "unknown", recruitment_type: normaliseRecruitmentType(input.recruitment_type, title, input.notes, input.source, input.responsibilities), role_family: safeText(input.role_family) || "other", priority: PRIORITIES.has(input.priority) ? input.priority : "P2", workflow_status: "pending_review", deadline: safeText(input.deadline), psychology_trigger: Boolean(input.psychology_trigger), psychology_trigger_type: safeText(input.psychology_trigger_type) || (input.psychology_trigger ? "accepted" : "none"), psychology_evidence: safeText(input.psychology_evidence), rank_score: Number.isFinite(input.rank_score) ? input.rank_score : null, rank_verdict: safeText(input.rank_verdict), strengths: stringList(input.strengths), gaps: stringList(input.gaps), hard_constraints: stringList(input.hard_constraints), evidence_gaps: stringList(input.evidence_gaps), responsibilities: safeText(input.responsibilities), must_have_skills: stringList(input.must_have_skills), nice_to_have_skills: stringList(input.nice_to_have_skills), first_seen: today(), status: "new", notes: safeText(input.notes) };
    store.seen[key] = job; writeJson(JOBS_FILE, store); createDeadlineTask(job); return sendJson(res, 201, { ok: true, key });
  }
  const jobMatch = pathname.match(/^\/api\/jobs\/(.+)$/);
  if (req.method === "PATCH" && jobMatch) {
    const key = decodeURIComponent(jobMatch[1]); const input = await readBody(req); const store = readStore(); const job = store.seen[key];
    if (!job) return sendJson(res, 404, { error: "岗位不存在" });
    if (input.priority && PRIORITIES.has(input.priority)) job.priority = input.priority;
    if (input.workflow_status && STAGES.has(input.workflow_status)) { job.workflow_status = input.workflow_status; mergeTracker(job, input.workflow_status); }
    if (typeof input.notes === "string") job.notes = input.notes.trim();
    writeJson(JOBS_FILE, store); createDeadlineTask(job); return sendJson(res, 200, { ok: true });
  }
  if (req.method === "POST" && pathname === "/api/tasks") {
    const input = await readBody(req); const title = safeText(input.title);
    if (!title) return sendJson(res, 400, { error: "待办标题不能为空" });
    const tasks = getTasks(); tasks.push({ task_id: id(), company: safeText(input.company), job_title: safeText(input.job_title), job_url: safeText(input.job_url), task_type: input.task_type === "recruitment_event" ? "recruitment_event" : "personal_task", event_type: safeText(input.event_type) || "other", title, date: safeText(input.date), start_time: safeText(input.start_time), end_time: "", deadline: safeText(input.deadline), priority: PRIORITIES.has(input.priority) ? input.priority : "P2", status: "pending", source: "manual", auto_created: "false", related_job_status: safeText(input.related_job_status), notes: safeText(input.notes), created_at: now(), completed_at: "" }); writeCsv(TASKS_FILE, TASK_HEADER, tasks); return sendJson(res, 201, { ok: true });
  }
  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (req.method === "PATCH" && taskMatch) {
    const input = await readBody(req); const tasks = getTasks(); const task = tasks.find((item) => item.task_id === decodeURIComponent(taskMatch[1]));
    if (!task) return sendJson(res, 404, { error: "待办不存在" });
    if (["pending", "completed", "cancelled"].includes(input.status)) { task.status = input.status; task.completed_at = input.status === "completed" ? now() : ""; }
    writeCsv(TASKS_FILE, TASK_HEADER, tasks); return sendJson(res, 200, { ok: true });
  }
  return sendJson(res, 404, { error: "Not found" });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`); const pathname = decodeURIComponent(url.pathname);
  try {
    if (pathname.startsWith("/api/")) return await api(req, res, pathname);
    const file = pathname === "/" ? path.join(__dirname, "index.html") : path.join(__dirname, pathname);
    if (!file.startsWith(__dirname) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    const mime = file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".js") ? "application/javascript; charset=utf-8" : "text/html; charset=utf-8";
    send(res, 200, fs.readFileSync(file), mime);
  } catch (error) { sendJson(res, 400, { error: error.message || "请求失败" }); }
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Job Search Console: http://127.0.0.1:${PORT}`);
  const pending = readJson(SEARCH_REQUEST_FILE, null);
  if (pending && ["pending_agent", "pending_execution"].includes(pending.status)) {
    pending.status = "running"; pending.progress = 1; pending.current_step = "正在恢复本地搜岗执行器"; pending.current_source = "初始化";
    pending.message = "检测到待执行任务，已在工作台启动后自动恢复搜索。"; pending.updated_at = now();
    if (!pending.search_config) pending.search_config = { ...DEFAULT_SEARCH_CONFIG };
    writeJson(SEARCH_REQUEST_FILE, pending); fs.writeFileSync(SEARCH_LOG_FILE, "", "utf8"); startSearchExecutor(pending);
  }
});
module.exports = server;
