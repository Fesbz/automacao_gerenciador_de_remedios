import React, {useCallback, useState} from 'react';

import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  Button,
  Card,
  Chip,
  Text,
} from 'react-native-paper';

import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import {
  Compartment,
  getCompartments,
} from '../services/api/medicineApi';

import {api} from '../services/api/api';

import {Medicine} from '../types/Medicine';

import {colors} from '../styles/colors';

function MedicinesScreen() {
  const navigation = useNavigation();

  const [
    compartments,
    setCompartments,
  ] = useState<Compartment[]>([]);

  const [loading, setLoading] =
    useState(false);

  const loadCompartments = async () => {
    try {
      setLoading(true);

      const data =
        await getCompartments();

      setCompartments(data);
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Erro',
        'Não foi possível carregar os compartimentos.',
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCompartments();
    }, []),
  );

  const handleEdit = (
    compartment: Compartment,
  ) => {
    if (!compartment.medicineId) {
      return;
    }

    const medicine: Medicine = {
      id: compartment.medicineId,
      name: compartment.name ?? '',
      dose: compartment.dose ?? '',
      time: compartment.time ?? '',
      compartmentId: compartment.id,
    };

    navigation.navigate(
      'Adicionar' as never,
      {medicine} as never,
    );
  };

  const handleDelete = (
    compartment: Compartment,
  ) => {
    if (!compartment.medicineId) {
      return;
    }

    Alert.alert(
      'Excluir medicamento',
      `Deseja excluir ${compartment.name}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(
                `/medicamentos/${compartment.medicineId}`,
              );

              await loadCompartments();

              Alert.alert(
                'Excluído',
                'O medicamento foi excluído e o compartimento ficou livre.',
              );
            } catch (error) {
              console.error(error);

              Alert.alert(
                'Erro',
                'Não foi possível excluir o medicamento.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>
          Medicamentos
        </Text>

        <Text style={styles.subtitle}>
          Gerencie os medicamentos armazenados nos 7 compartimentos.
        </Text>

        {loading ? (
          <Text style={styles.loading}>
            Carregando...
          </Text>
        ) : (
          <View style={styles.grid}>
            {compartments.map(compartment => {
              const occupied =
                compartment.medicineId !== null;

              return (
                <Card
                  key={compartment.id}
                  style={[
                    styles.card,
                    occupied
                      ? styles.occupiedCard
                      : styles.freeCard,
                  ]}>

                  <Card.Content>

                    <View style={styles.cardHeader}>
                      <View
                        style={styles.numberContainer}>
                        <Text style={styles.number}>
                          {compartment.id}
                        </Text>
                      </View>

                      <Chip
                        compact
                        style={
                          occupied
                            ? styles.occupiedChip
                            : styles.freeChip
                        }>
                        {occupied
                          ? 'Ocupado'
                          : 'Livre'}
                      </Chip>
                    </View>

                    {occupied ? (
                      <>
                        <Text style={styles.name}>
                          {compartment.name}
                        </Text>

                        <Text style={styles.detail}>
                          {compartment.dose}
                        </Text>

                        <Text style={styles.detail}>
                          {compartment.time}
                        </Text>

                        <View style={styles.actions}>
                          <Button
                            mode="outlined"
                            icon="pencil-outline"
                            onPress={() =>
                              handleEdit(compartment)
                            }
                            style={styles.editButton}>
                            Editar
                          </Button>

                          <Button
                            mode="text"
                            icon="delete-outline"
                            textColor={colors.error}
                            onPress={() =>
                              handleDelete(compartment)
                            }>
                            Excluir
                          </Button>
                        </View>
                      </>
                    ) : (
                      <View style={styles.freeContent}>
                        <Text style={styles.freeTitle}>
                          Compartimento livre
                        </Text>

                        <Text style={styles.freeText}>
                          Disponível para cadastro.
                        </Text>
                      </View>
                    )}

                  </Card.Content>
                </Card>
              );
            })}
          </View>
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
    padding: 20,
    paddingBottom: 36,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 22,
  },

  loading: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 30,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  card: {
    width: '48%',
    minHeight: 180,
    borderRadius: 18,
  },

  occupiedCard: {
    backgroundColor: colors.surface,
  },

  freeCard: {
    backgroundColor: '#EEF3F7',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  numberContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E4F0F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  number: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  occupiedChip: {
    backgroundColor: '#E4F0F9',
  },

  freeChip: {
    backgroundColor: '#E2E7EB',
  },

  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 7,
  },

  detail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 3,
  },

  actions: {
    marginTop: 14,
  },

  editButton: {
    borderRadius: 10,
  },

  freeContent: {
    marginTop: 5,
  },

  freeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  freeText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default MedicinesScreen;