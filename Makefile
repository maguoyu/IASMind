.PHONY: lint format install-dev serve

install-dev:
	uv pip install -e ".[dev]"

format:
	uv run black --preview .

lint:
	uv run black --check .

# 开发相关命令
dev:
	python scripts/dev_server.py

dev-debug:
	python scripts/dev_server.py --log-level debug

# 启动服务（生产模式，无热部署）
serve:
	python server.py --no-reload

langgraph-dev:
	uvx --refresh --from "langgraph-cli[inmem]" --with-editable . --python 3.12 langgraph dev --allow-blocking
