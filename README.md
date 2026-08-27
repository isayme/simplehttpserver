# SimpleHttpServer

一个简单的文件上传服务器，提供 Web 界面支持拖拽、粘贴和多文件上传。上传目录、端口与 Web 页面路径均可配置，适合快速分享或收集文件到本机/局域网。

## 功能

- Web 界面拖拽 / 选择 / 粘贴文件上传
- 支持多文件同时上传
- 显示上传进度
- 上传失败可点击重试
- 上传目录自动创建并校验读写权限
- 可选启用独立的 Web 上传页面

## 安装
```
# 使用 curl 安装
curl -fsSL https://raw.githubusercontent.com/isayme/simplehttpserver/refs/heads/master/install.sh | bash

# 使用 wget 安装
wget -qO- https://raw.githubusercontent.com/isayme/simplehttpserver/refs/heads/master/install.sh | bash
```

### 启动服务

```bash
# 使用默认配置
simplehttpserver

# 指定上传目录和端口
simplehttpserver -d /tmp/uploads -p 8080

# 在上传目录启用独立的 Web 上传页面（路径 /upload）
simplehttpserver -d /tmp/uploads --web-path=/upload

# 查看帮助
simplehttpserver -h
```

启动后浏览器访问 `http://localhost:8080` 即可。服务器会以当前目录作为静态文件服务根目录；若设置了 `--web-path`，则同时在该路径提供服务端内置的上传页面。

## 上传示例

### 通过 curl 上传

```bash
# 上传单个文件
curl -F "files=@/path/to/file.txt" http://localhost:8080/api/upload

# 上传多个文件
curl -F "files=@/path/to/a.txt" -F "files=@/path/to/b.txt" http://localhost:8080/api/upload
```

### 通过 Web 上传

启动服务器后，浏览器访问 `http://localhost:8080`。可通过两种方式上传：

- 直接访问内置上传页面（需启用 `--web-path`）：
  ```bash
  simplehttpserver -d /tmp/uploads --web-path=/upload
  ```
  然后浏览器打开 `http://localhost:8080/upload`.

- 在支持上传的 Web 页面中，使用 `multipart/form-data` 表单请求 `POST /api/upload`，文件字段名为 `files`，支持一次提交单个或多个文件。

> 上传接口统一为 `POST /api/upload`，接收 `multipart/form-data`，字段名 `files` 可重复出现以支持多文件。
