import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type CardProps = {
  children: React.ReactNode;
};

function Card({children}: CardProps) {
  return (
    <View style={styles.card}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,

    shadowColor: '#0F2747',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 3,
  },
});

export default Card;