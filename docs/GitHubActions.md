---
sidebar_position: 2
title: GitHub Actions
---

# 使用 `GitHub Actions` +  `semantic-release` 实现全自动的版本管理和发布
* 自动版本管理
* 自动 changelog
* 自动打 tag
* 自动 GitHub Release
## 安装、配置
### 1. 安装依赖
```bash
pnpm add -D semantic-release \
  @semantic-release/git \
  @semantic-release/changelog \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/github
```
### 2. 创建 .releaserc.cjs 配置文件
在项目根目录新建 .releaserc.cjs 文件
### 3. 添加 GitHub Actions 工作流
创建 `.github/workflows/release.yml` 文件
### 4. 配置 GitHub Secrets（GH_TOKEN）
1. 打开你的 GitHub 仓库

2. 进入 Settings > Secrets and variables > Actions

3. 点击 “New repository secret”

4. 名称填：GH_TOKEN

5. 值填：你的 GitHub 个人访问令牌  
>   如何生成 GitHub Token？  
    访问：https://github.com/settings/tokens → 生成 Fine-grained token：
    权限至少包括：   
    - contents: read/write  
    - metadata: read  
    - workflow: read/write（可选）

### 5. 规范你的提交信息（Conventional Commits）
你要确保提交信息如下格式：
```bash
feat: 添加登录功能
fix: 修复按钮点击无效问题
chore: 升级依赖版本
```
semantic-release 会自动解析这些提交，决定 bump 哪种版本（major / minor / patch）

### 6. 触发自动发布
当你将新代码 push 到 main 分支时，GitHub Actions 会触发：
* 自动分析 commit
* 自动 bump 版本号（更新 package.json）
* 自动更新 CHANGELOG.md
* 自动创建 Git Tag
* 自动生成 GitHub Release


### 项目结构预览（最终）
```pgsql
.github/
└── workflows/
    └── release.yml         ← GitHub Actions 脚本
.releaserc.js               ← semantic-release 配置
CHANGELOG.md                ← 自动生成
package.json                ← 自动更新版本号
```

## INTERVIEW
1. 我们在项目中使用了 semantic-release + GitHub Actions 组成全自动版本发布体系。通过分析符合 Conventional Commit 格式的提交信息，自动更新版本号、生成 changelog、打 Git tag，并发布 GitHub Release，彻底解放人工流程，实现企业级 DevOps 自动化交付。

## 参考文档
[别再手动发版开源项目了！ GitHub + NPM 的自动化发版【Semantic Release 详细教程】](https://juejin.cn/post/7443382399699877925)  
