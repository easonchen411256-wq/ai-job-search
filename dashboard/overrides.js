/* The console's primary path is resume -> agent discovery -> job pool.
   The legacy manual-entry compatibility elements remain hidden so old data actions
   do not break, but are intentionally not available in the user interface. */
(function () {
  const byId = (id) => document.getElementById(id);
  const show = (message) => { const toast = byId("toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 3000); };
  const fetchData = async () => (await fetch("/api/data", { cache: "no-store" })).json();
  const dismissDialog = (dialog) => {
    dialog.querySelector("form")?.reset();
    dialog.close("cancel");
  };
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.querySelectorAll("[data-dialog-cancel]").forEach((button) => button.addEventListener("click", () => dismissDialog(dialog)));
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dismissDialog(dialog); });
    dialog.addEventListener("cancel", () => dialog.querySelector("form")?.reset());
  });
  const renderResumes = (resumes) => {
    const target = byId("resume-list");
    target.innerHTML = resumes.length ? `<strong>已登记的简历</strong><ul>${resumes.map((resume) => `<li>${resume.name}</li>`).join("")}</ul>` : "尚未上传简历。";
  };
  const renderSearchStatus = (request, searchLog = []) => {
    const target = byId("search-status"); if (!request) { target.classList.remove("visible"); return; }
    const labels = { pending_agent: "旧版任务", pending_execution: "待启动", running: "搜索中", completed: "搜索完成", failed: "搜索失败" };
    const status = request.status || "pending_agent"; const sources = (request.sources_checked || []).join("、") || "尚未检索来源";
    const task = request.search_config || {}; const taskText = [task.scope, task.keywords].filter(Boolean).join(" · ");
    const waiting = ["pending_agent", "pending_execution"].includes(status);
    const message = request.message || (waiting ? "任务已保存，但本机尚未连接可执行的搜岗服务。" : "");
    const currentSource = status === "running" ? (request.current_source || sources) : (request.sources_checked || []).length ? sources : "等待首个渠道";
    const currentQuery = task.keywords || "未填写关键词";
    const updated = request.updated_at ? new Date(request.updated_at).toLocaleString("zh-CN", { hour12: false }) : "—";
    const coverage = request.coverage || {};
    const requiredSources = coverage.sources_required || [];
    const requiredGroups = coverage.query_groups_required || [];
    const completedSources = coverage.sources_checked || request.sources_checked || [];
    const completedGroups = coverage.query_groups_checked || [];
    const blocked = coverage.blocked || [];
    const coverageRequired = requiredSources.length + requiredGroups.length;
    const coverageDone = new Set([...completedSources, ...completedGroups, ...blocked]).size;
    const coverageMarkup = coverageRequired ? `<div class="coverage-status"><strong>检索覆盖 ${Math.min(coverageDone, coverageRequired)} / ${coverageRequired}</strong><span>渠道 ${completedSources.length}/${requiredSources.length} · 主题 ${completedGroups.length}/${requiredGroups.length}${blocked.length ? ` · 受阻 ${blocked.length}` : ""}</span></div>` : "";
    const fallbackLogLines = [
      `${updated}｜${labels[status]}`,
      request.current_step || "尚未开始执行",
      message
    ].filter(Boolean);
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const logLines = (searchLog.length ? searchLog : fallbackLogLines).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    target.classList.add("visible"); target.innerHTML = `<div class="search-status-head"><div><p class="eyebrow">SEARCH MONITOR</p><h2>搜岗执行状态</h2><p>${taskText || "尚未设置检索条件"}</p></div><span class="search-badge ${status}">${labels[status]}</span></div><div class="monitor-grid"><div><span>当前阶段</span><strong>${request.current_step || labels[status]}</strong></div><div><span>当前渠道</span><strong>${currentSource}</strong></div><div><span>当前关键词</span><strong>${currentQuery}</strong></div><div><span>最近更新</span><strong>${updated}</strong></div></div><div class="progress-track"><div class="progress-value" style="width:${Number(request.progress || 0)}%"></div></div><div class="search-meta"><span>进度 ${Number(request.progress || 0)}%</span><span>发现 ${Number(request.jobs_found || 0)} 个</span><span>已解析 ${Number(request.jobs_parsed || 0)} 个</span></div>${coverageMarkup}<div class="monitor-log"><strong>运行日志</strong><ul>${logLines}</ul></div>${waiting ? `<p class="executor-hint">当前没有正在运行的搜岗执行器，因此不会发生联网检索。接通执行器后，创建任务会自动转为“搜索中”。</p>` : ""}`;
  };
  const refreshResumes = async () => { const data = await fetchData(); renderResumes(data.resumes || []); renderSearchStatus(data.search_request, data.search_log || []); };
  byId("upload-resume").addEventListener("click", async () => { await refreshResumes(); byId("resume-dialog").showModal(); });
  byId("resume-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const files = Array.from(event.currentTarget.elements.resume.files || []);
    if (!files.length) return show("请选择至少一份简历");
    if (files.some((file) => file.size > 12 * 1024 * 1024)) return show("每份简历均需小于 12MB");
    const upload = async (file) => {
      const content = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const response = await fetch("/api/resumes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, content }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "上传失败");
    };
    try { await Promise.all(files.map(upload)); } catch (error) { return show(error.message || "上传失败"); }
    byId("resume-dialog").close(); event.currentTarget.reset(); await refreshResumes(); show(`已登记 ${files.length} 份简历。现在可新建搜岗任务。`);
  });
  byId("new-search-task").addEventListener("click", async () => {
    const data = await fetchData();
    const running = data.search_request && ["running", "pending_execution"].includes(data.search_request.status);
    const info = byId("search-dialog-info");
    const error = byId("search-dialog-error");
    if (info) info.textContent = running ? "当前已有搜岗任务在执行，完成后才能创建新一轮。" : "";
    if (error) error.textContent = "";
    byId("search-dialog").showModal();
  });
  byId("search-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const errorTarget = byId("search-dialog-error"); const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    if (errorTarget) errorTarget.textContent = ""; submitButton.disabled = true;
    try {
      const roleFamilies = form.getAll("role_families"); if (!roleFamilies.length) { if (errorTarget) errorTarget.textContent = "请至少选择一个岗位方向"; return; }
      const request = { scope: form.get("scope"), keywords: form.get("keywords"), role_families: roleFamilies, sources: form.getAll("sources"), psychology_trigger: form.has("psychology_trigger"), notes: form.get("notes") };
      const response = await fetch("/api/search-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const result = await response.json();
      if (!response.ok) { if (errorTarget) errorTarget.textContent = result.error || "无法开始搜岗"; return; }
      byId("search-dialog").close(); const data = await fetchData(); renderSearchStatus(data.search_request, data.search_log || []); show("已启动本地搜岗执行器，请在状态栏查看实时进度。");
    } catch (error) {
      if (errorTarget) errorTarget.textContent = "无法连接本地服务，请确认工作台已启动后重试。";
    } finally {
      submitButton.disabled = false;
    }
  });
  setInterval(refreshResumes, 5000);
  refreshResumes();
})();
