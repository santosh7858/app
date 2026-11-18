(function () {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return; // browser me kuch nahi karega
  const P = C.Plugins;

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText =
      "position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:#1d1b26;color:#fff;" +
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

  // =====================================================================
  //  3 TABS: Studio (app) | YouTube (native browser view) | Gallery (phone)
  // =====================================================================
  const BAR_H = 58;

  const st = document.createElement("style");
  st.textContent =
    "body{padding-bottom:" + BAR_H + "px!important}" +
    "#dsBar{position:fixed;left:0;right:0;bottom:0;height:" + BAR_H + "px;display:flex;background:#fff;" +
    "border-top:2px solid #1d1b26;z-index:99990;font-family:system-ui,sans-serif}" +
    "#dsBar button{flex:1;border:0;background:none;font:700 12px system-ui,sans-serif;color:#6b6878;padding:0}" +
    "#dsBar button span{display:block;font-size:22px;line-height:1.2}" +
    "#dsBar button.on{color:#1d1b26;background:#ffd23f}" +
    "#dsGal{position:fixed;left:0;right:0;top:0;bottom:" + BAR_H + "px;background:#fff8ec;color:#1d1b26;" +
    "z-index:99980;overflow:auto;display:none;font-family:system-ui,sans-serif}" +
    "#dsGal .in{max-width:720px;margin:0 auto;padding:16px}" +
    "#dsGal h2{margin:0 0 12px;font-size:22px}" +
    ".dsBtn{padding:12px 14px;border:2px solid #1d1b26;border-radius:10px;background:#ffd23f;font-weight:700;" +
    "font-size:14px;color:#1d1b26;width:100%}" +
    "#dsGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px}" +
    ".dsI{position:relative;aspect-ratio:1;background:#e8e2d2;border-radius:8px;overflow:hidden}" +
    ".dsI img,.dsI video{width:100%;height:100%;object-fit:cover;display:block}" +
    ".dsI i{position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.65);color:#fff;font-style:normal;" +
    "font-size:11px;padding:2px 6px;border-radius:6px}" +
    "#dsView{position:fixed;inset:0;background:#000;z-index:99995;display:none;align-items:center;justify-content:center}" +
    "#dsView img,#dsView video{max-width:100%;max-height:100%}" +
    "#dsView button{position:absolute;top:12px;right:12px;z-index:2;width:auto;padding:8px 12px}";
  document.head.appendChild(st);

  const bar = document.createElement("nav");
  bar.id = "dsBar";
  bar.innerHTML =
    '<button data-t="studio" class="on"><span>🎬</span>Studio</button>' +
    '<button data-t="yt"><span>▶️</span>YouTube</button>' +
    '<button data-t="gal"><span>🖼️</span>Gallery</button>';
  document.body.appendChild(bar);

  const gal = document.createElement("div");
  gal.id = "dsGal";
  gal.innerHTML =
    '<div class="in"><h2>🖼️ Gallery</h2>' +
    '<button class="dsBtn" id="dsPick">Phone ki gallery kholo</button>' +
    '<input id="dsFile" type="file" accept="image/*,video/*" multiple hidden>' +
    '<div id="dsGrid"></div></div>';
  document.body.appendChild(gal);

  const view = document.createElement("div");
  view.id = "dsView";
  view.innerHTML = '<button class="dsBtn" id="dsViewX">✕ Band</button>';
  document.body.appendChild(view);

  const btns = bar.querySelectorAll("button");
  const grid = gal.querySelector("#dsGrid");
  const input = gal.querySelector("#dsFile");
  let cur = "studio";

  function barPx() {
    return Math.round(bar.getBoundingClientRect().height * (window.devicePixelRatio || 1));
  }

  async function setTab(n) {
    cur = n;
    btns.forEach(b => b.classList.toggle("on", b.dataset.t === n));
    gal.style.display = n === "gal" ? "block" : "none";
    if (n === "yt") {
      try {
        await P.YtView.show({ bottom: barPx(), url: "https://m.youtube.com/" });
      } catch (e) { toast("YouTube nahi khula: " + (e.message || e)); }
    } else if (P.YtView) {
      try { await P.YtView.hide(); } catch (e) {}
    }
    window.scrollTo(0, 0);
    if (n === "gal" && !grid.children.length) input.click(); // pehli baar seedha gallery khule
  }
  btns.forEach(b => b.addEventListener("click", () => setTab(b.dataset.t)));

  // ----- Gallery -----
  gal.querySelector("#dsPick").addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    Array.from(input.files || []).forEach(f => {
      const url = URL.createObjectURL(f);
      const isVid = (f.type || "").indexOf("video") === 0;
      const d = document.createElement("div");
      d.className = "dsI";
      const el = document.createElement(isVid ? "video" : "img");
      el.src = url;
      if (isVid) { el.preload = "metadata"; el.muted = true; el.playsInline = true; }
      d.appendChild(el);
      if (isVid) { const b = document.createElement("i"); b.textContent = "▶"; d.appendChild(b); }
      d.addEventListener("click", () => openView(url, isVid));
      grid.appendChild(d);
    });
    input.value = "";
  });

  function openView(url, isVid) {
    const old = view.querySelector("img,video");
    if (old) old.remove();
    const el = document.createElement(isVid ? "video" : "img");
    el.src = url;
    if (isVid) { el.controls = true; el.autoplay = true; el.playsInline = true; }
    view.appendChild(el);
    view.style.display = "flex";
  }
  function closeView() {
    const v = view.querySelector("video");
    if (v) v.pause();
    view.style.display = "none";
  }
  view.querySelector("#dsViewX").addEventListener("click", closeView);

  // ----- Android back button -----
  if (P.App && P.App.addListener) {
    P.App.addListener("backButton", async (ev) => {
      if (view.style.display === "flex") return closeView();
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
