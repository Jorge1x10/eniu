"""Configuración de gunicorn para el despliegue en Render.

El punto importante de este archivo es `preload_app`. Sin él, gunicorn hace
fork *antes* de importar la aplicación, así que cada worker carga su propia
copia de Flask, SQLAlchemy, stripe, google-auth y (cuando STORAGE_BACKEND=s3)
botocore: en una instancia de 512 MB eso significa pagar el mismo costo fijo
tantas veces como workers haya. Con `preload_app` la app se importa una sola
vez y los workers se bifurcan después, de modo que todas esas páginas de
memoria quedan compartidas por copy-on-write entre los procesos.

A cambio, todo lo que se haya creado antes del fork queda compartido, y hay
cosas que no se pueden compartir entre procesos: sockets. De ahí el
`post_fork` de abajo.
"""
import os

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"

# Ambos ajustables por variable de entorno sin tocar código. En una instancia
# de 0.5 CPU la carga es de E/S (Postgres y archivos), no de cálculo, así que
# los threads rinden más que los procesos; bajar WEB_CONCURRENCY a 1 es la
# palanca directa si la memoria vuelve a apretar.
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
threads = int(os.getenv("WEB_THREADS", "4"))
timeout = int(os.getenv("WEB_TIMEOUT", "60"))

preload_app = True

# Recicla los workers cada tanto para que cualquier crecimiento gradual de
# memoria no se acumule durante días. El jitter evita que todos los workers
# se reinicien en la misma petición y dejen un hueco sin capacidad.
max_requests = int(os.getenv("WEB_MAX_REQUESTS", "1000"))
max_requests_jitter = int(os.getenv("WEB_MAX_REQUESTS_JITTER", "100"))

accesslog = "-"
errorlog = "-"


def post_fork(server, worker):
    """Descarta en cada worker las conexiones heredadas del proceso padre.

    Con `preload_app`, Flask-SQLAlchemy ya creó su engine (y su pool) durante
    `create_app`, antes del fork. Los sockets TCP de ese pool quedan
    duplicados en todos los workers: dos procesos escribiendo sobre la misma
    conexión a Postgres produce errores intermitentes y difíciles de leer
    ("server closed the connection unexpectedly", respuestas cruzadas).

    `dispose()` no cierra las conexiones heredadas de golpe -- descarta el
    pool para que este worker abra las suyas la próxima vez que las use.
    """
    from run import app
    from app.database.db import db

    with app.app_context():
        db.engine.dispose()
