from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine

db = SQLAlchemy()


@event.listens_for(Engine, "connect")
def _enforce_sqlite_foreign_keys(connection, record):
    """Hace que SQLite respete las claves foráneas, como hace PostgreSQL.

    SQLite las ignora salvo que se le pida por conexión. Varias relaciones del
    modelo usan `passive_deletes=True` y delegan el borrado en cascada a la
    base, así que sin esto las pruebas dejaban filas huérfanas que en
    producción sí se borran: el resultado era una suite más permisiva que el
    entorno real, que es la clase de diferencia que esconde errores.
    """
    if connection.__class__.__module__.startswith("sqlite3"):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
