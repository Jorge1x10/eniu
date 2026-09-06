import { useId, useMemo } from 'react';
import { Defs, LinearGradient, Path, Circle, Stop, Svg } from 'react-native-svg';

const VIEWBOX_WIDTH = 320;

/**
 * Gráfica de área suave para series de vistas por día. Sustituye a las barras
 * planas: la misma serie con relieve y un punto final marcado da más
 * sensación de tendencia que columnas grises del mismo alto.
 */
export function AreaChart({ series, height = 74, color = '#FFE05A', dotStroke = '#141210' }: { series: number[]; height?: number; color?: string; dotStroke?: string }) {
  const gradientId = `area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { areaPath, linePath, last } = useMemo(() => {
    const values = series.length ? series : [0, 0];
    const max = Math.max(1, ...values);
    const step = VIEWBOX_WIDTH / Math.max(1, values.length - 1);
    const points = values.map((value, index) => [index * step, height - (value / max) * (height - 6) - 3]);
    const line = points.map((point, index) => `${index ? 'L' : 'M'}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(' ');
    const area = `${line} L${VIEWBOX_WIDTH} ${height} L0 ${height} Z`;
    return { areaPath: area, linePath: line, last: points[points.length - 1] };
  }, [series, height]);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.45} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#${gradientId})`} />
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={4.5} fill={color} stroke={dotStroke} strokeWidth={2.5} />
    </Svg>
  );
}
