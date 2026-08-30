import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {colors} from '../styles/colors';
import {spacing} from '../styles/spacing';

function Header() {
  return (
    <View style={styles.container}>
      <View>

        <Text style={styles.title}>
          Seus medicamentos
        </Text>
      </View>

      <View style={styles.profile}>
        <Text style={styles.profileText}>
          M
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  greeting: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  title: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.text,
  },

  profile: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default Header;