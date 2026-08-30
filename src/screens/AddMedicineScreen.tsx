import React, {useCallback, useEffect, useState} from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  Button,
  HelperText,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';

import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import {
  addMedicine,
  editMedicine,
} from '../services/medicineStorage';

import {
  Compartment,
  getCompartments,
} from '../services/api/medicineApi';

import {Medicine} from '../types/Medicine';
import {colors} from '../styles/colors';

type RouteParams = {
  medicine?: Medicine;
};

function AddMedicineScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const medicine =
    (route.params as RouteParams | undefined)?.medicine;

  const isEditing = medicine !== undefined;

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState('');

  const [compartmentId, setCompartmentId] =
    useState<number | null>(null);

  const [compartments, setCompartments] =
    useState<Compartment[]>([]);

  const [error, setError] = useState('');

  const loadCompartments = async () => {
    try {
      const data = await getCompartments();
      setCompartments(data);
    } catch (loadError) {
      console.error(loadError);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCompartments();
    }, []),
  );

  useEffect(() => {
    setName(medicine?.name ?? '');
    setDose(medicine?.dose ?? '');
    setTime(medicine?.time ?? '');
    setCompartmentId(
      medicine?.compartmentId ?? null,
    );
    setError('');
  }, [medicine]);

  const handleSave = async () => {
    if (
      !name.trim() ||
      !dose.trim() ||
      !time.trim() ||
      compartmentId === null
    ) {
      setError(
        'Preencha todos os campos e selecione um compartimento.',
      );
      return;
    }

    try {
      setError('');

      const data = {
        name: name.trim(),
        dose: dose.trim(),
        time: time.trim(),
        compartmentId,
      };

      if (medicine) {
        await editMedicine(
          medicine.id,
          data,
        );
      } else {
        await addMedicine(data);
      }

      navigation.navigate(
        'Medicamentos' as never,
      );
    } catch (saveError) {
      console.error(saveError);

      setError(
        isEditing
          ? 'Não foi possível atualizar o medicamento.'
          : 'Não foi possível cadastrar o medicamento.',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>
          {isEditing
            ? 'Editar medicamento'
            : 'Adicionar medicamento'}
        </Text>

        <Text style={styles.subtitle}>
          {isEditing
            ? 'Atualize os dados do medicamento.'
            : 'Cadastre um medicamento na sua caixa.'}
        </Text>

        <Surface
          elevation={1}
          style={styles.form}>

          <TextInput
            mode="outlined"
            label="Nome do medicamento"
            placeholder="Ex.: Losartana"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label="Dose"
            placeholder="Ex.: 50 mg"
            value={dose}
            onChangeText={setDose}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label="Horário"
            placeholder="Ex.: 08:00"
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />

          <Text style={styles.compartmentTitle}>
            Compartimento
          </Text>

          <Text style={styles.compartmentSubtitle}>
            Os compartimentos ocupados não podem ser selecionados.
          </Text>

          <View style={styles.compartmentGrid}>
            {compartments.map(compartment => {
              const isCurrent =
                medicine?.compartmentId ===
                compartment.id;

              const occupied =
                compartment.medicineId !== null &&
                !isCurrent;

              const selected =
                compartmentId === compartment.id;

              return (
                <Button
                  key={compartment.id}
                  mode={
                    selected
                      ? 'contained'
                      : 'outlined'
                  }
                  disabled={occupied}
                  onPress={() => {
                    setCompartmentId(
                      compartment.id,
                    );
                    setError('');
                  }}
                  style={styles.compartmentButton}
                  contentStyle={
                    styles.compartmentButtonContent
                  }>
                  {compartment.id}
                </Button>
              );
            })}
          </View>

          <HelperText
            type="error"
            visible={Boolean(error)}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            contentStyle={styles.saveContent}>
            {isEditing
              ? 'Salvar alterações'
              : 'Cadastrar medicamento'}
          </Button>

          {isEditing && (
            <Button
              mode="text"
              onPress={() =>
                navigation.navigate(
                  'Medicamentos' as never,
                )
              }>
              Cancelar
            </Button>
          )}

        </Surface>

      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 30,
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
    marginBottom: 22,
  },

  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },

  input: {
    marginBottom: 16,
    backgroundColor: colors.surface,
  },

  compartmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },

  compartmentSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 19,
  },

  compartmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  compartmentButton: {
    width: 56,
    borderRadius: 12,
  },

  compartmentButtonContent: {
    height: 46,
  },

  saveButton: {
    borderRadius: 12,
    marginTop: 8,
  },

  saveContent: {
    height: 50,
  },
});

export default AddMedicineScreen;