#! /bin/bash

docker run \
    -d \
    --name maelstrom-db \
    -p 127.0.0.1:5432:5432 \
    --env POSTGRES_PASSWORD=pass \
    --env POSTGRES_USER=maelstrom \
    --env POSTGRES_DB=maelstrom \
    --volume maelstrom_data:/var/lib/postgresql:rw \
    --restart always \
    postgres
