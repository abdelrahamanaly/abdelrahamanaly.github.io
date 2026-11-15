// Homepage interactions: tagline decrypt, "encrypt this page" (button or E key), secret-sharing toy.
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

  // Secret-sharing toy: three additive shares over the prime field F_p (p = 1009)
  // or the ring Z_{2^10}. Randomness comes from crypto.getRandomValues; shares are uniform.
  const MODS = {
    p:    { m: 1009n, name: "1009", note: "A prime field, the setting of SCALE-MAMBA and most MPC protocols: every non-zero value has an inverse, so division works. Real deployments use primes of 64 bits or more." },
    "2k": { m: 1024n, name: "2¹⁰", note: "A ring of integers modulo a power of two, the setting of SPDZ2k-style protocols: arithmetic wraps around like a CPU word. Real deployments use 2⁶⁴." },
  };
  let mod = MODS.p;
  const input = document.getElementById("secret");
  const mo = (x, m) => ((x % m) + m) % m;
  function rand(m) {
    // Uniform in [0, m): rejection sampling on 32-bit draws, so no value is favoured.
    const w = new Uint32Array(1), lim = 2 ** 32 - (2 ** 32 % Number(m));
    for (;;) {
      crypto.getRandomValues(w);
      if (w[0] < lim) return BigInt(w[0]) % m;
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
