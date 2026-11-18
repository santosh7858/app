(function () {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return; // browser me kuch nahi karega
  const P = C.Plugins;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText =
      "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:#1d1b26;color:#fff;" +
      "padding:12px 18px;border-radius:12px;font:700 14px sans-serif;z-index:99999;max-width:90%;text-align:center";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  function blobToB64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(String(r.result).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  async function getAlbumId() {
    try {
      let a = await P.Media.getAlbums();
      let f = (a.albums || []).find(x => x.name === "DanceShorts");
      if (!f) {
        await P.Media.createAlbum({ name: "DanceShorts" });
        a = await P.Media.getAlbums();
        f = (a.albums || []).find(x => x.name === "DanceShorts");
      }
      return f ? f.identifier : undefined;
    } catch (e) { return undefined; }
  }

  async function saveVideo(url) {
    const name = "dance_short_" + Date.now() + ".mp4";
    toast("Video save ho rahi hai...");
    try {
      const blob = await (await fetch(url)).blob();
      const data = await blobToB64(blob);
      const w = await P.Filesystem.writeFile({ path: name, data, directory: "CACHE" });
      try {
        const albumIdentifier = await getAlbumId();
        await P.Media.saveVideo({ path: w.uri, albumIdentifier });
        toast("Gallery me save ho gayi ✅ (album: DanceShorts)");
      } catch (e) {
        await P.Filesystem.writeFile({
          path: "DanceShorts/" + name, data, directory: "DOCUMENTS", recursive: true
        });
        toast("Documents/DanceShorts me save ho gayi ✅");
      }
    } catch (e) {
      toast("Save nahi hui: " + (e.message || e));
    }
  }

  // "MP4 download karo" button ko intercept karo
  document.addEventListener("click", function (e) {
    const a = e.target.closest && e.target.closest("a[download]");
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    saveVideo(a.href);
  }, true);

  // ===================== Permissions (gallery + camera + mic) =====================
  // App khulte hi sab permission maangta hai
  setTimeout(() => { if (P.DsMedia) P.DsMedia.requestPermissions().catch(() => {}); }, 1200);

  // =====================================================================
  //  TOP BAR (⋮) + swipe tray:  Studio | YouTube | Gallery   (bottom me kuch nahi)
  // =====================================================================
  const TOP = 36, TRAY = 56;
  const dpr = () => window.devicePixelRatio || 1;

  const st = document.createElement("style");
  st.textContent =
    "body{padding-top:" + TOP + "px!important}" +
    "#dsTop{position:fixed;left:0;right:0;top:0;height:" + TOP + "px;display:flex;align-items:center;" +
    "justify-content:space-between;padding:0 6px 0 14px;background:#fff;border-bottom:2px solid #1d1b26;" +
    "z-index:99990;font:700 14px system-ui,sans-serif;color:#1d1b26;box-sizing:border-box;touch-action:pan-y}" +
    "#dsDots{border:0;background:none;font-size:26px;line-height:1;padding:0 12px;height:100%;color:#1d1b26}" +
    "#dsTray{position:fixed;left:0;right:0;top:" + TOP + "px;height:" + TRAY + "px;overflow:hidden;" +
    "background:#fff8ec;border-bottom:2px solid #1d1b26;z-index:99991;visibility:hidden;" +
    "transition:visibility 0s .25s;touch-action:pan-y}" +
    "#dsTray.open{visibility:visible;transition-delay:0s}" +
    "#dsTray .tr{display:flex;gap:8px;height:100%;padding:8px;box-sizing:border-box;" +
    "transform:translateX(100%);transition:transform .25s ease}" +
    "#dsTray.open .tr{transform:none}" +
    "#dsTray button{flex:1;border:2px solid #1d1b26;border-radius:10px;background:#fff;" +
    "font:700 14px system-ui,sans-serif;color:#1d1b26}" +
    "#dsTray button.on{background:#ffd23f}" +
    "#dsGal{position:fixed;left:0;right:0;top:" + TOP + "px;bottom:0;background:#fff8ec;color:#1d1b26;" +
    "z-index:99980;overflow:auto;display:none;font-family:system-ui,sans-serif}" +
    "#dsGal .in{padding:10px}" +
    "#dsGal .hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:18px}" +
    ".dsBtn{padding:10px 14px;border:2px solid #1d1b26;border-radius:10px;background:#ffd23f;font-weight:700;" +
    "font-size:14px;color:#1d1b26}" +
    "#dsMsg{font-size:13px;line-height:1.5;color:#6b6878;margin:6px 0}" +
    "#dsGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}" +
    ".dsI{position:relative;aspect-ratio:1;background:#e8e2d2;overflow:hidden;border-radius:4px}" +
    ".dsI img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".dsI i{position:absolute;right:5px;bottom:5px;background:rgba(0,0,0,.65);color:#fff;font-style:normal;" +
    "font-size:11px;padding:2px 6px;border-radius:6px}" +
    "#dsView{position:fixed;inset:0;background:#000;z-index:99995;display:none;align-items:center;justify-content:center}" +
    "#dsView img,#dsView video{max-width:100%;max-height:100%}" +
    "#dsView button{position:absolute;top:12px;right:12px;z-index:2}";
  document.head.appendChild(st);

  const top = document.createElement("div");
  top.id = "dsTop";
  top.innerHTML = '<span id="dsTitle">🎬 Studio</span><button id="dsDots" aria-label="Menu">⋮</button>';
  document.body.appendChild(top);

  const tray = document.createElement("div");
  tray.id = "dsTray";
  tray.innerHTML =
    '<div class="tr">' +
    '<button data-t="studio" class="on">🎬 Studio</button>' +
    '<button data-t="yt">▶️ YouTube</button>' +
    '<button data-t="gal">🖼️ Gallery</button></div>';
  document.body.appendChild(tray);

  const gal = document.createElement("div");
  gal.id = "dsGal";
  gal.innerHTML =
    '<div class="in"><div class="hd"><b>🖼️ Gallery</b><button class="dsBtn" id="dsRef">⟳ Refresh</button></div>' +
    '<div id="dsMsg"></div><button class="dsBtn" id="dsAsk" style="display:none;margin-bottom:8px">Permission do</button>' +
    '<div id="dsGrid"></div><div id="dsMore" style="height:2px"></div></div>';
  document.body.appendChild(gal);

  const view = document.createElement("div");
  view.id = "dsView";
  view.innerHTML = '<button class="dsBtn" id="dsViewX">✕ Band</button>';
  document.body.appendChild(view);

  const $ = s => document.querySelector(s);
  const title = $("#dsTitle"), btns = tray.querySelectorAll("button");
  const NAMES = { studio: "🎬 Studio", yt: "▶️ YouTube", gal: "🖼️ Gallery" };
  let cur = "studio", trayOpen = false;

  // ---- YouTube native view ko top/tray ke neeche rakho ----
  async function syncYt() {
    if (cur !== "yt" || !P.YtView) return;
    try {
      await P.YtView.show({
        top: Math.round((TOP + (trayOpen ? TRAY : 0)) * dpr()),
        bottom: 0,
        url: "https://m.youtube.com/"
      });
    } catch (e) { toast("YouTube nahi khula: " + (e.message || e)); }
  }

  function setTray(open) {
    trayOpen = open;
    tray.classList.toggle("open", open);
    syncYt();
  }

  async function setTab(n) {
    cur = n;
    title.textContent = NAMES[n];
    btns.forEach(b => b.classList.toggle("on", b.dataset.t === n));
    gal.style.display = n === "gal" ? "block" : "none";
    setTray(false);
    if (n === "yt") await syncYt();
    else if (P.YtView) { try { await P.YtView.hide(); } catch (e) {} }
    window.scrollTo(0, 0);
    if (n === "gal") initGallery();
  }
  btns.forEach(b => b.addEventListener("click", () => setTab(b.dataset.t)));
  $("#dsDots").addEventListener("click", () => setTray(!trayOpen));

  // ---- left/right swipe (top bar ya tray par) se menu khule/band ho ----
  [top, tray].forEach(el => {
    let x0 = null, y0 = 0;
    el.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", e => {
      if (x0 === null) return;
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) setTray(!trayOpen);
    }, { passive: true });
  });
  // bahar tap karne par tray band
  document.addEventListener("click", e => {
    if (trayOpen && !tray.contains(e.target) && !top.contains(e.target)) setTray(false);
  }, true);

  // =====================================================================
  //  GALLERY: phone ki saari photo/video seedha dikhao (picker nahi)
  // =====================================================================
  const grid = $("#dsGrid"), msg = $("#dsMsg"), ask = $("#dsAsk");
  let items = [], offset = 0, total = 0, loading = false, ready = false, starting = false;
  const src = p => C.convertFileSrc(p);

  const thumbObs = new IntersectionObserver(es => {
    es.forEach(en => {
      if (!en.isIntersecting) return;
      const d = en.target; thumbObs.unobserve(d);
      const it = items[+d.dataset.i], img = d.querySelector("img");
      P.DsMedia.thumb({ id: it.id, type: it.type })
        .then(r => { img.src = src(r.path); })
        .catch(() => { if (it.type === "image") img.src = src(it.path); });
    });
  }, { root: gal, rootMargin: "400px" });

  function addItems(list) {
    list.forEach(it => {
      const i = items.push(it) - 1;
      const d = document.createElement("div");
      d.className = "dsI"; d.dataset.i = i;
      d.innerHTML = "<img decoding='async' alt=''>" + (it.type === "video" ? "<i>▶</i>" : "");
      d.addEventListener("click", () => openView(it));
      grid.appendChild(d);
      thumbObs.observe(d);
    });
  }

  async function loadMore() {
    if (loading || !ready || (total && offset >= total)) return;
    loading = true;
    try {
      const r = await P.DsMedia.list({ offset, limit: 90 });
      total = r.total;
      offset += 90;
      addItems(r.items || []);
      msg.textContent = total ? total + " photo/video" : "Gallery me kuch nahi mila.";
    } catch (e) { msg.textContent = "Gallery load nahi hui: " + (e.message || e); }
    loading = false;
  }
  new IntersectionObserver(es => { if (es[0].isIntersecting) loadMore(); }, { root: gal, rootMargin: "600px" })
    .observe($("#dsMore"));

  async function ensureMedia() {
    let p = await P.DsMedia.hasPermissions();
    if (p.media) return p;
    await P.DsMedia.requestPermissions();
    for (let i = 0; i < 120 && !p.media; i++) { await sleep(500); p = await P.DsMedia.hasPermissions(); }
    return p;
  }

  async function initGallery(force) {
    if ((ready && !force) || starting) return;
    if (!P.DsMedia) { msg.textContent = "Gallery plugin nahi mila (APK dubara build karo)."; return; }
    starting = true; ask.style.display = "none";
    msg.textContent = "Permission check ho raha hai...";
    const p = await ensureMedia();
    starting = false;
    if (!p.media) {
      msg.textContent = "Gallery permission nahi mili. Phone Settings → Apps → Dance Shorts Studio → Permissions → Photos and videos → Allow.";
      ask.style.display = "inline-block";
      return;
    }
    if (p.partial) msg.textContent = "Aapne sirf kuch photos allow ki hain. Sab dikhane ke liye Settings me 'Allow all' karo.";
    ready = true; items = []; offset = 0; total = 0; grid.innerHTML = "";
    loadMore();
  }
  ask.addEventListener("click", () => initGallery(true));
  $("#dsRef").addEventListener("click", () => { ready = false; initGallery(true); });

  // ---- viewer ----
  function openView(it) {
    const old = view.querySelector("img,video"); if (old) old.remove();
    const el = document.createElement(it.type === "video" ? "video" : "img");
    el.src = src(it.path);
    if (it.type === "video") { el.controls = true; el.autoplay = true; el.playsInline = true; }
    view.appendChild(el);
    view.style.display = "flex";
  }
  function closeView() {
    const v = view.querySelector("video"); if (v) v.pause();
    view.style.display = "none";
  }
  $("#dsViewX").addEventListener("click", closeView);

  // ---- Android back button ----
  if (P.App && P.App.addListener) {
    P.App.addListener("backButton", async ev => {
      if (view.style.display === "flex") return closeView();
      if (trayOpen) return setTray(false);
      if (cur === "yt") {
        let handled = false;
        try { handled = (await P.YtView.goBack()).handled; } catch (e) {}
        if (!handled) setTab("studio");
        return;
      }
      if (cur === "gal") return setTab("studio");
      if (ev && ev.canGoBack) history.back();
      else P.App.exitApp();
    });
  }
})();
