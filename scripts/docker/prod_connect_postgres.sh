#!/usr/bin/env bash

docker run -it --rm --link maelstrom-db:maelstrom-db-psql postgres psql -h maelstrom-db-psql -U maelstrom
