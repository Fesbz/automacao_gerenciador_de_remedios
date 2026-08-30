import React, {useCallback, useMemo, useState} from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  Divider,
  Surface,
  Text,
} from 'react-native-paper';

import {useFocusEffect} from '@react-navigation/native';

import {getMedicines} from '../services/medicineStorage';
import {Medicine} from '../types/Medicine';
import {colors} from '../styles/colors';

function HomeScreen() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const loadMedicines = async () => {
    try {
      const data = await getMedicines();
      setMedicines(data);
    } catch (error) {
      console.error('Erro ao carregar medicamentos:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMedicines();
    }, []),
  );

  const orderedMedicines = useMemo(() => {
    return [...medicines].sort((a, b) =>
      a.time.localeCompare(b.time),
    );
  }, [medicines]);

  const nextMedicine = useMemo(() => {
    if (orderedMedicines.length === 0) {
      return null;
    }

    const now = new Date();

    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    const upcoming = orderedMedicines.find(medicine => {
      const [hour, minute] = medicine.time
        .split(':')
        .map(Number);

      const medicineMinutes = hour * 60 + minute;

      return medicineMinutes >= currentMinutes;
    });

    return upcoming ?? orderedMedicines[0];
  }, [orderedMedicines]);

  const occupied = medicines.length;
  const available = Math.max(0, 7 - occupied);

  const today = new Date().toLocaleDateString(
    'pt-BR',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    },
  );

  const formattedToday =
    today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>

        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>
              MEDLOOP
            </Text>

            <Text style={styles.date}>
              {formattedToday}
            </Text>
          </View>

          <Image
            source={require('../assets/medloop-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* SAUDAÇÃO */}
        <View style={styles.intro}>
          <Text style={styles.greeting}>
            Olá!
          </Text>

          <Text style={styles.introText}>
            Aqui está o seu dia.
          </Text>
        </View>

        {/* PRÓXIMA DOSE */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            PRÓXIMA DOSE
          </Text>

          {nextMedicine ? (
            <Surface
              elevation={0}
              style={styles.nextDose}>

              <View style={styles.nextDoseMain}>
                <Text style={styles.nextMedicine}>
                  {nextMedicine.name}
                </Text>

                <Text style={styles.nextDetails}>
                  {nextMedicine.dose}
                </Text>

                <Text style={styles.nextCompartment}>
                  Compartimento {nextMedicine.compartmentId}
                </Text>
              </View>

              <View style={styles.nextTimeBlock}>
                <Text style={styles.nextTime}>
                  {nextMedicine.time}
                </Text>

                <Text style={styles.nextTimeLabel}>
                  horário
                </Text>
              </View>

            </Surface>
          ) : (
            <Surface
              elevation={0}
              style={styles.emptyState}>

              <Text style={styles.emptyTitle}>
                Nenhum medicamento cadastrado
              </Text>

              <Text style={styles.emptyText}>
                Use a aba Adicionar para começar.
              </Text>

            </Surface>
          )}
        </View>

        {/* STATUS DA CAIXA */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            CAIXA
          </Text>

          <Surface
            elevation={0}
            style={styles.boxStatus}>

            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>
                {occupied}
              </Text>

              <Text style={styles.statusLabel}>
                ocupados
              </Text>
            </View>

            <View style={styles.verticalLine} />

            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>
                {available}
              </Text>

              <Text style={styles.statusLabel}>
                livres
              </Text>
            </View>

            <View style={styles.verticalLine} />

            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>
                7
              </Text>

              <Text style={styles.statusLabel}>
                compartimentos
              </Text>
            </View>

          </Surface>
        </View>

        {/* HORÁRIOS */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            HORÁRIOS DE HOJE
          </Text>

          <Surface
            elevation={0}
            style={styles.schedule}>

            {orderedMedicines.length === 0 ? (
              <Text style={styles.emptySchedule}>
                Nenhum horário cadastrado.
              </Text>
            ) : (
              orderedMedicines.map((medicine, index) => (
                <View key={medicine.id}>

                  <View style={styles.scheduleRow}>
                    <Text style={styles.scheduleTime}>
                      {medicine.time}
                    </Text>

                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleName}>
                        {medicine.name}
                      </Text>

                      <Text style={styles.scheduleDetails}>
                        {medicine.dose}
                        {'  ·  '}
                        Compartimento {medicine.compartmentId}
                      </Text>
                    </View>
                  </View>

                  {index < orderedMedicines.length - 1 && (
                    <Divider />
                  )}

                </View>
              ))
            )}

          </Surface>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 36,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerLeft: {
    flex: 1,
  },

  brand: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.primaryDark,
  },

  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },

  logo: {
    width: 88,
    height: 48,
    marginLeft: 16,
  },

  intro: {
    paddingTop: 28,
    paddingBottom: 30,
  },

  greeting: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.text,
  },

  introText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },

  section: {
    marginBottom: 28,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.textSecondary,
    marginBottom: 12,
  },

  nextDose: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  nextDoseMain: {
    flex: 1,
    paddingRight: 16,
  },

  nextMedicine: {
    fontSize: 23,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  nextDetails: {
    fontSize: 14,
    color: '#DCEBFA',
    marginTop: 5,
  },

  nextCompartment: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8EC5F2',
    marginTop: 16,
  },

  nextTimeBlock: {
    alignItems: 'flex-end',
  },

  nextTime: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFB04A',
  },

  nextTimeLabel: {
    fontSize: 11,
    color: '#DCEBFA',
    marginTop: 2,
  },

  emptyState: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 20,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 5,
  },

  boxStatus: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  statusNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  statusLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  verticalLine: {
    width: 1,
    height: 38,
    backgroundColor: colors.border,
  },

  schedule: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 18,
  },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 17,
  },

  scheduleTime: {
    width: 64,
    fontSize: 15,
    fontWeight: '800',
    color: colors.secondaryDark,
  },

  scheduleInfo: {
    flex: 1,
  },

  scheduleName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  scheduleDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  emptySchedule: {
    paddingVertical: 20,
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default HomeScreen;