

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


## Login en Swagger
1. Abre /api/docs en tu navegador.
2. Haz clic en el botón verde Authorize 🔓 (arriba a la derecha).
3. En el formulario OAuth2PasswordBearer:
    • Username: Ingresa tu email de usuario registrado (el que usas para iniciar sesión en la app).
    • Password: Ingresa tu contraseña habitual.
4. Clic en Authorize y luego Close. Todos los requests que ejecutes desde Swagger incluirán automáticamente el header Authorization: Bearer <token>.