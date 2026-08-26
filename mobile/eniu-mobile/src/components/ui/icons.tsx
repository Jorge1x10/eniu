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
