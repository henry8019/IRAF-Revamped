# 参与 IRAF-Revamped 开发

[English](CONTRIBUTING.md)

试用工作台请看[一键启动说明](README.zh-CN.md#-从-github-一键启动)。报告故障时，请附上提交号（`git rev-parse --short HEAD`）、操作系统、浏览器和最短复现步骤。安全问题请走[私下报告渠道](SECURITY.md)。

## 修改代码

Fork 仓库，克隆自己的副本，然后新建工作分支。React 界面在 `src/`，本地 HTTP 服务在 `workbench.py`，方框平滑算法在 `boxcar.py`。导入文件的三项计算在 `reductions.py` 中。

修改前端请使用 Node.js 24，在仓库根目录执行以下命令。把重新构建的 `dist/` 和源码一起提交，其他人克隆后就能直接启动，无需安装 Node.js。

```sh
npm ci
npm run build
git status --short -- dist
```

## 在本地验证

先用 Python 3.12 执行 `python tests/launch_smoke.py`（部分系统使用 `python3`）。它会调用当前平台的一键启动入口、准备运行环境、检查空工作区，并关闭服务。将环境变量 `UV_OFFLINE` 设为 `1` 后再执行一次，可以验证已准备好的环境能否离线启动。

然后在仓库根目录执行以下命令。可将命令中的 `uv` 换成启动器已下载的可执行文件，即 macOS 和 Linux 上的 `.runtime/uv`，或 PowerShell 中的 `.\.runtime\uv.exe`。全新 Linux 环境可用 `install --with-deps chromium` 一并安装浏览器的系统依赖。

```sh
uv run --locked --group test python -m unittest discover -s tests
uv run --locked --group test python -m playwright install chromium
uv run --locked --group test python tests/desktop_ui.py
```

修改数值算法时，请提供小型模拟输入或可公开的数据，注明单位、参考值的来源和容许误差。原版 IRAF 用作对照。如果原版输出与科学定义冲突，请记录两者的数值，并用科学定义给出的结果编写回归测试。

向 `main` 发起拉取请求，写明改动和实际跑过的检查。维护者可以查看该提交的 CI 记录，核对构建与三个操作系统的启动结果。涉及科学结果时，请同时审核参考值和误差范围。

## 发布新版本

同步更新 `pyproject.toml`、`package.json` 中的应用版本号和两份锁文件，重新构建 `dist/`，并更新双语变更记录及两个 README 的下载链接。发布 PR 和合并提交的 CI 通过后，给该提交打上 `vX.Y.Z` 标签，在 GitHub Releases 发布对应的更新说明。下载并解压标签归档，从解压副本运行启动测试。
