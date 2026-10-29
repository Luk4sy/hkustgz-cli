---
name: hkustgz-cli
description: Use when inspecting or managing the installed hkustgz-cli Skill bundle for HKUST(GZ).
metadata:
  version: 0.1.0-alpha.1
  compatible_cli: 0.1.0-alpha.1
  schemaVersion: '1'
---

# hkustgz-cli 管理说明

当前包版本0.1.0-alpha.1，要求CLI精确同版本。本批只提供Skill管理；完整校园查询调用指引在后续批次验收。

使用hkustgz-cli skill path/status查看随包路径或安装状态；显式执行skill install --target codex安装，skill uninstall --target codex卸载。写入前可加--dry-run。安装到自定义根目录用--dir绝对路径，不同时使用--target。

发现用户修改或未知文件时保留现场，不能替用户删除冲突文件、锁、浏览器profile或客户端配置。Skill载入不安装软件、不触发学校查询。安装后由用户刷新或重启客户端，不能将文件已写入当成客户端已识别。
