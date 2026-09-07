import { resolveAssetUrl } from "../templates/menuData";

export default function MenuBackground({ theme }) {
  // `background_preset` ya viene resuelto (css/size), no sólo la clave: el
  // menú público lo trae así de fábrica (`serialize_public_menu`), y el
  // editor lo arma igual al vuelo (ver `previewThemeBase` en
  // `TemplatesPage.jsx`) para que ambos casos compartan este mismo camino.
  if (theme.background_preset) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: theme.background_preset.css,
          backgroundSize: theme.background_preset.size,
          opacity: theme.background_opacity,
        }}
      />
    );
  }
  if (!theme.background_image_url) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url(${resolveAssetUrl(theme.background_image_url)})`,
        opacity: theme.background_opacity,
      }}
    />
  );
}
