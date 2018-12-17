#! /bin/bash

docker run \
    -d \
    --name maelstrom-db-test \
    -p 127.0.0.1:2345:5432 \
    --env POSTGRES_PASSWORD=pass \
    --env POSTGRES_USER=maelstrom \
    --env POSTGRES_DB=maelstrom \
    postgres
