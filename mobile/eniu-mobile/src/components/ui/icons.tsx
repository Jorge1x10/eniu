import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function ChevronRightIcon({ color, size = 14 }: IconProps) {
  return <Svg width={size} height={size * 1.14} viewBox="0 0 8 14" fill="none"><Path d="M1 1l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function ChevronLeftIcon({ color, size = 14 }: IconProps) {
  return <Svg width={size} height={size * 1.14} viewBox="0 0 8 14" fill="none"><Path d="M7 1L1 7l6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function ChevronDownIcon({ color, size = 12 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m6 9 6 6 6-6" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Tendencia al alza — junto al porcentaje de cambio vs. el día anterior */
export function TrendUpIcon({ color, size = 10 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 19V6m0 0-6 6m6-6 6 6" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Tendencia a la baja */
export function TrendDownIcon({ color, size = 10 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 5v13m0 0-6-6m6 6 6-6" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function PlusIcon({ color, size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" /></Svg>;
}

export function MinusIcon({ color, size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" /></Svg>;
}

/** Editar en el lugar — lápiz pequeño en filas con edición en sitio */
export function PencilIcon({ color, size = 14 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" stroke={color} strokeWidth={2} strokeLinejoin="round" /></Svg>;
}

export function CheckIcon({ color, size = 14 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m5 13 4 4L19 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function EyeIcon({ color, size = 17 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2.2} /></Svg>;
}

export function ShareIcon({ color, size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx={18} cy={5} r={2.6} stroke={color} strokeWidth={2} /><Circle cx={6} cy={12} r={2.6} stroke={color} strokeWidth={2} /><Circle cx={18} cy={19} r={2.6} stroke={color} strokeWidth={2} /><Path d="M8.3 10.7 15.7 6.6M8.3 13.3l7.4 4.1" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
}

export function DownloadIcon({ color, size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 4v11m0 0-4-4m4 4 4-4" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke={color} strokeWidth={2.2} strokeLinecap="round" /></Svg>;
}

export function QrIcon({ color, size = 14 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x={9} y={9} width={11} height={11} rx={2} stroke={color} strokeWidth={2} /><Path d="M5 15V6a1 1 0 0 1 1-1h9" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
}

/** Productos — etiqueta de precio */
export function TagIcon({ color, size = 19 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M3 12.5V4a1 1 0 0 1 1-1h8.5a1 1 0 0 1 .7.3l7.5 7.5a1 1 0 0 1 0 1.4l-8.5 8.5a1 1 0 0 1-1.4 0L3.3 13.2a1 1 0 0 1-.3-.7Z" stroke={color} strokeWidth={2} strokeLinejoin="round" /><Circle cx={8} cy={8} r={1.7} fill={color} /></Svg>;
}

/** Categorías — cuadrícula de secciones */
export function GridIcon({ color, size = 19 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x={3} y={3} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={2} /><Rect x={13.5} y={3} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={2} /><Rect x={3} y={13.5} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={2} /><Rect x={13.5} y={13.5} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={2} /></Svg>;
}

/** Diseño y plantilla — paleta de color */
export function PaletteIcon({ color, size = 19 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7Z" stroke={color} strokeWidth={2} strokeLinejoin="round" /><Circle cx={7.5} cy={11.5} r={1.4} fill={color} /><Circle cx={11} cy={7.5} r={1.4} fill={color} /><Circle cx={15.5} cy={9.5} r={1.4} fill={color} /></Svg>;
}

/** Publicar y compartir — enlace */
export function LinkIcon({ color, size = 19 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Marcador de foto vacía / botón para subir imagen */
export function ImageIcon({ color, size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x={3} y={4.5} width={18} height={15} rx={3} stroke={color} strokeWidth={2} /><Circle cx={8.5} cy={10} r={1.8} fill={color} /><Path d="m4 17.5 4.6-4.2a1.6 1.6 0 0 1 2.2 0l3 2.8m0 0 1.7-1.6a1.6 1.6 0 0 1 2.2 0L20 16.2m-5.5-.1.6.6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Imagen principal */
export function StarIcon({ color, size = 15, filled = false }: IconProps & { filled?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m12 3.5 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9L12 3.5Z" stroke={color} strokeWidth={2} strokeLinejoin="round" fill={filled ? color : 'none'} /></Svg>;
}

/** Quitar imagen */
export function TrashIcon({ color, size = 15 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 6.5h16M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" stroke={color} strokeWidth={2} strokeLinecap="round" /><Path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Cerrar */
export function CloseIcon({ color, size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" /></Svg>;
}

export function LockIcon({ color, size = 14 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x={4} y={10.5} width={16} height={10} rx={2.5} stroke={color} strokeWidth={2} /><Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
}

/** Correo — campo de correo o usuario en el acceso */
export function MailIcon({ color, size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x={3} y={5} width={18} height={14} rx={2.5} stroke={color} strokeWidth={2} /><Path d="m4 7 8 6 8-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Privacidad — escudo con palomita */
export function ShieldCheckIcon({ color, size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6l-7-3Z" stroke={color} strokeWidth={2} strokeLinejoin="round" /><Path d="m9 12 2.2 2.2L15.5 10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Avanzar — flecha al final de un CTA */
export function ArrowRightIcon({ color, size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M5 12h14m0 0-6-6m6 6-6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

// --- Barra de pestañas y listas (24×24, trazo de 2) ---------------------------

type LineIconProps = IconProps & { strokeWidth?: number };

function LineIcon({ color, size = 22, strokeWidth = 2, children }: LineIconProps & { children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function HomeIcon(props: LineIconProps) {
  return <LineIcon {...props}><Path d="M3 10.5 12 3l9 7.5" /><Path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></LineIcon>;
}

export function ReceiptIcon(props: LineIconProps) {
  return <LineIcon {...props}><Path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" /><Path d="M9 8h6M9 12h6M9 16h3" /></LineIcon>;
}

export function BookIcon(props: LineIconProps) {
  return <LineIcon {...props}><Path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z" /><Path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3" /><Path d="M8 7h8M8 11h6" /></LineIcon>;
}

export function BarsIcon(props: LineIconProps) {
  return <LineIcon {...props}><Path d="M4 20h16" /><Path d="M7 16v-5M12 16V6M17 16v-8" /></LineIcon>;
}

export function GearIcon(props: LineIconProps) {
  return (
    <LineIcon {...props}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </LineIcon>
  );
}

export function StoreIcon(props: LineIconProps) {
  return <LineIcon {...props}><Path d="M3 9 4.5 4h15L21 9" /><Path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><Path d="M5 11v9h14v-9" /><Path d="M10 20v-5h4v5" /></LineIcon>;
}

export function PhoneIcon(props: LineIconProps) {
  return <LineIcon {...props}><Rect x={7} y={2.5} width={10} height={19} rx={2.5} /><Path d="M11 18h2" /></LineIcon>;
}

export function UserIcon(props: LineIconProps) {
  return <LineIcon {...props}><Circle cx={12} cy={8} r={4} /><Path d="M4 21a8 8 0 0 1 16 0" /></LineIcon>;
}

export function GlobeIcon(props: LineIconProps) {
  return <LineIcon {...props}><Circle cx={12} cy={12} r={9} /><Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></LineIcon>;
}

export function MoonIcon(props: LineIconProps) {
  return <LineIcon {...props}><Path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" /></LineIcon>;
}

export function BellIcon(props: LineIconProps) {
  return <LineIcon {...props}><Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><Path d="M10 20a2 2 0 0 0 4 0" /></LineIcon>;
}

export function HelpIcon(props: LineIconProps) {
  return <LineIcon {...props}><Circle cx={12} cy={12} r={9} /><Path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7" /><Path d="M12 17h.01" /></LineIcon>;
}

export function ClockIcon(props: LineIconProps) {
  return <LineIcon {...props}><Circle cx={12} cy={12} r={9} /><Path d="M12 7v5l3 2" /></LineIcon>;
}

export function CopyIcon(props: LineIconProps) {
  return <LineIcon {...props}><Rect x={8} y={8} width={12} height={12} rx={2.5} /><Path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></LineIcon>;
}

export function PrinterIcon(props: LineIconProps) {
  return <LineIcon {...props}><Path d="M7 9V3h10v6" /><Rect x={3} y={9} width={18} height={8} rx={2} /><Path d="M7 14h10v7H7z" /></LineIcon>;
}

export function ExternalIcon(props: LineIconProps) {
  return <LineIcon {...props}><Path d="M14 4h6v6M20 4l-9 9" /><Path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></LineIcon>;
}
