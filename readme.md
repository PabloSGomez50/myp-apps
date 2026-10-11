

## Restaurar PostgreSQL
- Cerrar conexiones abiertas y limitar base de datos
```
docker exec -it myp_postgres psql -U "$POSTGRES_USER" -d postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'myp_db' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS myp_db;"
```
- Restaurar dump:
```
Get-Content ./myp_postgres_2026-10-11/postgres.sql | docker exec -i myp_postgres psql -U myp_user -d postgres
```