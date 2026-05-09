# 3D圣诞树 - 手势交互应用

一个基于 Three.js 和 MediaPipe 的高性能 3D 粒子圣诞树 Web 应用，支持手势识别交互控制。

## 🛠 技术栈

- **Frontend**: 原生 JavaScript + Three.js + WebGL
- **手势识别**: MediaPipe Hands
- **生产服务**: Nginx
- **样式**: 原生 CSS (现代 CSS 变量 + Flexbox/Grid)

## ✨ 核心功能

| 手势        | 功能       | 描述                                         |
| ----------- | ---------- | -------------------------------------------- |
| 👊 握拳     | 圣诞树形态 | 粒子重构为圣诞树轮廓，底部到顶部密度自然递减 |
| 🖐 张开手掌 | 星云形态   | 粒子平滑过渡为星云分布，支持手部移动控制旋转 |
| 👉 指向右侧 | 照片展示   | 平滑放大过渡动画展示照片 (0.8-1.2秒)         |
| 👌 OK手势   | 告白信     | 打字机效果展示预设告白文本                   |
| ✌️ 剪刀手   | 切换主题   | 循环切换4种颜色主题，0.5秒平滑过渡           |

## 🎨 颜色主题

1. **经典红绿** - 传统圣诞配色
2. **金色华丽** - 金橙暖色调
3. **冰蓝梦幻** - 蓝色冷色调
4. **紫色魔法** - 紫粉梦幻色

## 🚀 启动指南 (How to Run)

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 生产部署

生产构建产物位于 `dist/`，可由 Nginx 等静态文件服务部署。仓库上一级目录提供独立 Dockerfile，可用于构建单容器生产镜像。

## 🔗 服务地址 (Services)

- **Frontend**: http://localhost:3000

## 📱 设备要求

- 现代浏览器 (Chrome 80+, Safari 14+, Firefox 78+)
- 摄像头权限 (用于手势识别)
- 支持 WebGL 2.0

## ⚡ 性能优化

- **粒子实例化渲染**: 使用 `THREE.Points` 减少绘制调用
- **自定义着色器**: 优化的顶点/片元着色器，减少 GPU 计算开销
- **深度分层渲染**: 通过 Z 轴坐标区分层次，动态调整透明度和大小
- **手势识别优化**: 使用 MediaPipe Lite 模型，识别延迟 < 200ms
- **响应式像素比**: 限制 `devicePixelRatio` 最大为 2，平衡画质与性能
- **资源预加载**: 确保手势触发效果即时响应

## 📂 项目结构

```
344/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── app.js              # 主应用逻辑
├── nginx.conf          # Nginx 配置
├── package.json        # 项目配置
├── assets/             # 资源文件夹
│   └── .gitkeep
├── .gitignore          # Git 忽略文件
└── README.md           # 项目文档
```

## 🔧 自定义配置

### 更换照片

将照片放入 `assets/` 文件夹，然后修改 `app.js` 中的 `demoPhotoUrl` 变量。

### 修改告白文本

编辑 `app.js` 中的 `loveLetterContent` 变量。

### 添加颜色主题

在 `app.js` 的 `colorThemes` 数组中添加新的主题对象。

## 📄 License

MIT License
