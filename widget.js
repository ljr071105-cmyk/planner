// 计划表 · 桌面小组件（Scriptable）
// 首次使用：把下面 TOKEN 换成你的 GitHub 令牌，然后运行一次

const REPO  = "ljr071105-cmyk/planner-data";
const TOKEN = "在这里粘贴你的 github_pat_...";
const SITE  = "https://ljr071105-cmyk.github.io/planner/";

const PALETTE = {
  1: { bg:"#FEEFEF", fg:"#201818", mute:"#8A7D7D", am:"#B47173", pm:"#8C4A4D", ev:"#5E2B2E" },
  2: { bg:"#FDF1EA", fg:"#1F1916", mute:"#897E78", am:"#B07658", pm:"#894F30", ev:"#5C2F16" },
  3: { bg:"#FAF2E8", fg:"#1E1A14", mute:"#867F76", am:"#A28048", pm:"#7C591A", ev:"#523700" },
  4: { bg:"#F4F4E8", fg:"#1B1B15", mute:"#818176", am:"#8B8A4B", pm:"#66641E", ev:"#414004" },
  5: { bg:"#EEF6EC", fg:"#181C17", mute:"#7C8379", am:"#6D9360", pm:"#466C38", ev:"#28461D" },
  6: { bg:"#EAF7F1", fg:"#151C19", mute:"#78837E", am:"#4D977C", pm:"#1A7057", ev:"#004935" },
  7: { bg:"#E8F7F7", fg:"#141C1D", mute:"#768384", am:"#3B9699", pm:"#006F73", ev:"#00484B" },
  8: { bg:"#E9F6FC", fg:"#151C1F", mute:"#778288", am:"#4890AE", pm:"#126A88", ev:"#00445C" },
  9: { bg:"#EDF4FF", fg:"#171B20", mute:"#7A818A", am:"#6688B9", pm:"#3F6193", ev:"#233D64" },
  10: { bg:"#F2F2FE", fg:"#1A1A20", mute:"#7F7F8A", am:"#837EB7", pm:"#5E5790", ev:"#3C3662" },
  11: { bg:"#F8F0FB", fg:"#1D191E", mute:"#847D87", am:"#9C76A8", pm:"#764F81", ev:"#4D2F56" },
  12: { bg:"#FCEFF5", fg:"#1F181C", mute:"#887C82", am:"#AC718F", pm:"#854A69", ev:"#592B44" }
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
  const padT = small ? 14 : 15, padL = small ? 14 : 16;
  const padB = small ? 12 : 14, padR = small ? 14 : 18;
  w.setPadding(padT, padL, padB, padR);
  const INDENT = small ? 0 : 44;   // 内容行的额外左缩进，改这个数即可

  // 把可用宽度算出来并钉死，否则一条长文字会把整个布局撑宽、把日期挤出可视区
  const SW = Device.screenSize().width;
  const INNER = Math.round((small ? SW * 0.40 : SW * 0.86) - padL - padR);

  const head = w.addStack();
  head.size = new Size(INNER, 0);
  head.centerAlignContent();
  const c = head.addText(t.total ? t.done + "/" + t.total : (stale ? "离线" : "空"));
  c.font = Font.mediumSystemFont(11);
  c.textColor = new Color(p.mute);
  c.lineLimit = 1;
  head.addSpacer();                       // 弹性空白吃掉多余宽度
  const d = head.addText(t.head);
  d.font = Font.semiboldRoundedSystemFont(13);
  d.textColor = new Color(p.fg);
  d.lineLimit = 1;
  d.minimumScaleFactor = 0.7;             // 宁可缩小也不截断

  w.addSpacer(small ? 6 : 7);

  const budget = small ? 4 : (config.widgetFamily === "large" ? 16 : 6);
  let used = 0;

  if (!t.groups.length) {
    const er = w.addStack();
    if (INDENT) er.addSpacer(INDENT);
    const e = er.addText("今天还没安排");
    e.font = Font.systemFont(13);
    e.textColor = new Color(p.mute);
  }

  for (const g of t.groups) {
    if (used >= budget) break;
    for (const it of g.items) {
      if (used >= budget) break;
      const row = w.addStack();
      row.size = new Size(INNER, 0);
      row.centerAlignContent();
      if (INDENT) row.addSpacer(INDENT);
      const mk = row.addStack();
      mk.size = new Size(15, 0);
      const mark = mk.addText(it.d ? "✓" : "○");
      mark.font = Font.systemFont(11);
      mark.textColor = new Color(it.d ? p.mute : p[g.slot]);
      row.addSpacer(4);
      const tw = row.addStack();
      tw.size = new Size(INNER - INDENT - 21, 0);
      const tx = tw.addText(it.t);
      tx.font = Font.systemFont(12.5);
      tx.textColor = new Color(it.d ? p.mute : p.fg);
      tx.lineLimit = 1;
      w.addSpacer(4);
      used++;
    }
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
