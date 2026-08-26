import { View } from 'react-native';

const bars = [
  { width: '100%', color: '#E9DDB7' },
  { width: '72%', color: '#E9DDB7' },
  { width: '88%', color: '#D9D9D9' },
  { width: '64%', color: '#D9D9D9' },
  { width: '78%', color: '#D9D9D9' },
];

export function MenuSkeleton({ width = 86, padding = 9 }: { width?: number; padding?: number }) {
  return (
    <View style={{ width, borderRadius: 13, borderCurve: 'continuous', backgroundColor: '#FFFDF5', padding, gap: 6, flexShrink: 0 }}>
      <View style={{ height: 7, width: '46%', borderRadius: 99, backgroundColor: '#FFE05A' }} />
      {bars.map((bar, index) => <View key={index} style={{ height: 4, width: bar.width as `${number}%`, borderRadius: 99, backgroundColor: bar.color }} />)}
    </View>
  );
}
