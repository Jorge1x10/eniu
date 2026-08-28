import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function ChevronRightIcon({ color, size = 14 }: IconProps) {
  return <Svg width={size} height={size * 1.14} viewBox="0 0 8 14" fill="none"><Path d="M1 1l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function ChevronDownIcon({ color, size = 12 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m6 9 6 6 6-6" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function PlusIcon({ color, size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" /></Svg>;
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
