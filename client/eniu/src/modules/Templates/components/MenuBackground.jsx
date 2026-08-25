import { resolveAssetUrl } from "../templates/menuData";

export default function MenuBackground({ theme }) {
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
