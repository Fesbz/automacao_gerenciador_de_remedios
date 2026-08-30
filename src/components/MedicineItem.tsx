import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

type MedicineItemProps = {
  name: string;
  dose: string;
  time: string;
};

function MedicineItem({
  name,
  dose,
  time,
}: MedicineItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>💊</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>
          {name}
        </Text>

        <Text style={styles.dose}>
          Dose: {dose}
        </Text>

        <Text style={styles.time}>
          Horário: {time}
        </Text>
      </View>

      <View style={styles.timeBadge}>
        <Text style={styles.timeBadgeText}>
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },

  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  iconText: {
    fontSize: 22,
  },

  info: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2747',
    marginBottom: 4,
  },

  dose: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },

  time: {
    fontSize: 13,
    color: '#64748B',
  },

  timeBadge: {
    backgroundColor: '#E8F2FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  timeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1976D2',
  },
});

export default MedicineItem;