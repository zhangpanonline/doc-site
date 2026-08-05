### 安装 ###

1. `npm install tailwindcss @tailwindcss/vite`  

2. 在 `main.ts` 里引入的 `styles/index.css` 文件最上方写入
     ```css
        @import "tailwindcss";
    ```

3. 在 `vite.config.ts` 配置：
    ```js
        import { defineConfig } from 'vite'
        import tailwindcss from '@tailwindcss/vite'
        export default defineConfig({
        plugins: [
            tailwindcss(),
        ],
        })
    ```
