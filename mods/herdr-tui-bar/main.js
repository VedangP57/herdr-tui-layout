// Spike: the old herdr's top line, across the whole window. Over the sidebar
// its heading; then numbered tabs (the active one a solid accent block) and +;
// host · time on the right.
import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, run, theme, exec, openOverlay, layout, window, hc, focused, nextCommand, notify } from "herdr";

// herdr-tui's rename dialog (herdr-tui-prompt, which draws its own rounded box)
// instead of Herdr's, whose square background pokes out of the app's frame.
function rename(kind, id) {
  const sp = spaces();
  const target = kind === "space" ? sp.find((s) => s.id === id) : sp.flatMap((s) => s.tabs).find((x) => x.id === id);
  openOverlay({
    mod: "herdr-tui-prompt", kind: "dialog", frame: "none", width: 400, height: 214,
    props: {
      title: `rename ${kind}`,
      value: target?.named ? target.name : "",
      hint: kind === "space" ? "empty: named after its folder" : "empty: its number again",
      command: { name: `${kind}.rename`, args: { id } },
    },
  });
}
// What Claude Code reports about each session (model, context, the account's
// 5-hour and weekly limits), saved by extras/claude-usage-hook.sh (in this layout's repo), its
// statusLine command. Newest first: "<mtime>\t<json>" per line.
const USAGE = 'd="$HOME/.local/state/herdr-tui/claude"; for f in $(ls -t "$d"/*.json 2>/dev/null | head -40); do printf "%s\\t" "$(stat -f %m "$f")"; tr -d "\\n" < "$f"; echo; done';

// The old herdr's popup keys (config.toml [[keys.command]] type "popup"):
// the program in a floating terminal over the tab, gone when it exits.
// Sizes are shares of the window, as there.
const POPUPS = { lazygit: ["lazygit", 0.8], btop: ["btop", 0.9], yazi: ["yazi", 0.9] };

function clock() {
  const d = new Date();
  const h = d.getHours() % 12 || 12, m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class TuiBar extends View {
  init(_props, cx) {
    this.host = "";
    // Drag to reorder, as the shipped tab bar does: press on a tab, release
    // on another. Indexes are positions in the shown space's tabs.
    this.pressed = null;
    this.over = null;
    exec("hostname", ["-s"]).then((r) => { this.host = r.stdout.trim(); cx.notify(); }).catch(() => {});
    // Other machines' own hostnames, as herdr-core knows them, so the bar names
    // the box the shown space runs on (the old herdr's {hostname} chip).
    this.hosts = {};
    const hosts = (cx) => hc(["machine", "ls", "--json"]).then((r) => {
      const next = {};
      try { for (const m of JSON.parse(r.stdout).machines ?? []) next[m.name] = m.host || m.name; } catch {}
      this.hosts = next;
      cx.notify();
    }).catch(() => {});
    hosts(cx);
    cx.timer.every(60000, hosts);
    cx.timer.every(15000, (cx) => cx.notify());
    this.size = { width: 1920, height: 1080 };
    this.usage = [];
    const read = (cx) => exec("sh", ["-c", USAGE]).then((r) => {
      const rows = [];
      for (const line of r.stdout.split("\n")) {
        const tab = line.indexOf("\t");
        if (tab < 0) continue;
        try { rows.push({ at: Number(line.slice(0, tab)) * 1000, ...JSON.parse(line.slice(tab + 1)) }); } catch {}
      }
      this.usage = rows;
      cx.notify();
    }).catch(() => {});
    read(cx);
    cx.timer.every(15000, read);
    // Keys bound to herdr-tui-bar.popup-<name> (keys.json, layout:herdr-tui).
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        const p = POPUPS[/^popup-(\w+)$/.exec(c)?.[1]];
        if (p) await this.popup(p[0], p[1]);
        // Herdr's picker opens 640 wide, 40px from the top, 80% of the window tall.
        if (c === "picker") {
          const w = this.size.width, h = Math.round(w * 9 / 16);
          openOverlay({ mod: "herdr-tui-picker", kind: "popup", frame: "none", width: 640, height: Math.round(h * 0.8), at: { x: Math.round((w - 640) / 2), y: 40 } });
        }
        if (c === "help") openOverlay({ mod: "herdr-tui-help", kind: "dialog", frame: "none", width: 560, height: 560 });
        if (c === "rename-tab") {
          const tab = spaces().find((x) => x.active)?.tabs.find((x) => x.active);
          if (tab) rename("tab", tab.id);
        }
        cx.notify();
      }
    });
  }

  // The old agent-quota numbers on one line: the focused agent's model and
  // context (the newest report from its folder), then the account's 5-hour
  // and weekly limits (the newest report of all), resets on hover. Colours as
  // the old plugin's: green, yellow past half, red past 80% used.
  usageLine(t) {
    if (!this.usage.length) return div();
    const cwd = focused()?.cwd;
    const mine = this.usage.find((u) => u.cwd === cwd || u.workspace?.current_dir === cwd);
    const limits = this.usage.find((u) => u.rate_limits);
    const hue = (n) => (n >= 80 ? t.blocked : n >= 50 ? t.working : t.done);
    const reset = (sec) => {
      const d = new Date(sec * 1000), now = new Date();
      const hm = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}${d.getHours() < 12 ? "am" : "pm"}`;
      return d.toDateString() === now.toDateString() ? hm : `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]} ${hm}`;
    };
    const item = (id, label, n, tip) => h_flex().id(id).gap(5).items_center()
      .when(Boolean(tip), (el) => el.tooltip(tip))
      .child(div().text_color(t.dim).child(label))
      .child(div().font_bold().text_color(hue(n)).child(`${Math.round(n)}%`));
    const ctx = mine?.context_window?.used_percentage;
    const five = limits?.rate_limits?.five_hour, week = limits?.rate_limits?.seven_day;
    return h_flex().gap(14).items_center().text_size(12.5)
      .when(Boolean(mine?.model?.display_name), (el) => el.child(div().text_color(t.muted).child(mine.model.display_name)))
      .when(ctx != null, (el) => el.child(item("cu-ctx", "ctx", ctx, null)))
      .when(five?.used_percentage != null, (el) => el.child(item("cu-5h", "5h", five.used_percentage, five.resets_at ? `resets ${reset(five.resets_at)}` : null)))
      .when(week?.used_percentage != null, (el) => el.child(item("cu-week", "week", week.used_percentage, week.resets_at ? `resets ${reset(week.resets_at)}` : null)));
  }

  async popup(program, share) {
    const cwd = focused()?.cwd;
    const r = await hc(["run", "--bg", "--json", "--no-parent", "--rm", ...(cwd ? ["--cwd", cwd] : []), "--", program]).catch(() => null);
    let address = null;
    try { address = r?.code === 0 ? JSON.parse(r.stdout).address : null; } catch {}
    if (!address) { notify({ title: `Couldn't start ${program}`, body: r?.stderr?.trim() || "Is it installed?", level: "error" }); return; }
    // The bar spans the window, so its width is the window's; the height
    // assumes the window's own shape is the screen's 16:9.
    const w = Math.round(this.size.width * share), h = Math.round(this.size.width * 9 / 16 * share);
    openOverlay({ kind: "dialog", key: `herdr-tui-popup-${program}`, width: w, height: h, layout: { type: "block", content: { terminal: address } } });
  }

  render() {
    const t = theme();
    const space = spaces().find((s) => s.active);
    const stop = (_e, cx) => cx.stop_propagation();
    const side = find(layout(), "sidebar");
    const width = side?.hidden ? 0 : side?.size?.px ?? 280;
    const folded = width < 60;
    // Outside fullscreen the macOS window buttons sit at the top left.
    const w = window();
    const lights = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen;
    const shown = space?.tabs ?? [];
    const tab = (c, i) => h_flex().id(`ct-${c.id}`).relative().h(20).px(16).min_w(64).justify_center().gap(6).rounded(4).items_center().text_size(12.5)
      .bg(c.active ? t.accent : t.raised).text_color(c.active ? t.accent_foreground : t.muted)
      .when(c.active, (el) => el.font_bold())
      .when(!c.active, (el) => el.hover((s) => s.bg(t.border).text_color(t.foreground)))
      .when(this.pressed === i && this.over !== i, (el) => el.opacity(0.5))
      .when(this.pressed !== null && this.over === i && this.pressed !== i, (el) => el.child(
        div().absolute().top(0).bottom(0).w(2).bg(t.accent)
          .when(this.pressed < i, (line) => line.right(-3))
          .when(this.pressed > i, (line) => line.left(-3))))
      .on_mouse_down("left", (e, cx) => {
        cx.stop_propagation();
        if (e.click_count === 2) { this.pressed = null; rename("tab", c.id); return; }
        this.pressed = i; this.over = i;
      })
      .on_mouse_move((_e, cx) => {
        if (this.pressed !== null && this.over !== i) { this.over = i; cx.notify(); }
      })
      .on_mouse_up("left", (_e, cx) => {
        const from = this.pressed;
        this.pressed = null; this.over = null;
        if (from !== null && from !== i && shown[from]) run("tab.move", { id: shown[from].id, index: i + 1 });
        else if (from === i) run("tab.select", { id: c.id });
        cx.notify();
      })
      .child(c.named ? `${c.index}  ${c.name}` : String(c.index))
      .when(c.status === "blocked" || c.status === "done" || c.status === "working",
        (el) => el.child(div().size(6).rounded(3).bg(c.active ? t.accent_foreground : t[c.status])));
    return h_flex().id("cb-root").size_full().items_center().bg(t.chrome).text_size(12.5)
      .on_size_change((size) => { this.size = size; })
      // Over the sidebar; its right edge carries the sidebar's divider up
      // through this bar. The divider is 1px after the sidebar's width, so
      // the segment is that 1px wider and draws it as its own right border.
      .child(h_flex().flex_none().w(Math.max(width > 0 ? width + 1 : 0, lights ? 80 : 0)).h_full().items_center()
        .pl(lights ? 80 : 16)
        .when(width > 0, (el) => el.border_r(1).border_color(t.border))
        .when(!folded && !lights, (el) => el.child(div().text_size(12.5).font_bold().text_color(t.dim).child("SPACES"))))
      .child(h_flex().flex_1().min_w(0).h_full().px(8).gap(4).items_center()
        // A release anywhere else on the bar cancels the drag.
        .on_mouse_up("left", (_e, cx) => { if (this.pressed !== null) { this.pressed = null; this.over = null; cx.notify(); } })
        .children(shown.map(tab))
        .child(div().id("ct-new").h(20).px(9).flex().items_center().rounded(4).text_size(12.5).text_color(t.dim)
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_mouse_down("left", stop)
          .on_click(() => openOverlay({ mod: "herdr-tui-new-menu", kind: "popup", frame: "none", width: 250, height: 512 })).child("+"))
        .child(div().flex_1())
        .child(this.usageLine(t))
        .child(div().w(18))
        .child(div().pr(4).text_size(12.5).text_color(t.dim).child([space?.machine ? this.hosts[space.machine] ?? space.machine : this.host, clock()].filter(Boolean).join("  ·  "))));
  }
}
