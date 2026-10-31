/* 杭电奖助学金指南 — 前端交互（无框架、无网络请求、无本地存储） */
(function () {
  "use strict";

  const DATA = window.HDU_AID_DATA;
  const MATCHER = window.HDU_MATCHER;
  const app = document.getElementById("app");
  if (!DATA || !MATCHER) {
    app.innerHTML = '<div class="notice red">数据或匹配脚本加载失败，请确认 data/projects.js 与 js/matcher.js 存在。</div>';
    return;
  }

  const projects = DATA.projects;
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const sourcesById = Object.fromEntries(DATA.sources.map((s) => [s.id, s]));
  const categoryById = Object.fromEntries(DATA.categories.map((c) => [c.id, c]));
  const filter = { q: "", category: "all", status: "all" };
  let lastMatch = null;

  const STATUS_BADGE = {
    green: "green", amber: "amber", red: "red", gray: "gray", blue: "blue"
  };
  const SOURCE_LABEL = {
    valid: "官方可访问",
    outdated: "历史版本",
    expired: "原官方链接可能失效",
    lead: "仅标题线索",
    policy: "政策/目录"
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  function badge(text, tone) {
    return `<span class="badge ${esc(tone || "gray")}">${esc(text)}</span>`;
  }

  function sourceCount(project) {
    return (project.sourceIds || []).length;
  }

  function sourcesFor(project) {
    return (project.sourceIds || []).map((id) => sourcesById[id]).filter(Boolean);
  }

  function sourceLink(source) {
    if (!source) return "";
    if (source.status === "expired") {
      return `<a class="source-link source-expired" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}（原官方链接可能失效）<span aria-hidden="true">↗</span></a>`;
    }
    if (!source.url) {
      return `<span class="source-expired">官方链接暂缺，需人工核实</span>`;
    }
    return `<a class="source-link" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}<span aria-hidden="true">↗</span></a>`;
  }

  function sourceList(project) {
    const list = sourcesFor(project);
    if (!list.length) {
      return `<p class="source-expired">官方链接暂缺，需人工核实。${esc(project.historyNote || "")}</p>`;
    }
    return `<ul class="source-list">${list.map((s) => `
      <li class="source-item">
        <div class="source-title">${esc(s.title)}</div>
        <div class="source-meta">${esc(s.publisher)} · ${esc(s.date || "日期待核实")} · 适用：${esc(s.year || "待核实")} · ${badge(SOURCE_LABEL[s.status] || "待核实", s.status === "expired" ? "red" : s.status === "lead" ? "amber" : "blue")}</div>
        ${sourceLink(s)}
        ${s.note ? `<div class="source-note">${esc(s.note)}</div>` : ""}
      </li>`).join("")}</ul>`;
  }

  function projectCard(p) {
    return `<article class="card">
      <div class="card-top">
        <div><h3><a href="#/project/${encodeURIComponent(p.id)}" style="color:inherit;text-decoration:none">${esc(p.name)}</a></h3>
        <div class="meta">${esc(p.categoryLabel)} · ${esc(p.level)} · ${esc(p.dataYear)}</div></div>
        ${badge(p.statusLabel, p.statusTone)}
      </div>
      <p style="margin-top:10px">${esc(p.oneLine)}</p>
      <div>${(p.tags || []).slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="card-actions">
        <a class="btn btn-outline btn-small" href="#/project/${encodeURIComponent(p.id)}">查看项目详情</a>
        ${sourceCount(p) ? `<span class="meta">${sourceCount(p)} 条官方来源</span>` : `<span class="meta source-expired">官方链接暂缺</span>`}
      </div>
    </article>`;
  }

  function categoryCount(catId) {
    return projects.filter((p) => p.category === catId).length;
  }

  function setActiveNav(key) {
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === key);
    });
  }

  function setTitle(t) {
    document.title = t ? `${t}｜杭电奖助学金指南` : "杭电奖助学金指南";
  }

  function disclaimer(kind) {
    const extra = kind === "match"
      ? "你填写的信息只在当前浏览器页面内参与计算，不会上传、不会保存；刷新页面后即清空。"
      : "";
    return `<div class="notice red"><strong>信息时效声明：</strong>${esc(DATA.meta.disclaimer)}${extra ? " " + esc(extra) : ""}</div>`;
  }

  function parseHash() {
    const raw = (location.hash || "#/home").replace(/^#/, "");
    const [pathPart, queryPart] = raw.split("?");
    const segments = pathPart.split("/").filter(Boolean);
    const params = new URLSearchParams(queryPart || "");
    return { path: segments, params };
  }

  function renderHome() {
    setActiveNav("home"); setTitle("");
    const total = DATA.meta.counts.records;
    const confirmed = DATA.meta.counts.confirmed;
    const sources = DATA.meta.counts.sources;
    const full = DATA.meta.counts.full;
    app.innerHTML = `
      <section class="hero">
        <div>
          <div class="eyebrow">HDU UNDERGRADUATE AID GUIDE</div>
          <h1>杭电奖助学金指南</h1>
          <p>把已收集的杭电本科生奖学金、助学金、困难补助、勤工助学、学费减免与助学贷款资料，整理成可检索、可比较、可初步匹配的历史项目库。</p>
          <p>不是实时政策查询，也不是在线申请系统。它只帮助你先看清“历史规则可能对应哪些项目”，再把你引向官方原文。</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/categories">浏览项目分类</a>
            <a class="btn btn-ghost" href="#/match">开始条件匹配</a>
            <a class="btn btn-ghost" href="#/help">先看使用说明</a>
          </div>
        </div>
        <div class="hero-stats" aria-label="数据概况">
          <div class="stat"><b>${total}</b><span>项目/服务记录</span></div>
          <div class="stat"><b>${confirmed}</b><span>已确认存在</span></div>
          <div class="stat"><b>${sources}</b><span>官方来源条目</span></div>
          <div class="stat"><b>${full}</b><span>全部字段完整核实</span></div>
        </div>
      </section>

      ${disclaimer("home")}

      <section class="section">
        <div class="section-head"><div><h2>先看分类</h2><p>没有官方证据的类别保留为空，不用虚构项目填充。</p></div></div>
        <div class="grid four">
          ${DATA.categories.map((c) => `<a class="card" href="#/categories?cat=${encodeURIComponent(c.id)}" style="text-decoration:none;color:inherit">
            <h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p>
            <div class="meta">${categoryCount(c.id)} 条记录</div>
          </a>`).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>当前最需要知道的</h2><p>历史资料与当前年度要分开看。</p></div></div>
        <div class="grid">
          <article class="card"><div class="card-top"><h3>国家助学金（2026-2027）</h3>${badge("申请已截止", "red")}</div><p>学生申请 10 月 26 日截止；学院评审公示至 11 月 3 日。金额为一档 4900 元、二档 3100 元，按月发放。</p><a class="btn btn-outline btn-small" href="#/project/P003">查看详情</a></article>
          <article class="card"><div class="card-top"><h3>国家奖学金/励志/省政府</h3>${badge("2025-2026 已截止", "amber")}</div><p>2025-2026 通知均已截止；2026-2027 公开通知暂未找到。不能把上一年日期当作下一年度日期。</p><a class="btn btn-outline btn-small" href="#/categories?cat=national">查看相关项目</a></article>
          <article class="card"><div class="card-top"><h3>校级奖学金/勤工助学</h3>${badge("2017 版规则", "amber")}</div><p>优秀学生奖学金、单项奖学金、勤工助学有 2017 版金额与条件；现行标准可能已调整，页面逐项标注历史属性。</p><a class="btn btn-outline btn-small" href="#/categories?cat=school">查看校级项目</a></article>
        </div>
      </section>

      <section class="section">
        <div class="notice blue"><strong>提示：</strong>匹配页会区分“可能符合 / 需要核实 / 暂不匹配”。未知条件不会自动判为不符合；只有明确不满足已知硬性条件，才会显示“暂不匹配”。</div>
      </section>`;
  }

  function filteredProjects() {
    const q = filter.q.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter.category !== "all" && p.category !== filter.category) return false;
      if (filter.status !== "all" && p.status !== filter.status) return false;
      if (!q) return true;
      const hay = [p.name, p.oneLine, p.categoryLabel, p.level, p.dataYear, (p.tags || []).join(" "), (p.missing || []).join(" ")].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  function projectListHtml() {
    const list = filteredProjects();
    if (!list.length) {
      const cat = categoryById[filter.category];
      let text = "没有符合当前筛选条件的项目。";
      if (cat && cat.id === "college") text = "电子信息学院公开栏目暂未发现可核实的学院专项奖助项目；这不等于项目不存在，只是本次公开资料未取得。";
      if (cat && cat.id === "social") text = "社会专项目前只有历史通知标题线索，未读取正文，因此不展示为已确认项目。";
      return `<div class="empty"><h3>暂无可展示记录</h3><p>${esc(text)}</p></div>`;
    }
    return `<div class="grid">${list.map(projectCard).join("")}</div>`;
  }

  function renderCategoryList() {
    const el = document.getElementById("project-list");
    const count = document.getElementById("result-count");
    if (el) el.innerHTML = projectListHtml();
    if (count) count.textContent = `显示 ${filteredProjects().length} / ${projects.length} 条`;
  }

  function renderCategories(params) {
    setActiveNav("categories");
    const cat = params.get("cat") || "all";
    filter.category = categoryById[cat] ? cat : "all";
    filter.q = "";
    filter.status = "all";
    const current = categoryById[filter.category];
    setTitle(current ? current.name : "项目分类");
    app.innerHTML = `
      <div class="breadcrumb"><a href="#/home">首页</a> / 项目分类</div>
      <div class="section-head"><div><h2>${esc(current ? current.name : "全部项目")}</h2><p>${esc(current ? current.desc : "按类别浏览已收集的项目；无官方证据的类别保留为空。")}</p></div></div>
      ${disclaimer("categories")}
      <div class="category-strip" aria-label="分类筛选">
        <a class="category-chip ${filter.category === "all" ? "active" : ""}" href="#/categories">全部 <span class="count">${projects.length}</span></a>
        ${DATA.categories.map((c) => `<a class="category-chip ${filter.category === c.id ? "active" : ""}" href="#/categories?cat=${encodeURIComponent(c.id)}">${esc(c.name)} <span class="count">${categoryCount(c.id)}</span></a>`).join("")}
      </div>
      <div class="toolbar">
        <label for="search">搜索</label>
        <input id="search" type="search" placeholder="项目名称、关键词、标签…" autocomplete="off">
        <label for="status">状态</label>
        <select id="status">
          <option value="all">全部状态</option>
          <option value="partial">部分核实/较完整</option>
          <option value="historical">历史项目</option>
          <option value="framework">政策框架</option>
          <option value="lead">待核实线索</option>
        </select>
        <span class="result-count" id="result-count"></span>
      </div>
      <div id="project-list"></div>
      <div class="notice blue" style="margin-top:18px"><strong>关于“学院级”：</strong>本次公开资料没有取得电子信息学院可核实的专项奖助项目，因此该分类不展示具体项目。没有证据不等于项目不存在。</div>`;
    const search = document.getElementById("search");
    const status = document.getElementById("status");
    search.addEventListener("input", () => { filter.q = search.value; renderCategoryList(); });
    status.addEventListener("change", () => { filter.status = status.value; renderCategoryList(); });
    renderCategoryList();
  }

  function renderDetail(id) {
    const p = byId[id];
    setActiveNav("categories");
    if (!p) {
      setTitle("项目未找到");
      app.innerHTML = `<div class="empty"><h3>没有找到这个项目</h3><p>链接中的项目编号不存在。</p><a class="btn btn-outline" href="#/categories">返回分类</a></div>`;
      return;
    }
    setTitle(p.name);
    const isLead = p.status === "lead";
    app.innerHTML = `
      <div class="breadcrumb"><a href="#/home">首页</a> / <a href="#/categories?cat=${encodeURIComponent(p.category)}">${esc(p.categoryLabel)}</a> / ${esc(p.name)}</div>
      <section class="detail-hero">
        <div>${badge(p.statusLabel, p.statusTone)} ${badge(p.level, "blue")} ${badge(p.dataYear, "gray")}</div>
        <h1>${esc(p.name)}</h1>
        <p class="subtitle">${esc(p.oneLine)}</p>
        <div style="margin-top:12px">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      </section>
      ${disclaimer("detail")}
      ${isLead ? `<div class="notice red"><strong>这是待核实线索，不是已确认项目。</strong>只看到官方通知标题，未读取正文；不能据此确认资格、金额或当前是否执行。</div>` : ""}
      ${p.officialLinkMissing ? `<div class="notice red"><strong>官方链接暂缺：</strong>该项目目前没有可确认的杭电官方项目页/附件，需人工核实；没有用杭电首页或其他项目链接替代。</div>` : ""}
      <div class="detail-grid">
        <div>
          <section class="detail-section"><h2>历史适用对象与申请条件</h2>
            <p class="meta">适用对象：${esc(p.audience)}</p>
            <ul>${(p.eligibility || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          </section>
          <section class="detail-section"><h2>历史金额与发放</h2>
            <p>${esc(p.amount)}</p>
            <ul>${(p.amountItems || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          </section>
          <section class="detail-section"><h2>申请材料</h2>
            <ul>${(p.materials || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          </section>
          <section class="detail-section"><h2>历史申请流程</h2>
            <ol>${(p.process || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
          </section>
          <section class="detail-section"><h2>历史申请时间</h2>
            <ul>${(p.dates || []).map((d) => `<li><strong>${esc(d.label)}：</strong>${esc(d.value)} ${badge(d.state === "closed" ? "已截止" : d.state === "current" ? "进行中" : d.state === "unknown" ? "待核实" : "历史参考", d.state === "closed" ? "red" : d.state === "current" ? "green" : d.state === "unknown" ? "amber" : "gray")}</li>`).join("")}</ul>
          </section>
          <section class="detail-section"><h2>官方来源与原文入口</h2>
            ${sourceList(p)}
            <p class="meta" style="margin-top:10px">最后核实：${esc(p.lastVerified)} · 核实状态：${esc(p.verification)}</p>
          </section>
          <section class="detail-section"><h2>仍未核实/缺失</h2>
            <ul>${(p.missing || []).length ? p.missing.map((x) => `<li>${esc(x)}</li>`).join("") : "<li>暂无记录</li>"}</ul>
            ${p.historyNote ? `<div class="notice blue" style="margin-bottom:0">${esc(p.historyNote)}</div>` : ""}
          </section>
        </div>
        <aside>
          <section class="detail-section"><h2>快速信息</h2>
            <dl class="kv">
              <dt>项目编号</dt><dd>${esc(p.id)}</dd>
              <dt>类别</dt><dd>${esc(p.categoryLabel)}</dd>
              <dt>层级</dt><dd>${esc(p.level)}</dd>
              <dt>资料年份</dt><dd>${esc(p.dataYear)}</dd>
              <dt>核实状态</dt><dd>${esc(p.verification)}</dd>
              <dt>官方来源</dt><dd>${sourceCount(p)} 条</dd>
            </dl>
            <div class="card-actions">
              <a class="btn btn-outline btn-small" href="#/categories?cat=${encodeURIComponent(p.category)}">返回分类</a>
              <a class="btn btn-outline btn-small" href="#/match">去匹配</a>
            </div>
          </section>
          <section class="detail-section"><h2>使用边界</h2>
            <p class="meta">本页是历史公开资料摘要，不是当前年度政策。金额、资格、名额、材料、入口和时间都可能已变化；实际申请以杭电及设立单位当年度官方通知为准。</p>
          </section>
        </aside>
      </div>`;
  }

  function field(name, label, control, hint) {
    return `<div class="field"><label for="${name}">${label}${hint ? `<span class="hint">${hint}</span>` : ""}</label>${control}</div>`;
  }

  function select(name, options, blank) {
    return `<select id="${name}" name="${name}"><option value="">${blank || "未填写（可跳过）"}</option>${options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select>`;
  }

  function renderMatch() {
    setActiveNav("match"); setTitle("个人匹配");
    app.innerHTML = `
      <div class="breadcrumb"><a href="#/home">首页</a> / 个人匹配</div>
      <div class="section-head"><div><h2>个人申请条件初步匹配</h2><p>只根据历史公开条件做初步判断；所有字段都可以跳过，未知字段会进入“需要核实”。</p></div></div>
      ${disclaimer("match")}
      <div class="notice blue"><strong>隐私：</strong>以下数据只在当前浏览器页面内参与计算，不上传、不发送第三方、不写入本地存储。刷新页面后即清空。请勿填写身份证号、银行卡号、账号密码等无关敏感信息。</div>
      <form id="match-form" novalidate>
        <section class="form-section"><h2>基本信息</h2><div class="form-grid">
          ${field("grade", "年级", select("grade", [["1","大一"],["2","大二"],["3","大三"],["4","大四"],["5","大五/其他"]], "未填写（可跳过）"))}
          ${field("college", "学院", `<input id="college" name="college" type="text" placeholder="如：电子信息学院" autocomplete="off">`)}
          ${field("major", "专业", `<input id="major" name="major" type="text" placeholder="如：电子信息工程" autocomplete="off">`)}
          ${field("graduating", "是否毕业班", select("graduating", [["no","否"],["yes","是"],["unknown","不确定"]], "未填写（可跳过）"))}
        </div></section>

        <section class="form-section"><h2>学业与综合表现</h2><div class="form-grid">
          ${field("gpa", "GPA / 平均绩点", `<input id="gpa" name="gpa" type="number" min="0" max="5" step="0.01" inputmode="decimal" placeholder="如 3.65">`, "0–5，可跳过")}
          ${field("rankPercent", "专业排名比例", `<input id="rankPercent" name="rankPercent" type="number" min="0" max="100" step="0.1" inputmode="decimal" placeholder="如 12，表示前12%">`, "填百分比的数字")}
          ${field("comprehensiveRank", "综合测评排名", select("comprehensiveRank", [["10","前10%"],["25","前25%"],["45","前45%"],["999","其他/更后"],["unknown","不确定"]], "未填写（可跳过）"))}
          ${field("failedCourses", "是否有不及格课程", select("failedCourses", [["no","无"],["yes","有"],["unknown","不确定"]], "未填写（可跳过）"))}
          ${field("physicalTest", "体质测试", select("physicalTest", [["pass","及格"],["fail","不及格"],["unknown","未测/不确定"]], "未填写（可跳过）"))}
          ${field("scholarshipLevel", "已获得奖学金情况", select("scholarshipLevel", [["strong","每学期均有校优秀奖学金，且一等奖占多数/多次一等"],["basic","获得过校级奖学金，但不确定每学期/等级"],["none","未获得校级奖学金"],["unknown","不确定"]], "未填写（可跳过）"))}
        </div></section>

        <section class="form-section"><h2>困难认定与突出表现</h2><div class="form-grid">
          ${field("aidRecognized", "是否获得困难生/资助对象认定", select("aidRecognized", [["yes","已认定"],["no","未认定"],["unknown","不确定"]], "未填写（可跳过）"))}
          ${field("exceptionalEvidence", "是否有突出表现证明", select("exceptionalEvidence", [["yes","有"],["no","无"],["unknown","不确定"]], "道德风尚/竞赛/科研等"))}
          ${field("competition", "竞赛/科研获奖", select("competition", [["yes","有"],["no","无"],["unknown","不确定"]], "未填写（可跳过）"))}
          ${field("studentLeader", "学生干部经历", select("studentLeader", [["yes","有"],["no","无"],["unknown","不确定"]], "未填写（可跳过）"))}
          ${field("socialPractice", "社会实践/文艺/体育", select("socialPractice", [["yes","有"],["no","无"],["unknown","不确定"]], "未填写（可跳过）"))}
        </div></section>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit">开始匹配</button>
          <button class="btn btn-outline" type="reset" id="reset-match">清空</button>
          <span class="form-note">不填写也能提交，结果会以“需要核实”为主。</span>
        </div>
      </form>
      <div id="match-results" aria-live="polite"></div>`;
    const form = document.getElementById("match-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      lastMatch = readProfile(form);
      renderMatchResults(lastMatch);
      document.getElementById("match-results").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    form.addEventListener("reset", () => {
      lastMatch = null;
      const out = document.getElementById("match-results");
      if (out) out.innerHTML = "";
    });
  }

  function readProfile(form) {
    const fd = new FormData(form);
    const number = (key) => {
      const v = fd.get(key);
      return v === null || v === "" ? null : Number(v);
    };
    return {
      grade: number("grade"),
      college: String(fd.get("college") || "").trim(),
      major: String(fd.get("major") || "").trim(),
      graduating: fd.get("graduating") || null,
      gpa: number("gpa"),
      rankPercent: number("rankPercent"),
      comprehensiveRank: number("comprehensiveRank"),
      failedCourses: fd.get("failedCourses") || null,
      physicalTest: fd.get("physicalTest") || null,
      scholarshipLevel: fd.get("scholarshipLevel") || null,
      aidRecognized: fd.get("aidRecognized") || null,
      exceptionalEvidence: fd.get("exceptionalEvidence") || null,
      competition: fd.get("competition") || null,
      studentLeader: fd.get("studentLeader") || null,
      socialPractice: fd.get("socialPractice") || null
    };
  }

  function matchResultCard(result) {
    const p = byId[result.projectId];
    if (!p) return "";
    const cls = result.status === "possible" ? "possible" : result.status === "notMatch" ? "notMatch" : "needsCheck";
    const sources = sourcesFor(p).slice(0, 3);
    return `<article class="result-card ${cls}">
      <div class="result-head">
        <div><h3><a href="#/project/${encodeURIComponent(p.id)}" style="color:inherit;text-decoration:none">${esc(p.name)}</a></h3>
          <div class="meta">${esc(p.categoryLabel)} · ${esc(p.dataYear)} · ${esc(p.statusLabel)}</div></div>
        ${badge(result.label, result.status === "possible" ? "green" : result.status === "notMatch" ? "red" : "amber")}
      </div>
      <p style="margin:8px 0 0;color:#57667a;font-size:13px">${esc(p.oneLine)}</p>
      <ul class="reasons">${result.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
      ${result.unknown.length ? `<div class="unknown-box"><strong>未确认条件（不会自动判为不符合）：</strong><ul>${result.unknown.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>` : ""}
      ${result.priorities.length ? `<div class="priority-box">${result.priorities.map((r) => `<div>${esc(r)}</div>`).join("")}</div>` : ""}
      <div class="result-actions">
        <a class="btn btn-outline btn-small" href="#/project/${encodeURIComponent(p.id)}">查看项目详情</a>
        ${sources.map((s) => sourceLink(s)).join("")}
      </div>
    </article>`;
  }

  function renderMatchResults(profile) {
    const out = document.getElementById("match-results");
    if (!out) return;
    const res = MATCHER.matchAll(projects, profile);
    const userBits = [
      profile.grade ? `年级 ${profile.grade}` : "",
      profile.college ? esc(profile.college) : "",
      profile.major ? esc(profile.major) : "",
      profile.gpa !== null ? `GPA ${profile.gpa}` : "",
      profile.rankPercent !== null ? `专业前 ${profile.rankPercent}%` : ""
    ].filter(Boolean);
    out.innerHTML = `
      <section class="section" style="margin-top:26px">
        <div class="results-summary">
          <h2 style="margin:0;color:var(--navy);font-size:22px">匹配结果</h2>
          ${badge(`可能符合 ${res.counts.possible}`, "green")}
          ${badge(`需要核实 ${res.counts.needsCheck}`, "amber")}
          ${badge(`暂不匹配 ${res.counts.notMatch}`, "red")}
        </div>
        ${disclaimer("match")}
        <div class="notice blue"><strong>结果解释：</strong>“可能符合”只表示已填写的硬性条件没有发现冲突，不代表当前年度具备申请资格；“需要核实”表示关键条件缺失或无法判断；“暂不匹配”只在明确不满足已知硬性条件时出现。${userBits.length ? `<br><span class="meta">本次填写：${userBits.join(" · ")}</span>` : ""}</div>
        ${res.results.length ? res.results.map(matchResultCard).join("") : `<div class="no-results">没有可匹配的项目。</div>`}
        <div class="notice" style="margin-top:18px"><strong>未参与匹配：</strong>P013-P018 社会专项仅有历史通知标题线索，未读取正文，不能作为已确认项目参与匹配；P009 助困教育券为历史项目，P010-P012 为政策框架，均只做“需要核实”提示。</div>
      </section>`;
  }

  function renderHelp() {
    setActiveNav("help"); setTitle("使用说明");
    app.innerHTML = `
      <div class="breadcrumb"><a href="#/home">首页</a> / 使用说明</div>
      <div class="section-head"><div><h2>使用说明与匹配规则</h2><p>先理解数据边界，再使用匹配结果。</p></div></div>
      ${disclaimer("help")}
      <div class="help-grid">
        <section class="card"><h2>数据来源</h2>
          <p>项目资料来自杭电官网、学院官网、学生处/学工部、信息公开、正式通知与附件，以及必要的国家/浙江省政策文件。每条项目详情都列出官方来源、发布单位、日期、适用年份与核实状态。</p>
          <p>没有使用公众号转载、自媒体、论坛、知乎、经验帖、商业网站或其他大学规定作为事实依据。</p>
          <p><strong>官方链接：</strong>能链接到项目对应通知/办法的，使用项目名称或通知标题作为链接文字；找不到时显示“官方链接暂缺，需人工核实”，不用首页替代。</p>
        </section>
        <section class="card"><h2>信息时效</h2>
          <p>这是<strong>历史公开资料整理</strong>，不是实时政策查询。项目可能已经调整、暂停或取消；金额、名额、材料、入口、时间都可能变化。</p>
          <p>页面会区分“2025-2026已截止”“2026-2027未找到”“2017版历史规则”“政策框架/待核实”。未找到公开通知不等于项目不存在，也不把往年日期当作当年日期。</p>
        </section>
        <section class="card"><h2>匹配规则</h2>
          <ol class="rule-list">
            <li><strong>硬性条件：</strong>项目历史规则明确要求。只有你明确填写为不满足时，才判“暂不匹配”。</li>
            <li><strong>优先条件：</strong>竞赛、学生干部、社会实践等，只作为说明，不单独导致“暂不匹配”。</li>
            <li><strong>参考条件：</strong>项目历史信息、往年节点；不参与硬性判断。</li>
            <li><strong>未知/缺失：</strong>一律进入“需要核实”，不自动当作不符合。</li>
            <li><strong>不推断：</strong>不根据 GPA/排名自行推测没有官方依据的资格；只在项目历史规则明确写出阈值时使用（如2017版优秀学生奖学金）。</li>
            <li><strong>结果：</strong>可能符合 / 需要核实 / 暂不匹配；都只代表历史规则初步匹配。</li>
          </ol>
        </section>
        <section class="card"><h2>隐私与安全</h2>
          <p>匹配表单只在浏览器当前页面内计算，不上传服务器、不发送第三方、不写入 localStorage，刷新页面即清空。</p>
          <p>不需要填写身份证号、银行卡号、账号密码等敏感信息；学院、专业、GPA、排名等也只用于当前匹配。</p>
          <p>页面不包含登录、在线申请、支付或任何表单提交到服务器的功能。</p>
        </section>
        <section class="card"><h2>已知限制</h2>
          <ul>
            <li>P005/P006/P008 金额与条件主要来自2017版学生手册，现行标准可能已调整。</li>
            <li>P001-P004 的2026-2027公开通知尚未找到；P003 为2026-2027已收集通知。</li>
            <li>P007 仅为前置资格；P010-P012 仅有政策框架/HDU细则缺失。</li>
            <li>P013-P018 社会专项仅有标题线索，未读正文，不参与匹配。</li>
            <li>电子信息学院公开栏目暂未发现可核实的学院专项项目，保留空分类，不虚构。</li>
          </ul>
        </section>
        <section class="card"><h2>使用建议</h2>
          <p>先用分类页了解项目，再用匹配页筛选；匹配后务必打开“官方来源”逐条核对原文。任何金额、资格、时间、材料，都以当年度杭电官方通知为准。</p>
          <p>如果匹配结果是“需要核实”，请把缺失字段补齐后再试；如果不确定，直接联系学院资助辅导员或学生资助管理中心。</p>
        </section>
      </div>`;
  }

  function render() {
    const { path, params } = parseHash();
    const route = path[0] || "home";
    if (route === "home") return renderHome();
    if (route === "categories") return renderCategories(params);
    if (route === "project") return renderDetail(path[1]);
    if (route === "match") return renderMatch();
    if (route === "help") return renderHelp();
    location.hash = "#/home";
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", render);
  if (document.readyState !== "loading") render();
})();
