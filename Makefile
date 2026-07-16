.PHONY: dev down logs reset

dev:
	docker compose up --build

down:
	docker compose down --remove-orphans

logs:
	docker compose logs --follow

reset:
	docker compose down --volumes --remove-orphans
