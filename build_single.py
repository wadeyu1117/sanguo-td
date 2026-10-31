import subprocess, base64, os, re, glob
root = os.path.dirname(os.path.abspath(__file__))
subprocess.run(["npx", "vite", "build", "--mode", "single", "--outDir", "dist_single", "--emptyOutDir"], cwd=root, check=True)
html = open(f"{root}/dist_single/index.html", encoding="utf-8").read()
os.makedirs("/tmp/sanguo_small", exist_ok=True)
for png in glob.glob(f"{root}/public/portraits/*.png"):
    name = os.path.basename(png); small = f"/tmp/sanguo_small/{name[:-4]}.jpg"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", png, "-vf", "scale=256:256", "-q:v", "4", small], check=True)
    uri = "data:image/jpeg;base64," + base64.b64encode(open(small, "rb").read()).decode()
    html = html.replace(f"./portraits/{name}", uri).replace(f"/portraits/{name}", uri)
# 動態組合的路徑：`/portraits/${...}.png` → 查表
table = {os.path.basename(p)[:-4]: "data:image/jpeg;base64," + base64.b64encode(open(f"/tmp/sanguo_small/{os.path.basename(p)[:-4]}.jpg","rb").read()).decode() for p in glob.glob(f"{root}/public/portraits/*.png")}
inject = "<script>window.__PORTRAITS=" + __import__("json").dumps(table) + ";</script>"
html = html.replace("<head>", "<head>" + inject, 1)
html = html.replace("./data:image", "data:image").replace(".data:image", "data:image")
out = f"{root}/dist_single/sanguo_td.html"
open(out, "w", encoding="utf-8").write(html)
print(out, os.path.getsize(out) // 1024, "KB")
