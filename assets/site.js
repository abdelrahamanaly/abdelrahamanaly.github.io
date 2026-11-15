// Homepage interactions: tagline decrypt, "encrypt this page" (button or E key), secret-sharing demo.
(() => {
  const HEX = "0123456789abcdef";
  const rnd = () => HEX[Math.floor(Math.random() * 16)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Scramble a text node towards a target string over a number of frames.
  // A timer (not requestAnimationFrame) always finishes, even in background tabs;
  // a newer animation on the same node cancels the older one.
  const timers = new WeakMap();
  function animateNode(node, target, frames) {
    clearInterval(timers.get(node));
    if (reduce) { node.nodeValue = target; return; }
    let f = 0;
    const id = setInterval(() => {
      f++;
      const k = Math.floor((f / frames) * target.length);
      let out = "";
      for (let i = 0; i < target.length; i++) out += i < k || /\s/.test(target[i]) ? target[i] : rnd();
      node.nodeValue = f >= frames ? target : out;
      if (f >= frames) clearInterval(id);
    }, 16);
    timers.set(node, id);
  }

  // Tagline decrypts on load.
  document.querySelectorAll("#tagline").forEach((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => { const plain = n.nodeValue; n.nodeValue = plain.replace(/\S/g, rnd); animateNode(n, plain, 70); });
  });

  // "Encrypt this page": swap every visible text node for hex, and back.
  const lock = document.getElementById("lock");
  const store = new Map();
  let locked = false;
  function textNodes() {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (!n.nodeValue.trim() || n.parentElement.closest("script,style,pre,#lock,input") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    while (walker.nextNode()) out.push(walker.currentNode);
    return out;
  }
  function toggle() {
    locked = !locked;
    lock.setAttribute("aria-pressed", String(locked));
    lock.textContent = locked ? "🔓 decrypt" : "🔒 encrypt this page";
    textNodes().forEach((n) => {
      if (locked) { store.set(n, n.nodeValue); animateNode(n, n.nodeValue.replace(/\S/g, rnd), 25); }
      else if (store.has(n)) animateNode(n, store.get(n), 40);
    });
  }
  lock.addEventListener("click", toggle);
  addEventListener("keydown", (e) => { if ((e.key === "e" || e.key === "E") && !e.target.closest("input,textarea")) toggle(); });

  // Secret-sharing demo: three additive shares over the prime field F_p (p = 2^61 - 1)
  // or the ring Z_{2^64}. Randomness comes from crypto.getRandomValues; shares are uniform.
  const MODS = {
    p:    { m: (1n << 61n) - 1n, name: "p", note: "A prime field, the setting of SCALE-MAMBA and most MPC protocols: every non-zero value has an inverse, so division works. p = 2⁶¹ − 1 is a Mersenne prime." },
    "2k": { m: 1n << 64n,        name: "2⁶⁴", note: "The ring of 64-bit integers, the setting of SPDZ2k-style protocols: arithmetic wraps around exactly like a CPU word." },
  };
  let mod = MODS.p;
  const input = document.getElementById("secret");
  const mo = (x, m) => ((x % m) + m) % m;
  function rand(m) {
    // Uniform in [0, m): draw 64 bits; for the Mersenne prime keep 61 and reject p itself.
    const w = new BigUint64Array(1);
    for (;;) {
      crypto.getRandomValues(w);
      const r = m === MODS.p.m ? w[0] >> 3n : w[0];
      if (r < m) return r;
    }
  }
  function split() {
    let s;
    try { s = BigInt((input.value || "0").trim()); input.removeAttribute("aria-invalid"); }
    catch { input.setAttribute("aria-invalid", "true"); return; }
    const m = mod.m, sm = mo(s, m);
    const a = rand(m), b = rand(m), c = mo(sm - a - b, m);
    [a, b, c].forEach((v, i) => { const el = document.getElementById("s" + i); el.textContent = v.toString(); el.style.color = "#ff5622"; setTimeout(() => (el.style.color = ""), 300); });
    document.getElementById("sum").innerHTML = "A + B + C mod " + mod.name + " = <b>" + sm.toString() + "</b>" +
      (sm !== s ? ' <span class="wrap-note">(your number, reduced mod ' + mod.name + ")</span>" : "");
  }
  document.querySelectorAll(".modulus button").forEach((btn) => btn.addEventListener("click", () => {
    mod = MODS[btn.dataset.mod];
    document.querySelectorAll(".modulus button").forEach((x) => x.setAttribute("aria-checked", String(x === btn)));
    document.getElementById("modnote").textContent = mod.note;
    split();
  }));
  document.getElementById("modnote").textContent = mod.note;
  input.addEventListener("input", split);
  document.getElementById("resplit").addEventListener("click", split);
  split();
})();

// Tools terminal (section 07): a tab "types" an ls command, then lists that step's entries.
// Without JavaScript every step is simply shown.
(() => {
  const term = document.getElementById("term");
  if (!term) return;
  const tabs = [...term.querySelectorAll('[role="tab"]')];
  const steps = [...term.querySelectorAll(".step")];
  const rows = [...term.querySelectorAll(".step li")];
  const cmd = document.getElementById("cmd");
  const foot = document.getElementById("termfoot");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timer, last;
  steps.forEach((s) => s.querySelectorAll("li").forEach((li, i) => li.style.setProperty("--n", i)));

  function type(text, done) {
    clearInterval(timer);
    if (still) { cmd.textContent = text; return done(); }
    let i = 0;
    cmd.textContent = "";
    term.classList.add("typing");
    timer = setInterval(() => {
      cmd.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(timer); term.classList.remove("typing"); done(); }
    }, 30);
  }

  function show(step, pick) {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.step === step)));
    const command = pick ? "shuf -n 1 */" : step === "all" ? "ls -R" : "ls " + step + "/";
    type(command, () => {
      rows.forEach((li) => li.classList.remove("picked"));
      let n = 0;
      steps.forEach((s) => {
        const on = step === "all" || s.dataset.step === step;
        s.hidden = !on;
        s.classList.remove("show");
        if (on) { void s.offsetWidth; s.classList.add("show"); n += s.querySelectorAll("li").length; }
      });
      if (pick) {
        pick.classList.add("picked");
        pick.querySelector("a").focus({ preventScroll: true });
        foot.textContent = "picked 1 of " + rows.length + ". Enter opens it; roll again for another.";
      } else {
        foot.textContent = n + (n === 1 ? " entry" : " entries");
      }
    });
  }

  tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.step)));
  document.getElementById("lucky").addEventListener("click", () => {
    let li;
    do { li = rows[Math.floor(Math.random() * rows.length)]; } while (rows.length > 1 && li === last);
    last = li;
    show(li.closest(".step").dataset.step, li);
  });
  foot.textContent = rows.length + " entries";
})();
