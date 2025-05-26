
Read this in: [中文](README.md) | [English](README_EN.md)

# Bilibili Audio Player Chrome Extension - 使用说明

## 功能介绍

Bilibili Audio Player 是一个 Chrome 扩展，可以从 Bilibili 视频中提取音频并独立播放。主要功能包括：

1. 从 Bilibili 视频 URL 中提取音频 URL
2. 独立播放音频，关闭 Bilibili 视频页面不影响音频播放
3. 支持通过 SESSDATA 进行鉴权，访问需要登录的视频内容
4. 自动检测当前页面是否为 Bilibili 视频页面
5. 提供浮动按钮、弹出窗口和独立播放器窗口

## 安装说明

### 开发者模式安装

1. 下载并解压本扩展的 ZIP 文件
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择解压后的扩展目录（包含 manifest.json 的目录）

### 从 Chrome 网上应用店安装（未发布）

1. 访问 Chrome 网上应用店
2. 搜索"Bilibili Audio Player"
3. 点击"添加至 Chrome"

## 使用方法

### 方法一：在 Bilibili 视频页面使用

1. 访问任意 Bilibili 视频页面
2. 点击页面右下角出现的"提取音频"浮动按钮
3. 音频将在新窗口中打开并自动播放

### 方法二：通过扩展图标使用

1. 点击 Chrome 工具栏中的扩展图标
2. 如果当前页面是 Bilibili 视频页面，将显示视频信息和"播放此视频音频"按钮
3. 或者手动输入 Bilibili 视频链接，点击"提取并播放音频"

### 设置 SESSDATA（用于访问需要登录的视频）

1. 点击扩展弹出窗口底部的"设置"链接
2. 在设置页面输入您的 SESSDATA
3. 点击"保存设置"

获取 SESSDATA 的方法：
1. 登录 Bilibili 网站
2. 按 F12 打开开发者工具
3. 切换到 Application/应用 标签
4. 在左侧找到 Cookies > bilibili.com
5. 找到名为 SESSDATA 的 Cookie 并复制其值

## 播放器使用

播放器窗口提供以下功能：
- 播放/暂停控制
- 进度条拖动
- 音量调节
- 设置按钮（快速访问设置页面）

## 注意事项

- 本扩展仅用于个人学习和使用
- 请尊重 Bilibili 的版权和使用条款
- 某些视频可能需要登录才能提取音频
- 如遇到问题，请尝试更新 SESSDATA 或检查网络连接
