// Spike: the old herdr's sidebar, drawn as two copies (props.part "spaces"
// or "agents") so the layout's divider between them can be dragged. Spaces
// grouped by machine, each with its branch under it; agents needing you first.
import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, agents, machines, run, theme, home, props, setAgentOrder, openOverlay, hc, nextCommand } from "herdr";

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


const RANK = { blocked: 0, done: 1, working: 2, idle: 3 };

function short(path) {
  const h = home();
  return !path ? "" : path === h ? "~" : path.startsWith(h + "/") ? "~" + path.slice(h.length) : path;
}

export default class TuiSide extends View {
  init(_props, cx) {
    // Drag to reorder, as the shipped sidebar does: press on a space, release
    // on another of the same machine. Indexes are positions in spaces().
    this.pressed = null;
    this.over = null;
    this.width = 280;
    // Machines folded shut, by name ("" for this Mac); kept across restarts.
    try { this.shut = new Set(JSON.parse(localStorage.getItem("shut") ?? "[]")); } catch { this.shut = new Set(); }
    // Agents in "priority" order (needing you first) or by "spaces", as the
    // old herdr's agents · priority switch.
    try { this.sort = localStorage.getItem("sort") === "spaces" ? "spaces" : "priority"; } catch { this.sort = "priority"; }
    // Each machine's connection as herdr-core reports it (connected,
    // unreachable, or on its way back), polled: machines() only knows
    // whether a layout document arrived.
    this.links = {};
    this.order = [];
    this.tasks(cx);
  }

  tasks(cx) {
    const poll = (cx) => hc(["machine", "ls", "--json"]).then((r) => {
      const next = {};
      try { for (const m of JSON.parse(r.stdout).machines ?? []) next[m.name] = m.state; } catch {}
      if (JSON.stringify(next) !== JSON.stringify(this.links)) { this.links = next; cx.notify(); }
    }).catch(() => {});
    poll(cx);
    cx.timer.every(10000, poll);
    // Keys bound to herdr-tui-side.<command> (keys.json, layout:herdr-tui).
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        const n = Number(/^agent-(\d)$/.exec(c)?.[1]);
        if (n && (props()?.part ?? "spaces") === "agents") {
          const a = this.order[n - 1];
          if (a) { run("space.select", { id: a.space }); run("pane.focus", { pane: a.pane }); }
        }
        if (c === "rename-space" && (props()?.part ?? "spaces") === "spaces") {
          const sp = spaces().find((x) => x.active);
          if (sp) rename("space", sp.id);
        }
        if (c === "new-worktree" && (props()?.part ?? "spaces") === "spaces") {
          const s = spaces().find((x) => x.active);
          if (s) openOverlay({ mod: "herdr-tui-worktree", kind: "dialog", frame: "none", width: 440, height: 260, props: { space: s.id, action: "new" } });
        }
        cx.notify();
      }
    });
  }

  menu(s) {
    openOverlay({ mod: "herdr-tui-menu", kind: "popup", frame: "none", width: 280, height: 260, props: { tab: "space", target: { id: s.id } } });
  }

  setSort(sort, cx) {
    this.sort = sort;
    try { localStorage.setItem("sort", sort); } catch {}
    cx.notify();
  }

  toggle(key, cx) {
    if (this.shut.has(key)) this.shut.delete(key); else this.shut.add(key);
    try { localStorage.setItem("shut", JSON.stringify([...this.shut])); } catch {}
    cx.notify();
  }

  // « folds the sidebar to a strip, » brings it back at its last width.
  fold() {
    try { localStorage.setItem("width", String(Math.round(this.width))); } catch {}
    run("layout.resize", { id: "sidebar", px: 40 });
  }

  unfold() {
    let px = 280;
    try { px = Number(localStorage.getItem("width")) || 280; } catch {}
    run("layout.resize", { id: "sidebar", px: Math.max(px, 160) });
  }

  render() {
    const t = theme();
    const list = spaces();
    const where = (a) => list.findIndex((s) => s.id === a.space);
    const ags = [...agents()].sort(this.sort === "spaces"
      ? (a, b) => where(a) - where(b) || a.tab_index - b.tab_index
      : (a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || b.seq - a.seq);
    this.order = ags;
    setAgentOrder(ags.map((a) => a.address));
    const tint = (st) => (st ? t[st] ?? t.dim : t.border);
    const dot = (st, size = 8) => div().flex_none().size(size).rounded(size / 2).bg(tint(st));

    const section = (label, right) => h_flex().px(16).pt(14).pb(6).items_center().text_size(12.5).font_bold().text_color(t.dim)
      .child(div().flex_1().child(label.toUpperCase())).when(right != null, (el) => el.child(right));

    // One row per space: a lifted background marks the shown one.
    const space = (s) => {
      const i = list.indexOf(s);
      return h_flex().id(`cs-${s.id}`).relative().mx(4).pl(8).pr(8).py(3).gap(8).rounded(4).items_center()
      .when(s.active, (el) => el.bg(t.selected))
      .when(!s.active, (el) => el.hover((st) => st.bg(t.border)))
      .when(this.pressed === i && this.over !== i, (el) => el.opacity(0.5))
      .when(this.pressed !== null && this.over === i && this.pressed !== i, (el) => el.child(
        div().absolute().left(0).right(0).h(2).bg(t.accent)
          .when(this.pressed < i, (line) => line.bottom(0))
          .when(this.pressed > i, (line) => line.top(0))))
      .on_mouse_down("left", () => { this.pressed = i; this.over = i; })
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.menu(s); })
      .on_mouse_move((_e, cx) => {
        const source = list[this.pressed];
        const over = source && (source.machine ?? null) === (s.machine ?? null) ? i : null;
        if (this.pressed !== null && this.over !== over) { this.over = over; cx.notify(); }
      })
      .on_mouse_up("left", (_e, cx) => {
        const from = this.pressed, over = this.over;
        this.pressed = null; this.over = null;
        if (from !== null && over === i && from !== i) run("space.move", { id: list[from].id, index: i + 1 });
        else if (from === i) run("space.select", { id: s.id });
        cx.notify();
      })
      // One line: the name, then its branch (or folder) cut short, then tabs.
      .child(h_flex().flex_1().min_w(0).gap(8).items_center().text_size(12.5)
        .child(div().flex_shrink(0).max_w(150).truncate().text_color(s.active ? t.foreground : t.muted).when(s.active, (el) => el.font_bold()).child(s.name))
        .child(div().flex_1().min_w(0).truncate().text_color(s.branch ? t.accent : t.dim)
          .child(s.branch ? `⎇ ${s.branch}` : (short(s.folder) || "~") !== s.name ? short(s.folder) : ""))
        .when(s.tabs.length > 1, (el) => el.child(div().flex_none().text_color(t.dim).child(`${s.tabs.length}`))))
      .when(Boolean(s.status) && s.status !== "idle", (el) => el.child(dot(s.status)));
    };

    // Worktrees, as the old herdr drew them: under their repo's space, one
    // line each on a ├─ / └─ tree. A worktree space is one whose folder is in
    // ~/.herdr/worktrees/<repo>/, where the shipped worktree mod puts them; its
    // repo's space is the one (on the same machine) whose folder is named <repo>.
    const worktrees = `${home()}/.herdr/worktrees/`;
    const repoOf = (s) => (s.folder?.startsWith(worktrees) ? s.folder.slice(worktrees.length).split("/")[0] : null);
    const base = (path) => (path ?? "").replace(/\/+$/, "").split("/").pop();
    const ring = (st) => (st === "idle" ? "○" : st ? "●" : "·");
    // The tree is drawn, not typed: ├─ glyphs leave gaps between rows that
    // aren't a terminal's exact cell height. A trunk runs down the left (to
    // the middle on the last row, so it ends in └) and a twig goes right.
    // The trunk reaches 2px up into the row above to bridge the list's gap.
    const branchRow = (s, last) => h_flex().id(`cs-${s.id}`).relative().mx(4).h(20).pl(30).pr(8).gap(6).rounded(4).items_center().text_size(12.5)
      .when(s.active, (el) => el.bg(t.selected))
      .when(!s.active, (el) => el.hover((st) => st.bg(t.border)))
      .on_click(() => run("space.select", { id: s.id }))
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.menu(s); })
      .child(div().absolute().left(14).top(-2).w(1).h(last ? 12 : 22).bg(t.dim))
      .child(div().absolute().left(14).top(10).w(10).h(1).bg(t.dim))
      .child(div().flex_none().text_color(s.status ? tint(s.status) : t.dim).child(ring(s.status)))
      .child(div().flex_1().min_w(0).truncate().text_color(s.active ? t.foreground : t.muted).when(s.active, (el) => el.font_bold())
        .child(s.branch ?? s.name));
    const tree = (own) => {
      const tops = own.filter((s) => !repoOf(s));
      const parent = (w) => tops.find((p) => base(p.folder) === repoOf(w));
      const rows = [];
      for (const s of own) {
        if (repoOf(s) && parent(s)) continue; // drawn under its repo
        rows.push(space(s));
        const kids = repoOf(s) ? [] : own.filter((w) => repoOf(w) && parent(w) === s);
        kids.forEach((w, i) => rows.push(branchRow(w, i === kids.length - 1)));
      }
      return rows;
    };

    const machine = (m) => {
      const own = list.filter((s) => (s.machine ?? null) === m.name);
      const link = m.name == null ? "connected" : this.links[m.name] ?? (m.layout === "unavailable" ? "unreachable" : "connected");
      const down = link === "unreachable";
      const back = !down && link !== "connected"; // on its way back: reconnecting
      const key = m.name ?? "";
      const shut = this.shut.has(key);
      // Shut, the row still shows the most urgent agent status inside it.
      const worst = own.map((s) => s.status).filter(Boolean).sort((a, b) => (RANK[a] ?? 9) - (RANK[b] ?? 9))[0];
      return v_flex().mx(6).mt(3).mb(3).pb(4).rounded(6).bg(t.raised).gap(2)
        .child(h_flex().id(`cm-${key || "local"}`).px(10).py(5).gap(8).items_center().rounded_t(6).text_size(12.5)
          .hover((st) => st.bg(t.border))
          .on_click((_e, cx) => this.toggle(key, cx))
          .child(div().w(10).text_size(12.5).text_color(t.dim).child(shut ? "▸" : "▾"))
          .child(div().flex_1().truncate().text_color(t.foreground).font_bold().child(m.name ?? "Local"))
          .when(shut && Boolean(worst) && worst !== "idle", (el) => el.child(dot(worst)))
          .when(down, (el) => el.child(div().text_size(12.5).text_color(t.blocked).child("unreachable")))
          .when(back, (el) => el.child(div().text_size(12.5).text_color(t.working).child("◐ reconnecting")))
          .when(!down && !shut, (el) => el.child(div().id(`cm-new-${key || "local"}`).px(6).rounded(4).text_size(12.5).text_color(t.dim)
            .hover((st) => st.bg(t.border).text_color(t.foreground))
            .on_click((_e, cx) => { cx.stop_propagation(); run("space.new", { machine: key }); }).child("+")))
          .child(dot(down ? "blocked" : back ? "working" : "done", 7)))
        .when(!shut, (el) => el.children(tree(own)));
    };

    // As the old herdr's agents list: a ring or dot, the space · its tab, and
    // under it what the agent is doing. Every agent here is Claude Code, so
    // the program isn't repeated on each row.
    const mark = (st) => (st === "idle" ? "○" : st ? "●" : "·");
    const agent = (a) => h_flex().id(`ca-${a.address}`).mx(6).px(8).py(5).gap(7).items_start().rounded(4)
      .bg(a.focused ? t.selected : a.status === "blocked" ? t.blocked + "1f" : t.chrome)
      .when(!a.focused, (el) => el.hover((st) => st.bg(t.hover)))
      .on_click(() => { run("space.select", { id: a.space }); run("pane.focus", { pane: a.pane }); })
      .child(div().w(10).text_size(12.5).text_color(a.status ? tint(a.status) : t.dim).child(mark(a.status)))
      .child(v_flex().flex_1().min_w(0)
        .child(h_flex().gap(6).text_size(12.5)
          .child(div().flex_shrink(1).min_w(0).truncate().font_bold().text_color(a.focused ? t.accent : t.foreground).child(a.space_name))
          .child(div().flex_none().text_color(t.dim).child(`· ${a.tab_name || a.tab_index}`)))
        .child(div().truncate().text_size(12.5).text_color(t.muted).child(a.title || "—")));

    const waiting = ags.filter((a) => a.status === "blocked").length;
    const part = props()?.part ?? "spaces";
    const sized = (el) => el.id(`cs-root-${part}`).on_size_change((size, cx) => {
      if (Math.abs(size.width - this.width) >= 1) { this.width = size.width; cx.notify(); }
    });
    const chevron = (id, label, action) => div().id(id).px(6).rounded(4).text_size(12.5).text_color(t.dim)
      .hover((st) => st.bg(t.hover).text_color(t.foreground)).on_click(action).child(label);

    // Folded, as the old herdr's rail: each space by its number on its
    // machine (other machines open with ▾ and their position), then each
    // agent by its space's first letter; a status mark after each; » last.
    if (this.width < 60) {
      const cell = (id, label, st, on, action) => h_flex().id(id).w_full().h(19).px(4).gap(1).justify_center().items_center()
        .rounded(3).text_size(12.5).bg(on ? t.selected : t.chrome)
        .when(!on, (el) => el.hover((s) => s.bg(t.hover))).on_click(action)
        .child(div().text_color(on ? t.accent : t.muted).when(on, (el) => el.font_bold()).child(label))
        .child(div().text_size(12.5).text_color(st ? tint(st) : t.dim).child(mark(st)));
      if (part === "spaces") {
        const rail = machines().flatMap((m, mi) => {
          const own = list.filter((s) => (s.machine ?? null) === m.name);
          const head = mi === 0 ? [] : [h_flex().w_full().h(19).justify_center().items_center().text_size(12.5)
            .text_color(m.layout === "unavailable" ? t.blocked : t.accent).child(`▾${mi + 1}`)];
          return [...head, ...own.map((s, i) => cell(`cr-${s.id}`, String(i + 1), s.status, s.active, () => run("space.select", { id: s.id })))];
        });
        return sized(v_flex().size_full().px(3).pt(4).bg(t.chrome))
          .child(v_flex().id("cr-spaces").flex_1().min_h(0).overflow_y_scroll().children(rail));
      }
      return sized(v_flex().size_full().px(3).pt(6).bg(t.chrome))
        .child(v_flex().id("cr-agents").flex_1().min_h(0).overflow_y_scroll()
          .children(ags.map((a) => cell(`cra-${a.address}`, [...(a.space_name || "?")][0] ?? "?", a.status, a.focused,
            () => { run("space.select", { id: a.space }); run("pane.focus", { pane: a.pane }); }))))
        .child(h_flex().flex_none().py(4).justify_center().child(chevron("cs-unfold", "»", () => this.unfold())));
    }

    if (part === "spaces") {
      return sized(v_flex().size_full().bg(t.chrome).text_color(t.foreground))
        .child(v_flex().id("cs-spaces").flex_1().min_h(0).pb(8).overflow_y_scroll()
          // A release outside any space cancels the drag.
          .on_mouse_up("left", (_e, cx) => { if (this.pressed !== null) { this.pressed = null; this.over = null; cx.notify(); } })
          .children(machines().map(machine)));
    }
    return sized(v_flex().size_full().bg(t.chrome).text_color(t.foreground))
      .child(v_flex().id("cs-agents").flex_1().min_h(0).pb(6).overflow_y_scroll()
        .child(section("Agents", h_flex().gap(10).items_center()
          .child(div().text_color(waiting ? t.blocked : t.dim).child(waiting ? `${waiting} need you` : `${ags.length}`))
          .child(div().id("ca-sort").px(6).rounded(4).text_color(t.muted).hover((st) => st.bg(t.hover).text_color(t.foreground))
            .on_click((_e, cx) => this.setSort(this.sort === "priority" ? "spaces" : "priority", cx)).child(this.sort))))
        .when(ags.length === 0, (el) => el.child(div().px(16).py(6).text_size(12.5).text_color(t.dim)
          .child("No agents here yet. Start one with + in the tab bar.")))
        .children(ags.map(agent)))
      .child(h_flex().flex_none().px(8).py(4).justify_end().child(chevron("cs-fold", "«", () => this.fold())));
  }
}
