module.exports = {
    "logging": false,
    "entities": [
        "build/entities/**/*.js"
    ],
    "migrations": [
        "build/migrations/**/*.js"
    ],
    "cli": {
        "entitiesDir": "sources/entities",
        "migrationsDir": "sources/migrations"
    },
    "type": "postgres",
    "host": process.env['MAELSTROM_DBHOST'] || 'localhost',
    "port": process.env['MAELSTROM_DBPORT'] || 5432,
    "username": process.env['MAELSTROM_DBUSERNAME'] || 'maelstrom',
    "password": process.env['MAELSTROM_DBPASSWORD'] || 'pass',
    "database": process.env['MAELSTROM_DBNAME'] || 'maelstrom',
    "migrationsTableName": "migrations",
};
