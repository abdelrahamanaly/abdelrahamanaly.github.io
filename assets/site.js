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

  // Secret-sharing toy: three additive shares mod 1000.
  const input = document.getElementById("secret");
  function split() {
    const s = Math.max(0, Math.min(999, parseInt(input.value || "0", 10)));
    const a = Math.floor(Math.random() * 1000), b = Math.floor(Math.random() * 1000);
    const c = (((s - a - b) % 1000) + 1000) % 1000;
    [a, b, c].forEach((v, i) => { const el = document.getElementById("s" + i); el.textContent = String(v).padStart(3, "0"); el.style.color = "#ff5622"; setTimeout(() => (el.style.color = ""), 300); });
    document.getElementById("sum").innerHTML = "A + B + C mod 1000 = <b>" + s + "</b>";
  }
  input.addEventListener("input", split);
  document.getElementById("resplit").addEventListener("click", split);
  split();
})();
