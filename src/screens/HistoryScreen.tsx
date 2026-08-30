import React, {useCallback, useState} from 'react';

import {
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

import {api} from '../services/api/api';
import {colors} from '../styles/colors';

type DoseStatus =
  | 'scheduled'
  | 'taken'
  | 'missed';

type Dose = {
  id: string;
  medicineId: string;
  medicineName: string;
  dose: string;
  compartmentId: number;
  scheduledTime: string;
  status: DoseStatus;
  takenAt: string | null;
  createdAt: string;
};

function HistoryScreen() {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDoses = async () => {
    try {
      setLoading(true);

      const data = await api.get<Dose[]>('/doses');

      setDoses(data);
    } catch (error) {
      console.error(
        'Erro ao carregar histórico:',
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDoses();
    }, []),
  );

  const getStatusText = (
    status: DoseStatus,
  ) => {
    switch (status) {
      case 'taken':
        return 'Tomada';

      case 'missed':
        return 'Não tomada';

      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (
    status: DoseStatus,
  ) => {
    switch (status) {
      case 'taken':
        return colors.success;

      case 'missed':
        return colors.error;

      default:
        return colors.warning;
    }
  };

  const getDateText = (
    createdAt: string,
  ) => {
    const date = new Date(createdAt);

    return date.toLocaleDateString(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    );
  };

  const orderedDoses = [...doses].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>
            Histórico
          </Text>

          <Text style={styles.subtitle}>
            Acompanhe as doses registradas.
          </Text>
        </View>

        {loading ? (
          <Text style={styles.message}>
            Carregando...
          </Text>
        ) : orderedDoses.length === 0 ? (
          <Surface
            elevation={0}
            style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Nenhum registro
            </Text>

            <Text style={styles.emptyText}>
              As doses aparecerão aqui conforme forem programadas.
            </Text>
          </Surface>
        ) : (
          <Surface
            elevation={0}
            style={styles.list}>

            {orderedDoses.map(
              (dose, index) => (
                <View key={dose.id}>

                  <View style={styles.row}>

                    <View style={styles.dateColumn}>
                      <Text style={styles.date}>
                        {getDateText(
                          dose.createdAt,
                        )}
                      </Text>

                      <Text style={styles.time}>
                        {dose.scheduledTime}
                      </Text>
                    </View>

                    <View style={styles.info}>
                      <Text style={styles.medicineName}>
                        {dose.medicineName}
                      </Text>

                      <Text style={styles.details}>
                        {dose.dose}
                      </Text>

                      <Text style={styles.details}>
                        Compartimento {dose.compartmentId}
                      </Text>
                    </View>

                    <View style={styles.status}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              getStatusColor(
                                dose.status,
                              ),
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              getStatusColor(
                                dose.status,
                              ),
                          },
                        ]}>
                        {getStatusText(
                          dose.status,
                        )}
                      </Text>
                    </View>

                  </View>

                  {index <
                    orderedDoses.length - 1 && (
                    <Divider />
                  )}

                </View>
              ),
            )}

          </Surface>
        )}

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
    paddingTop: 24,
    paddingBottom: 32,
  },

  header: {
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },

  list: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 18,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },

  dateColumn: {
    width: 68,
  },

  date: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  time: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.secondaryDark,
    marginTop: 5,
  },

  info: {
    flex: 1,
    paddingHorizontal: 10,
  },

  medicineName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  details: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },

  status: {
    alignItems: 'flex-end',
    minWidth: 68,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 5,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },

  empty: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },

  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 5,
    lineHeight: 19,
  },

  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 30,
  },
});

export default HistoryScreen;