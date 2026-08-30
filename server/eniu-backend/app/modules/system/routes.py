from flask import Blueprint, jsonify


system_bp = Blueprint("system", __name__, url_prefix="/api")

# Sin prefijo: la raíz vive fuera de `/api`, que es de donde cuelga todo lo
# demás. Va en su propio blueprint porque `system_bp` ya lleva el prefijo y no
# se le puede colgar una ruta por encima.
root_bp = Blueprint("root", __name__)


def _alive():
    return jsonify({"status": "ok", "service": "eniu-api"}), 200


@system_bp.get("/health")
def health():
    return _alive()


@root_bp.get("/")
def root():
    """Contesta a quien comprueba que el servicio sigue en pie.

    La API entera cuelga de `/api`, así que la raíz no existía y devolvía 404.
    Render la pide por defecto: al recibir un 404 da el servicio por enfermo y
    lo reinicia, y un reinicio a destiempo es la app sin poder entrar justo
    cuando alguien la abre.

    Lo correcto sigue siendo apuntar el health check a `/api/health`; esto es
    el cinturón para cuando se queda en la raíz por descuido.

    No consulta la base de datos a propósito. Esto se llama muchas veces por
    minuto, y un health check que dependa de la base convierte cualquier hipo
    de la conexión en un reinicio del servicio.
    """
    return _alive()
