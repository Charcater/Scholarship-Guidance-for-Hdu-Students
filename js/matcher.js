/* 杭电奖助学金指南 — 本地匹配算法
 * 只使用项目历史公开资料中的条件；未知/缺失一律进入“需要核实”，不判为不符合。
 */
(function (root) {
  "use strict";

  const STATUS_LABEL = {
    possible: "可能符合",
    needsCheck: "需要核实",
    notMatch: "暂不匹配",
    excluded: "不参与匹配"
  };

  function clean(value) {
    if (value === undefined || value === null || value === "" || value === "unknown") return null;
    return value;
  }

  function num(value) {
    const v = clean(value);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function bool(value) {
    if (value === "yes" || value === true) return true;
    if (value === "no" || value === false) return false;
    return null;
  }

  function ruleResult(state, reason, detail) {
    return { state, reason, detail: detail || "" };
  }

  function evalHard(rule, profile) {
    const kind = rule.kind;
    if (kind === "gradeMin") {
      const g = num(profile.grade);
      if (g === null) return ruleResult("unknown", "未填写年级，无法确认是否满足“" + rule.label + "”。");
      if (g >= rule.value) return ruleResult("pass", "已确认：年级为 " + g + "，满足“" + rule.label + "”。");
      return ruleResult("fail", "不满足：当前年级为 " + g + "，要求“" + rule.label + "”。");
    }

    if (kind === "aid") {
      const a = bool(profile.aidRecognized);
      if (a === null) return ruleResult("unknown", "未确认是否已获得困难生/资助对象认定，无法判断“" + rule.label + "”。");
      if (a) return ruleResult("pass", "已确认：已获得困难生/资助对象认定。");
      return ruleResult("fail", "不满足：当前填写为未获得困难生/资助对象认定。");
    }

    if (kind === "scholarship") {
      const s = clean(profile.scholarshipLevel);
      if (s === null || s === "unknown") return ruleResult("unknown", "未确认奖学金等级/次数，无法判断“" + rule.label + "”。");
      if (s === "strong") return ruleResult("pass", "已确认：按填写情况，奖学金条件达到该项目历史要求。");
      if (s === "none") return ruleResult("fail", "不满足：当前填写为未获得校级奖学金。");
      return ruleResult("unknown", "仅填写“获得过校级奖学金”，但无法确认每学期获奖、等级或一等奖占比，需核实“" + rule.label + "”。");
    }

    if (kind === "rankingException") {
      const rank = num(profile.rankPercent);
      const comp = num(profile.comprehensiveRank);
      const exceptional = bool(profile.exceptionalEvidence);
      if (rank === null || comp === null || rank >= 999 || comp >= 999) {
        return ruleResult("unknown", "未完整填写专业排名比例或综合测评排名，无法判断“" + rule.label + "”。");
      }
      if (rank <= 10 && comp <= 10) return ruleResult("pass", "已确认：专业排名与综合测评均在前10%。");
      if (rank > 30 || comp > 30) return ruleResult("fail", "不满足：专业排名或综合测评超过前30%，不符合“" + rule.label + "”。");
      if (exceptional === true) return ruleResult("pass", "已确认：排名在前30%内，且填写了突出表现证明。");
      if (exceptional === false) return ruleResult("fail", "不满足：排名未进入前10%，且填写为没有突出表现证明。");
      return ruleResult("unknown", "排名在前11%-30%，但未确认是否有突出表现证明，需核实。");
    }

    if (kind === "failedCourses") {
      const f = bool(profile.failedCourses);
      if (f === null) return ruleResult("unknown", "未确认是否有不及格课程，无法判断“" + rule.label + "”。");
      if (!f) return ruleResult("pass", "已确认：填写为无不及格课程。");
      return ruleResult("fail", "不满足：填写为有不及格课程。");
    }

    if (kind === "physicalTest") {
      const p = clean(profile.physicalTest);
      if (p === null || p === "unknown") return ruleResult("unknown", "未确认体质测试是否及格，无法判断“" + rule.label + "”。");
      if (p === "pass") return ruleResult("pass", "已确认：体质测试及格。");
      return ruleResult("fail", "不满足：体质测试未及格。");
    }

    if (kind === "graduating") {
      const g = bool(profile.graduating);
      if (g === null) return ruleResult("unknown", "未确认是否毕业班，无法判断“" + rule.label + "”。");
      if (!g) return ruleResult("pass", "已确认：非毕业班。");
      return ruleResult("fail", "不满足：填写为毕业班，该项目历史规则不面向毕业班。");
    }

    if (kind === "p005Tier") {
      const gpa = num(profile.gpa);
      const rank = num(profile.rankPercent);
      if (gpa === null || rank === null) return ruleResult("unknown", "未完整填写 GPA 与专业排名，无法判断优秀学生奖学金等级。");
      if (rank > 45 || gpa < 2.5) return ruleResult("fail", "不满足：GPA " + gpa + " / 排名前" + rank + "%，低于2017版三等奖最低要求（GPA 2.50、前45%）。");
      let tier = "三等奖";
      if (rank <= 10 && gpa >= 4.0) tier = "一等奖";
      else if (rank <= 25 && gpa >= 3.5) tier = "二等奖";
      return ruleResult("pass", "已确认：按2017版标准，GPA " + gpa + "、排名前" + rank + "%，对应" + tier + "（仍需以当年通知为准）。");
    }

    return ruleResult("unknown", "该项目有尚未结构化的条件，需人工核实。");
  }

  function priorityNote(rule, profile) {
    const kind = rule.kind;
    if (kind === "competition") {
      const v = clean(profile.competition);
      if (v === "yes") return "竞赛/科研：已填写有相关经历（优先条件，不作为硬性门槛）。";
      if (v === "no") return "竞赛/科研：填写为无；这只是优先条件，不能单独判定不符合。";
      return "竞赛/科研：未填写（优先条件，不影响硬性判断）。";
    }
    if (kind === "studentLeader") {
      const v = clean(profile.studentLeader);
      if (v === "yes") return "学生干部：已填写有经历（优先条件）。";
      if (v === "no") return "学生干部：填写为无（优先条件，不单独判定不符合）。";
      return "学生干部：未填写（优先条件）。";
    }
    if (kind === "socialPractice") {
      const v = clean(profile.socialPractice);
      if (v === "yes") return "社会实践/文艺/体育：已填写有经历（优先条件）。";
      if (v === "no") return "社会实践/文艺/体育：填写为无（优先条件，不单独判定不符合）。";
      return "社会实践/文艺/体育：未填写（优先条件）。";
    }
    if (kind === "aid") {
      const v = bool(profile.aidRecognized);
      if (v === true) return "困难生认定：已填写为已认定（优先条件）。";
      if (v === false) return "困难生认定：填写为未认定；该项目是前置服务，需先办理认定。";
      return "困难生认定：未填写（优先条件）。";
    }
    return "";
  }

  function matchProject(project, profile) {
    if (project.excludeFromMatch || project.matchMode === "exclude") {
      return {
        projectId: project.id,
        status: "excluded",
        label: STATUS_LABEL.excluded,
        reasons: ["该项目仅有历史线索，未读取正文，不参与自动匹配。"],
        unknown: ["项目历史资格、金额、当前状态均未核实。"],
        priorities: [],
        tierNote: ""
      };
    }

    const rules = project.matchRules || [];
    const hard = rules.filter((r) => r.type === "hard");
    const priorities = rules.filter((r) => r.type !== "hard");
    const results = hard.map((r) => ({ rule: r, result: evalHard(r, profile) }));
    const fails = results.filter((x) => x.result.state === "fail");
    const unknowns = results.filter((x) => x.result.state === "unknown");
    const passes = results.filter((x) => x.result.state === "pass");

    let status = "possible";
    if (fails.length) status = "notMatch";
    else if (unknowns.length || project.matchMode === "needsCheck") status = "needsCheck";

    const reasons = [];
    passes.forEach((x) => reasons.push(x.result.reason));
    fails.forEach((x) => reasons.push(x.result.reason));
    unknowns.forEach((x) => reasons.push(x.result.reason));
    if (!hard.length) reasons.push("该项目没有可结构化的硬性条件，需结合当年通知/学院审核确认。");

    return {
      projectId: project.id,
      status,
      label: STATUS_LABEL[status],
      reasons,
      unknown: unknowns.map((x) => x.rule.label + "：" + x.result.reason),
      priorities: priorities.map((r) => priorityNote(r, profile)).filter(Boolean),
      tierNote: passes.find((x) => x.rule.kind === "p005Tier")?.result.reason || ""
    };
  }

  function matchAll(projects, profile) {
    const results = projects.filter((p) => !p.excludeFromMatch).map((p) => matchProject(p, profile));
    const order = { possible: 0, needsCheck: 1, notMatch: 2, excluded: 3 };
    results.sort((a, b) => order[a.status] - order[b.status] || a.projectId.localeCompare(b.projectId));
    return {
      results,
      counts: {
        possible: results.filter((r) => r.status === "possible").length,
        needsCheck: results.filter((r) => r.status === "needsCheck").length,
        notMatch: results.filter((r) => r.status === "notMatch").length,
        excluded: results.filter((r) => r.status === "excluded").length
      }
    };
  }

  const api = { matchProject, matchAll, STATUS_LABEL };
  root.HDU_MATCHER = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
