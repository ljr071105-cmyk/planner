// 计划表 · 桌面小组件（Scriptable）
// 首次使用：把下面 TOKEN 换成你的 GitHub 令牌，然后运行一次

const REPO  = "ljr071105-cmyk/planner-data";
const TOKEN = "在这里粘贴你的 github_pat_..."; // 公开仓库里不放真令牌
const SITE  = "https://ljr071105-cmyk.github.io/planner/";

const PALETTE = {
  1: { bg:"#321617", fg:"#F6EBEB", mute:"#928282", am:"#DB9597", pm:"#BA7779", ev:"#9A5A5C" },
  2: { bg:"#30180B", fg:"#F6ECE8", mute:"#91837C", am:"#D89B7C", pm:"#B77C5E", ev:"#975F41" },
  3: { bg:"#2B1C03", fg:"#F3EEE6", mute:"#8D8579", am:"#C9A46C", pm:"#A9864E", ev:"#8A6830" },
  4: { bg:"#212104", fg:"#EFEFE6", mute:"#87877A", am:"#B0AF6F", pm:"#919051", ev:"#737233" },
  5: { bg:"#14240E", fg:"#EBF0E9", mute:"#80897E", am:"#91B883", pm:"#729966", ev:"#567A49" },
  6: { bg:"#03261B", fg:"#E7F1ED", mute:"#7B8A84", am:"#73BCA1", pm:"#539D82", ev:"#337E65" },
  7: { bg:"#002527", fg:"#E6F1F1", mute:"#798A8A", am:"#63BBBE", pm:"#429C9F", ev:"#1B7E80" },
  8: { bg:"#022330", fg:"#E7F0F5", mute:"#7A8990", am:"#6EB6D5", pm:"#4F96B5", ev:"#2E7895" },
  9: { bg:"#111F34", fg:"#EAEFF7", mute:"#7F8792", am:"#89ADE1", pm:"#6C8EC0", ev:"#4F70A0" },
  10: { bg:"#1E1B33", fg:"#EEEDF6", mute:"#858492", am:"#A8A3DE", pm:"#8984BD", ev:"#6C669D" },
  11: { bg:"#28182D", fg:"#F2ECF4", mute:"#8B838E", am:"#C29ACE", pm:"#A27CAE", ev:"#835F8F" },
  12: { bg:"#2F1623", fg:"#F5EBF0", mute:"#908188", am:"#D495B4", pm:"#B37795", ev:"#935A77" }
};

const SLOTS = [["am", "上午"], ["pm", "下午"], ["ev", "晚上"]];
const WD = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const fm = FileManager.local();
const CACHE = fm.joinPath(fm.cacheDirectory(), "planner-cache.json");

async function load() {
  try {
    const req = new Request("https://api.github.com/repos/" + REPO + "/contents/data.json");
    req.headers = {
      Authorization: "Bearer " + TOKEN,
      Accept: "application/vnd.github.raw",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    const txt = await req.loadString();
    const json = JSON.parse(txt);
    fm.writeString(CACHE, txt);
    return { json: json, stale: false };
  } catch (e) {
    if (fm.fileExists(CACHE)) return { json: JSON.parse(fm.readString(CACHE)), stale: true };
    return { json: null, stale: true };
  }
}

function pad(n) { return String(n).padStart(2, "0"); }

function todayTasks(json) {
  const now = new Date();
  const mKey = "planner-" + now.getFullYear() + "-" + pad(now.getMonth() + 1);
  const dKey = pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  const month = (json && json.data && json.data[mKey]) || {};
  const out = [];
  let done = 0, total = 0;
  SLOTS.forEach(function (s) {
    const items = (month[dKey + "-" + s[0]] || []).filter(function (i) { return i.t && i.t.trim(); });
    if (!items.length) return;
    out.push({ slot: s[0], label: s[1], items: items });
    items.forEach(function (i) { total++; if (i.d) done++; });
  });
  return { groups: out, done: done, total: total, month: now.getMonth() + 1,
           head: dKey + " " + WD[now.getDay()] };
}

function build(t, stale) {
  const p = PALETTE[t.month];
  const w = new ListWidget();
  w.url = SITE;
  w.backgroundColor = new Color(p.bg);
  const small = config.widgetFamily === "small";
  w.setPadding(small ? 13 : 15, small ? 14 : 18, small ? 11 : 13, small ? 14 : 18);

  const head = w.addStack();
  head.centerAlignContent();
  const d = head.addText(t.head);
  d.font = Font.semiboldRoundedSystemFont(15);
  d.textColor = new Color(p.fg);
  head.addSpacer();
  const c = head.addText(t.total ? t.done + "/" + t.total : (stale ? "离线" : "空"));
  c.font = Font.mediumSystemFont(12);
  c.textColor = new Color(p.mute);

  w.addSpacer(8);

  const budget = small ? 4 : (config.widgetFamily === "large" ? 14 : 6);
  let used = 0;

  if (!t.groups.length) {
    const e = w.addText("今天还没安排");
    e.font = Font.systemFont(13);
    e.textColor = new Color(p.mute);
  }

  for (const g of t.groups) {
    if (used >= budget) break;
    if (!small) {
      const lr = w.addStack();
      lr.centerAlignContent();
      const l = lr.addText(g.label);
      l.font = Font.mediumSystemFont(10);
      l.textColor = new Color(p[g.slot]);
      lr.addSpacer();
      w.addSpacer(4);
    }
    for (const it of g.items) {
      if (used >= budget) break;
      const row = w.addStack();
      row.centerAlignContent();
      const mk = row.addStack();
      mk.size = new Size(15, 0);
      const mark = mk.addText(it.d ? "✓" : "○");
      mark.font = Font.systemFont(12);
      mark.textColor = new Color(it.d ? p.mute : p[g.slot]);
      row.addSpacer(4);
      const tx = row.addText(it.t);
      tx.font = Font.systemFont(13);
      tx.textColor = new Color(it.d ? p.mute : p.fg);
      tx.lineLimit = 1;
      row.addSpacer();
      w.addSpacer(5);
      used++;
    }
    w.addSpacer(4);
  }

  w.addSpacer();
  return w;
}

const res = await load();
const t = res.json ? todayTasks(res.json)
                   : { groups: [], done: 0, total: 0, month: new Date().getMonth() + 1,
                       head: "无法读取" };
const widget = build(t, res.stale);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
