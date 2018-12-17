#!/usr/bin/env bash

docker run -it --rm --link maelstrom-db-test:maelstrom-db-psql postgres psql -h maelstrom-db-psql -U maelstrom
