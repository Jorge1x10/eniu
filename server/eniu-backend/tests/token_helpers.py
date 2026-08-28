"""Manipulación de JWT para las pruebas de seguridad."""


def tamper_signature(token):
    """Altera un carácter del centro de la firma de un JWT.

    Cambiar el último no sirve: en base64url el carácter final de una firma de
    32 bytes sólo lleva dos bits significativos, así que uno de cada cuatro
    reemplazos decodifica a la misma firma y el token «alterado» sigue siendo
    válido. Medido sobre firmas al azar, la alteración no surtía efecto en el
    6% de los casos, y las pruebas que la usaban pasaban o fallaban según con
    qué carácter terminara el token de ese arranque.

    Los caracteres centrales llevan sus seis bits, de modo que cambiarlos
    invalida la firma siempre.
    """
    header, payload, signature = token.split(".")
    middle = len(signature) // 2
    replacement = "a" if signature[middle] != "a" else "b"
    return f"{header}.{payload}.{signature[:middle]}{replacement}{signature[middle + 1:]}"
