1. __dirname，__filename, import.meta.url, fileURLToPath 关系

   - __dirname: 获取当前文件所在目录的绝对路径
   - __filename: 获取当前文件的绝对路径
   - import.meta.url: 它是一个file协议的 URL，例如 file:///Users/xxx/xxx.js
   - fileURLToPath(import.meta.url): 将 URL 转换为绝对路径，等价于 __filename
   - fileURLToPath(new URL('./src', import.meta.url)): 将 URL 转换为src目录的绝对路径，等价于 __dirname
   - new URL('./src', import.meta.url): 将当前文件(import.meta.url)所在目录与相对路径('./src')拼接，生成新的 URL
