#! /bin/bash

docker run \
    -d \
    --name maelstrom-db \
    -p 5432:5432 \
    --env POSTGRES_PASSWORD=pass \
    --env POSTGRES_USER=maelstrom \
    --env POSTGRES_DB=maelstrom \
    --volume maelstrom_data:/var/lib/postgresql/data:rw \
    --restart always \
    postgres
