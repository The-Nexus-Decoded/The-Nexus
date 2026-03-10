import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { typography } from './styles';

interface PositionCoordsProps {
  x: number;
  y: number;
  z: number;
}

export const PositionCoords: React.FC<PositionCoordsProps> = ({ x, y, z }) => {
  const formatCoord = (val: number) => val.toFixed(3);
  
  return (
    <Text style={styles.coords}>
      X:{formatCoord(x)} Y:{formatCoord(y)} Z:{formatCoord(z)}
    </Text>
  );
};

const styles = StyleSheet.create({
  coords: {
    ...typography.positionCoords,
  },
});
