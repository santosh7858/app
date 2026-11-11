(function () {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return; // browser me kuch nahi karega
  const P = C.Plugins;

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
})();
