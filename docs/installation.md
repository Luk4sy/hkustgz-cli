# Alpha 安装与使用

目前为本地验收阶段，未上传npm，尚未完成第二名学生验收。许可证和向其他同学交付仍待维护者确认；不要把开发者安装包再分发。首轮目标为macOS、Google Chrome、Node.js 24.x与npm；其他平台未验收。

## 安装明确版本产物

在维护者确认分发后，取得对应版本tgz及SHA256，从本机绝对路径安装：

```bash
npm install --global '/absolute/path/hkustgz-cli-0.1.0-alpha.1.tgz'
hkustgz-cli --version
hkustgz-cli --help
hkustgz-cli capabilities --format table
```

包使用生产依赖；安装需要npm依赖下载或已填充缓存。无需克隆仓库、运行TypeScript或在源码目录操作。不要使用尚未发布的npx地址。若npm提示全局目录权限不足，使用自己拥有的npm prefix并配置相应PATH；不要盲目sudo。

本包安装不下载/启动浏览器、不发起学校请求、不登录、不安装Skill或修改Codex配置。doctor、Skill管理、browser install尚未实现，不能作为本批可用命令。

## 首次查询和登录

公开目录无需登录，但需要本机Chrome：

```bash
hkustgz-cli catalog search AIAA5032 --format table
```

私人系统在专用窗口本人正常登录：

```bash
hkustgz-cli browser use chrome
hkustgz-cli auth login sis
hkustgz-cli auth status sis --format table
hkustgz-cli sis today --format table
```

Portal或Canvas使用对应service。会话默认保存于~/.hkustgz-cli，不读取日常Chrome Cookie；一次运行一条浏览器命令，已有进程未结束时不要重复启动。无需向维护者发送密码、Token或profile。

## 升级与卸载

取得后续确认版本tgz后用同样npm install --global命令替换；升级不清理专用会话，也不保证学校登录永远有效。安装版Skill同步将在后续批次提供。

```bash
# 如需主动清理本工具的登录会话，在卸载前执行：
hkustgz-cli auth logout
npm uninstall --global hkustgz-cli
```

npm卸载只移除CLI包；不删除会话或其他客户端内容。logout不等于撤销学校所有设备的会话。

## 开发者构建

源码目录使用npm ci、npm run build。npm pack会先清理dist并重新构建，生成只包含运行时代码和公开文档的tgz。安装消费者无需scripts目录；构建脚本只在生产包的打包方执行。
