#!/usr/bin/env sh
set -eu

project_name="${COMPOSE_PROJECT_NAME:-closet-ai-smoke}"

cleanup() {
  docker compose -p "${project_name}" down --remove-orphans
}
trap cleanup EXIT INT TERM

docker compose -p "${project_name}" build api worker
docker compose -p "${project_name}" up -d

api_container="$(docker compose -p "${project_name}" ps -q api)"

while [ "$(docker inspect --format='{{.State.Health.Status}}' "${api_container}")" != "healthy" ]; do
  sleep 2
done

curl --fail --silent --show-error http://127.0.0.1/api/v1/health
docker compose -p "${project_name}" ps
