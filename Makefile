.PHONY: lint format install-dev serve

install-dev:
	uv pip install -e ".[dev]"

format:
	uv run black --preview .

lint:
	uv run black --check .

serve:
	uv run server.py --reload

langgraph-dev:
	uvx --refresh --from "langgraph-cli[inmem]" --with-editable . --python 3.12 langgraph dev --allow-blocking
