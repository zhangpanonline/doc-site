import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'url'
const staticDir = fileURLToPath(new URL('../static/download', import.meta.url))
const outFile = fileURLToPath(new URL('../src/pages/download/fileList.json', import.meta.url));


function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function generate() {
  const files = fs.readdirSync(staticDir).map((file) => {
    const stats = fs.statSync(path.join(staticDir, file));
    return {
      name: file,
      path: `/download/${file}`, // 对应 static/download 目录
      size: formatSize(stats.size),
      date: stats.birthtime.toLocaleDateString(),
    };
  });

  fs.writeFileSync(outFile, JSON.stringify(files, null, 2));
  console.log("✅ 文件列表已更新:", outFile);
}

generate();

// 如果是开发环境，监听文件变化
// if (process.env.NODE_ENV !== "production") {
//   fs.watch(staticDir, generate);
// }

