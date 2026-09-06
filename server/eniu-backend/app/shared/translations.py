"""Catálogo de traducción de los mensajes de la API.

La clave es el texto en español tal como aparece en el código, igual que el
`msgid` de gettext. Cuando cambies un mensaje en su módulo, cambia también la
clave aquí: si dejan de coincidir, la cadena sale en español sin avisar. La
prueba `tests/test_i18n.py` recorre el código y falla cuando encuentra un
mensaje sin traducir, que es la red que evita ese descuido.

Los marcadores son con nombre (`{limit}`, no `{}`) para que la traducción pueda
reordenarlos sin depender de la posición.
"""

# Los mensajes de límite de plan se mantienen neutros, igual que en español:
# no nombran precios ni invitan a comprar, porque la app de iOS no puede
# ofrecer una compra fuera de las reglas de Apple.
_EN = {
    # --- Sesión y autenticación -------------------------------------------
    "La sesión no es válida": "Your session is not valid",
    "La sesión ya no es válida": "Your session is no longer valid",
    "Inicio de sesión correcto": "Signed in successfully",
    "Usuario registrado correctamente": "Account created successfully",
    "Autenticación con Google correcta": "Signed in with Google",
    "Autenticación con Apple correcta": "Signed in with Apple",
    "Usuario no encontrado": "Account not found",
    "Usuario/correo y contraseña son obligatorios": (
        "Email or username and password are required"
    ),
    "No fue posible autenticar al usuario": "We couldn't sign you in",
    "No fue posible registrar al usuario": "We couldn't create your account",
    "No fue posible autenticar con Google": "We couldn't sign you in with Google",
    "No fue posible autenticar con Apple": "We couldn't sign you in with Apple",
    "La credencial de Google es obligatoria": "The Google credential is required",
    "La credencial de Google no es válida": "The Google credential is not valid",
    "La credencial de Apple es obligatoria": "The Apple credential is required",
    "La credencial de Apple no es válida": "The Apple credential is not valid",
    "Google no ha verificado este correo": "Google hasn't verified this email address",
    "Apple no ha verificado este correo": "Apple hasn't verified this email address",
    "Apple no compartió un correo con Eniu. Inicia sesión con el método que usaste al registrarte": (
        "Apple didn't share an email address with Eniu. Sign in using the method "
        "you signed up with"
    ),
    "El correo ya está registrado": "That email address is already registered",
    "El correo ya está vinculado con otra cuenta de Google": (
        "That email address is already linked to another Google account"
    ),
    "El correo ya está vinculado con otra cuenta de Apple": (
        "That email address is already linked to another Apple account"
    ),
    "El correo, usuario o teléfono ya está registrado": (
        "That email address, username or phone number is already registered"
    ),
    "El nombre de usuario ya está registrado": "That username is already taken",
    "El teléfono ya está registrado": "That phone number is already registered",
    "No fue posible vincular esta cuenta de Google": (
        "We couldn't link this Google account"
    ),
    "No fue posible vincular esta cuenta de Apple": (
        "We couldn't link this Apple account"
    ),
    "Las demás sesiones fueron cerradas": "Your other sessions were signed out",
    "No fue posible cerrar las sesiones": "We couldn't sign out your sessions",
    "La solicitud es demasiado grande": "The request is too large",

    # --- Contraseña --------------------------------------------------------
    "La contraseña es obligatoria": "A password is required",
    "La contraseña debe tener al menos {min} caracteres": (
        "Your password must be at least {min} characters long"
    ),
    "La contraseña no puede superar {max} caracteres": (
        "Your password can't be longer than {max} characters"
    ),
    "La contraseña actual es incorrecta": "Your current password is incorrect",
    "La contraseña no es correcta": "That password is incorrect",
    "La contraseña actual y la nueva son obligatorias": (
        "Both your current and new password are required"
    ),
    "La nueva contraseña debe ser diferente de la actual": (
        "Your new password must be different from your current one"
    ),
    "Contraseña actualizada correctamente": "Password updated successfully",
    "No fue posible actualizar la contraseña": "We couldn't update your password",
    "Usa la recuperación por correo para establecer una contraseña": (
        "Use email recovery to set a password"
    ),
    "El enlace y la nueva contraseña son obligatorios": (
        "The link and your new password are required"
    ),
    "El enlace de recuperación no es válido": "That recovery link is not valid",
    "El enlace de recuperación venció": "That recovery link has expired",
    "El enlace de recuperación ya fue utilizado o no es válido": (
        "That recovery link has already been used or is not valid"
    ),
    "Si existe una cuenta asociada, recibirás instrucciones para restablecer tu contraseña.": (
        "If an account exists for that address, you'll receive instructions to "
        "reset your password."
    ),
    "Tu contraseña fue actualizada. Ya puedes iniciar sesión.": (
        "Your password has been updated. You can sign in now."
    ),

    # --- Correo de recuperación -------------------------------------------
    "Restablece tu contraseña de ENIU": "Reset your ENIU password",
    "Recibimos una solicitud para cambiar tu contraseña.": (
        "We received a request to change your password."
    ),
    "Abre este enlace para continuar: {url}": "Open this link to continue: {url}",
    "El enlace estará disponible durante {minutes} minutos.": (
        "The link will work for the next {minutes} minutes."
    ),
    "Si tú no realizaste esta solicitud, puedes ignorar este mensaje.": (
        "If you didn't make this request, you can ignore this message."
    ),

    # --- Perfil y cuenta ---------------------------------------------------
    "Perfil actualizado correctamente": "Profile updated successfully",
    "No fue posible actualizar el perfil": "We couldn't update your profile",
    "El nombre": "Your name",
    "El nombre de usuario": "Your username",
    "El teléfono": "Your phone number",
    "{field} debe ser texto": "{field} must be text",
    "{field} no puede superar {max} caracteres": (
        "{field} can't be longer than {max} characters"
    ),
    "El nombre de usuario debe tener al menos 4 caracteres": (
        "Your username must be at least 4 characters long"
    ),
    "El nombre de usuario contiene caracteres no permitidos": (
        "Your username contains characters that aren't allowed"
    ),
    "El nombre de usuario o teléfono ya está registrado": (
        "That username or phone number is already registered"
    ),
    "El identificador del usuario no es válido": "That user identifier is not valid",
    "El idioma no es válido": "That language is not valid",
    "Escribe {word} para confirmar": "Type {word} to confirm",
    "Tu cuenta y todos sus datos se eliminaron correctamente": (
        "Your account and all of its data were deleted"
    ),
    "No fue posible eliminar la cuenta": "We couldn't delete your account",
    "No fue posible cancelar tu suscripción. Inténtalo de nuevo en unos minutos.": (
        "We couldn't cancel your subscription. Please try again in a few minutes."
    ),

    # --- Peticiones mal formadas ------------------------------------------
    "No se enviaron datos": "No data was sent",
    "No se enviaron campos editables": "No editable fields were sent",
    "Se enviaron campos no permitidos": "Some fields aren't allowed",
    "Campos no permitidos: {fields}": "Fields not allowed: {fields}",
    "Debes enviar información en formato JSON": "The request body must be JSON",

    # --- Negocios ----------------------------------------------------------
    "Negocio registrado correctamente": "Business created successfully",
    "Negocio actualizado correctamente": "Business updated successfully",
    "Negocio no encontrado": "Business not found",
    "El nombre del negocio es obligatorio": "The business name is required",
    "Ya tienes un negocio con ese nombre": "You already have a business with that name",
    "El identificador del negocio no es válido": (
        "That business identifier is not valid"
    ),
    "No tienes acceso a este negocio": "You don't have access to this business",
    "{field} supera el máximo de {max} caracteres": (
        "{field} is longer than the {max} character limit"
    ),
    "La moneda debe tener un código de 3 letras": (
        "The currency must be a 3-letter code"
    ),
    "La zona horaria es obligatoria": "A time zone is required",
    "No fue posible registrar el negocio": "We couldn't create the business",
    "No fue posible actualizar el negocio": "We couldn't update the business",
    "No fue posible consultar los negocios": "We couldn't load your businesses",
    "Foto no encontrada": "Photo not found",
    "El archivo no contiene una foto válida": "That file isn't a valid photo",
    "La foto debe ser JPG, PNG o WebP": "The photo must be a JPG, PNG or WebP",
    "La foto puede pesar máximo 5 MB": "The photo can be at most 5 MB",

    # --- Menús (catálogos) -------------------------------------------------
    "Catálogo no encontrado": "Menu not found",
    "Catálogo eliminado correctamente": "Menu deleted successfully",
    "Catálogo despublicado correctamente": "Menu unpublished successfully",
    "El nombre del catálogo es obligatorio": "The menu name is required",
    "El nombre del catálogo no es válido": "That menu name is not valid",
    "El nombre del catálogo no puede superar 64 caracteres": (
        "The menu name can't be longer than 64 characters"
    ),
    "Ya existe un catálogo con ese nombre": "A menu with that name already exists",
    "template_id debe ser un entero positivo o null": (
        "template_id must be a positive integer or null"
    ),
    "No fue posible crear el catálogo": "We couldn't create the menu",
    "No fue posible actualizar el catálogo": "We couldn't update the menu",
    "No fue posible eliminar el catálogo": "We couldn't delete the menu",
    "No fue posible consultar el catálogo": "We couldn't load the menu",
    "No fue posible consultar los catálogos": "We couldn't load your menus",

    # --- Categorías --------------------------------------------------------
    "Categoría creada correctamente": "Category created successfully",
    "Categoría actualizada correctamente": "Category updated successfully",
    "Categoría eliminada correctamente": "Category deleted successfully",
    "Categoría no encontrada": "Category not found",
    "El nombre de la categoría es obligatorio": "The category name is required",
    "El nombre de la categoría no es válido": "That category name is not valid",
    "El nombre de la categoría no puede superar 64 caracteres": (
        "The category name can't be longer than 64 characters"
    ),
    "Ya existe una categoría con ese nombre": (
        "A category with that name already exists"
    ),
    "La categoría no pertenece a este catálogo": (
        "That category doesn't belong to this menu"
    ),
    "No fue posible crear la categoría": "We couldn't create the category",
    "No fue posible actualizar la categoría": "We couldn't update the category",
    "No fue posible eliminar la categoría": "We couldn't delete the category",
    "No fue posible consultar la categoría": "We couldn't load the category",
    "No fue posible consultar las categorías": "We couldn't load your categories",

    # --- Promociones ---------------------------------------------------------
    "Promoción creada correctamente": "Promotion created successfully",
    "Promoción actualizada correctamente": "Promotion updated successfully",
    "Promoción eliminada correctamente": "Promotion deleted successfully",
    "Promoción no encontrada": "Promotion not found",
    "El nombre de la promoción es obligatorio": "The promotion name is required",
    "El nombre de la promoción no es válido": "That promotion name is not valid",
    "El nombre no puede superar {limit} caracteres": "The name can't be longer than {limit} characters",
    "La etiqueta no es válida": "That badge label is not valid",
    "La etiqueta no puede superar {limit} caracteres": "The badge label can't be longer than {limit} characters",
    "is_active debe ser verdadero o falso": "is_active must be true or false",
    "Los días de la semana no son válidos": "Those weekdays are not valid",
    "Los días de la semana deben ser números del 0 (lunes) al 6 (domingo)": (
        "Weekdays must be numbers from 0 (Monday) to 6 (Sunday)"
    ),
    "La fecha de inicio": "The start date",
    "La fecha de fin": "The end date",
    "La fecha de inicio no puede ser posterior a la de fin": (
        "The start date can't be after the end date"
    ),
    "Los productos seleccionados no son válidos": "The selected products are not valid",
    "Alguno de los productos seleccionados no existe en este menú": (
        "One of the selected products doesn't exist in this menu"
    ),
    "Las categorías seleccionadas no son válidas": "The selected categories are not valid",
    "Alguna de las categorías seleccionadas no existe en este menú": (
        "One of the selected categories doesn't exist in this menu"
    ),
    "No fue posible crear la promoción": "We couldn't create the promotion",
    "No fue posible actualizar la promoción": "We couldn't update the promotion",
    "No fue posible eliminar la promoción": "We couldn't delete the promotion",
    "No fue posible consultar las promociones": "We couldn't load your promotions",

    # --- Productos ---------------------------------------------------------
    "Producto creado correctamente": "Product created successfully",
    "Producto actualizado correctamente": "Product updated successfully",
    "Producto eliminado correctamente": "Product deleted successfully",
    "Producto no encontrado": "Product not found",
    "El nombre del producto es obligatorio": "The product name is required",
    "El nombre del producto no es válido": "That product name is not valid",
    "El nombre del producto no puede superar 64 caracteres": (
        "The product name can't be longer than 64 characters"
    ),
    "La información del producto no es válida": "That product information is not valid",
    "La descripción no es válida": "That description is not valid",
    "El precio no es válido": "That price is not valid",
    "El precio no puede ser negativo": "The price can't be negative",
    "El precio puede tener máximo dos decimales": (
        "The price can have at most two decimal places"
    ),
    "El precio supera el máximo permitido": "The price is above the allowed maximum",
    "is_available debe ser verdadero o falso": "is_available must be true or false",
    "category_id no es un UUID válido": "category_id is not a valid UUID",
    "Un producto puede tener máximo 5 imágenes": (
        "A product can have at most 5 images"
    ),
    "La selección de imágenes no es válida": "That image selection is not valid",
    "La imagen principal seleccionada no es válida": (
        "The selected main image is not valid"
    ),
    "Cada imagen puede pesar máximo 5 MB": "Each image can be at most 5 MB",
    "Imagen no encontrada": "Image not found",
    "No fue posible crear el producto": "We couldn't create the product",
    "No fue posible actualizar el producto": "We couldn't update the product",
    "No fue posible eliminar el producto": "We couldn't delete the product",
    "No fue posible consultar el producto": "We couldn't load the product",
    "No fue posible consultar los productos": "We couldn't load your products",

    # --- Imágenes ----------------------------------------------------------
    "El archivo no contiene una imagen válida": "That file isn't a valid image",
    "Las imágenes deben ser JPG, PNG o WebP": "Images must be JPG, PNG or WebP",
    "La imagen tiene demasiados píxeles. Redúcela antes de subirla.": (
        "That image has too many pixels. Please resize it before uploading."
    ),
    "No fue posible procesar la imagen": "We couldn't process that image",

    # --- Plantillas --------------------------------------------------------
    "Plantilla actualizada correctamente": "Template updated successfully",
    "La plantilla seleccionada no está permitida": (
        "That template isn't available on your plan"
    ),
    "La tipografía seleccionada no está permitida": (
        "That font isn't available on your plan"
    ),
    "La paleta seleccionada no está permitida": (
        "That color palette isn't available"
    ),
    "Los colores avanzados no son válidos": "Those advanced colors are not valid",
    "La configuración no es válida": "That configuration is not valid",
    "La configuración visual no es válida": "That visual configuration is not valid",
    "Los colores deben usar el formato #RGB o #RRGGBB": (
        "Colors must use the #RGB or #RRGGBB format"
    ),
    "El texto no tiene suficiente contraste con el fondo": (
        "The text doesn't have enough contrast against the background"
    ),
    "El texto del filtro activo no tiene suficiente contraste con su fondo": (
        "The active filter's text doesn't have enough contrast against its background"
    ),
    "La opacidad del fondo debe ser un número": (
        "The background opacity must be a number"
    ),
    "La opacidad del fondo debe estar entre 0 y 1": (
        "The background opacity must be between 0 and 1"
    ),
    "El punto focal de la portada debe ser un número": (
        "The cover's focal point must be a number"
    ),
    "El punto focal de la portada debe estar entre 0 y 1": (
        "The cover's focal point must be between 0 and 1"
    ),
    "El fondo seleccionado no está permitido": "That background isn't available",
    "La pantalla de bienvenida no es válida": "That splash screen is not valid",
    "La duración de la bienvenida debe ser un número": (
        "The splash screen duration must be a number"
    ),
    "La duración de la bienvenida debe estar entre {min} y {max} segundos": (
        "The splash screen duration must be between {min} and {max} seconds"
    ),
    "Campos de tema no permitidos: {fields}": "Theme fields not allowed: {fields}",
    "Campos de bienvenida no permitidos: {fields}": (
        "Splash screen fields not allowed: {fields}"
    ),
    "La portada": "The cover image",
    "El fondo": "The background image",
    "La pantalla de bienvenida": "The splash screen",
    "{field} debe ser JPG, PNG o WebP": "{field} must be a JPG, PNG or WebP",
    "{field} puede pesar máximo 5 MB": "{field} can be at most 5 MB",
    "{field} no contiene una imagen válida": "{field} isn't a valid image",
    "{field} debe ser verdadero o falso": "{field} must be true or false",
    "Portada no encontrada": "Cover image not found",
    "Fondo no encontrado": "Background image not found",
    "Bienvenida no encontrada": "Splash screen not found",
    "No fue posible guardar la plantilla": "We couldn't save the template",
    "No fue posible consultar la plantilla": "We couldn't load the template",

    # --- Publicación -------------------------------------------------------
    "Debes enviar únicamente is_published": "Only is_published can be sent",
    "is_published debe ser verdadero o falso": "is_published must be true or false",
    "Este menú no está disponible": "This menu isn't available",
    "No fue posible generar una URL única": "We couldn't generate a unique URL",
    "No fue posible cargar el menú": "We couldn't load the menu",
    "No fue posible cargar la vista previa": "We couldn't load the preview",
    "No fue posible actualizar la publicación": "We couldn't update the publication",
    "No fue posible consultar la publicación": "We couldn't load the publication",

    # --- Analíticas --------------------------------------------------------
    "No fue posible consultar las analíticas": "We couldn't load your analytics",
    "No fue posible registrar los eventos": "We couldn't record those events",
    "El lote de eventos es demasiado grande": "That batch of events is too large",
    "El lote debe contener entre 1 y {max} eventos": (
        "A batch must contain between 1 and {max} events"
    ),
    "Debes enviar únicamente una lista de eventos": (
        "Only a list of events can be sent"
    ),
    "Cada evento debe contener únicamente los campos permitidos": (
        "Each event may only contain the allowed fields"
    ),
    "El tipo de evento no está permitido": "That event type isn't allowed",
    "El objetivo del evento no es válido": "That event target is not valid",
    "El objetivo no pertenece a este menú": (
        "That target doesn't belong to this menu"
    ),
    "menu_view no acepta un objetivo": "menu_view doesn't accept a target",
    "occurred_at no es válido": "occurred_at is not valid",
    "occurred_at debe incluir zona horaria": "occurred_at must include a time zone",
    "occurred_at está fuera del rango permitido": (
        "occurred_at is outside the allowed range"
    ),
    "visitor_id no es válido": "visitor_id is not valid",
    "session_id no es válido": "session_id is not valid",
    "La fuente o dispositivo no es válido": "That source or device is not valid",
    "La consulta contiene parámetros no permitidos": (
        "The query contains parameters that aren't allowed"
    ),
    "Las fechas no son válidas": "Those dates are not valid",
    "La fecha inicial no puede ser posterior a la final": (
        "The start date can't be after the end date"
    ),
    "El rango máximo es de {days} días": "The maximum range is {days} days",
    "La zona horaria no es válida": "That time zone is not valid",
    # Etiquetas que la app dibuja en los informes de analíticas.
    "Sin categoría": "Uncategorized",
    "Código QR": "QR code",
    "Enlace copiado": "Copied link",
    "Sitio de referencia": "Referring site",
    "Producto eliminado": "Deleted product",
    "Categoría eliminada": "Deleted category",

    # --- Planes y facturación ---------------------------------------------
    "Plan gratuito": "Free plan",
    "Plan Esencial": "Essential plan",
    "Plan Pro": "Pro plan",
    "Tu plan actual permite {limit} negocio.": (
        "Your current plan allows {limit} business."
    ),
    "Tu plan actual permite hasta {limit} negocios.": (
        "Your current plan allows up to {limit} businesses."
    ),
    "Tu plan actual permite {limit} menú por negocio.": (
        "Your current plan allows {limit} menu per business."
    ),
    "Tu plan actual permite hasta {limit} menús por negocio.": (
        "Your current plan allows up to {limit} menus per business."
    ),
    "Tu plan actual permite hasta {limit} productos por menú.": (
        "Your current plan allows up to {limit} products per menu."
    ),
    "Tu plan actual no incluye analíticas.": (
        "Your current plan doesn't include analytics."
    ),
    "Tu plan actual no incluye portada en el menú.": (
        "Your current plan doesn't include a menu cover image."
    ),
    "Tu plan actual no incluye imagen de fondo en el menú.": (
        "Your current plan doesn't include a menu background image."
    ),
    "Tu plan actual no incluye la personalización del fondo.": (
        "Your current plan doesn't include background customization."
    ),
    "Tu plan actual no incluye la pantalla de bienvenida del menú.": (
        "Your current plan doesn't include the menu splash screen."
    ),
    "Tu plan actual sólo incluye la plantilla básica.": (
        "Your current plan only includes the basic template."
    ),
    "Tu plan actual sólo incluye la tipografía básica.": (
        "Your current plan only includes the basic font."
    ),
    "Stripe no está configurado": "Stripe isn't configured",
    "RevenueCat no está configurado": "RevenueCat isn't configured",
    "Tu suscripción se contrató en la tienda de tu teléfono y sigue activa. Cancélala desde los ajustes de suscripciones de tu dispositivo para que dejen de cobrarte.": (
        "Your subscription was purchased through your phone's store and is still active. "
        "Cancel it from your device's subscription settings so you stop being charged."
    ),
    "Aún no existe una cuenta de facturación": "There's no billing account yet",
    "No se encontró el precio activo del Plan Esencial": (
        "We couldn't find an active price for the Essential plan"
    ),
    "El precio del Plan Esencial no es mensual": (
        "The Essential plan price isn't monthly"
    ),
    "Ya existe una suscripción. Adminístrala desde el portal.": (
        "You already have a subscription. Manage it from the billing portal."
    ),
    "No fue posible iniciar la contratación": "We couldn't start the checkout",
    "No fue posible preparar la suscripción": "We couldn't set up the subscription",
    "No fue posible abrir el portal de facturación": (
        "We couldn't open the billing portal"
    ),
    "No fue posible procesar el webhook": "We couldn't process the webhook",
}

CATALOGS = {"en": _EN}
