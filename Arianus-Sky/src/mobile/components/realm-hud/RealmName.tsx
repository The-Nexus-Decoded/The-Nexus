import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { typography } from './styles';

interface RealmNameProps {
  children: string;
}

export const RealmName: React.FC<RealmNameProps> = ({ children }) => {
  return <Text style={styles.realmName}>{children}</Text>;
};

const styles = StyleSheet.create({
  realmName: {
    ...typography.realmName,
  },
});
