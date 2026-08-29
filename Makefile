COMPOSE ?= docker compose
LOG_TAIL ?= 200
SERVICE ?=

.DEFAULT_GOAL := help

.PHONY: help dev dev-d dev-detached up build config ps logs \
	logs-backend logs-frontend logs-mailpit logs-postgres logs-minio \
	restart restart-backend stop shell-backend down reset

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target> [SERVICE=name] [LOG_TAIL=lines]\n\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Start the complete stack in the foreground and rebuild images
	$(COMPOSE) up --build

dev-d: dev-detached ## Alias for dev-detached

dev-detached: ## Start the complete stack in the background and rebuild images
	$(COMPOSE) up --build --detach

up: ## Start existing images in the background without rebuilding
	$(COMPOSE) up --detach

build: ## Build or rebuild development images
	$(COMPOSE) build

config: ## Validate and render the effective Compose configuration
	$(COMPOSE) config

ps: ## Show service status and published ports
	$(COMPOSE) ps

logs: ## Follow logs for all services or SERVICE=name (default tail: 200)
	$(COMPOSE) logs --follow --tail=$(LOG_TAIL) $(SERVICE)

logs-backend: ## Follow backend logs
	$(MAKE) logs SERVICE=backend LOG_TAIL=$(LOG_TAIL)

logs-frontend: ## Follow frontend logs
	$(MAKE) logs SERVICE=frontend LOG_TAIL=$(LOG_TAIL)

logs-mailpit: ## Follow Mailpit logs
	$(MAKE) logs SERVICE=mailpit LOG_TAIL=$(LOG_TAIL)

logs-postgres: ## Follow PostgreSQL logs
	$(MAKE) logs SERVICE=postgres LOG_TAIL=$(LOG_TAIL)

logs-minio: ## Follow MinIO logs
	$(MAKE) logs SERVICE=minio LOG_TAIL=$(LOG_TAIL)

restart: ## Restart all services or SERVICE=name
	$(COMPOSE) restart $(SERVICE)

restart-backend: ## Restart only the backend
	$(MAKE) restart SERVICE=backend

stop: ## Stop all services or SERVICE=name without removing containers
	$(COMPOSE) stop $(SERVICE)

shell-backend: ## Open a shell in the running backend container
	$(COMPOSE) exec backend sh

down: ## Stop and remove containers while keeping persistent data
	$(COMPOSE) down --remove-orphans

reset: ## Stop the stack and delete all local Compose volumes
	$(COMPOSE) down --volumes --remove-orphans
