.PHONY: dev down logs rebuild

dev:
	docker compose -f deploy/compose/docker-compose.yml up --build

down:
	docker compose -f deploy/compose/docker-compose.yml down -v

logs:
	docker compose -f deploy/compose/docker-compose.yml logs -f --tail=200

rebuild:
	docker compose -f deploy/compose/docker-compose.yml up --build --force-recreate
