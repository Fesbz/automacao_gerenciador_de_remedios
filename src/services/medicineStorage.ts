import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createMedicine,
  deleteMedicine,
  getMedicineById,
  getMedicines as getMedicinesFromApi,
  updateMedicine,
  patchMedicine,
} from './api/medicineApi';

import {api} from './api/api';
import {ApiRequestError} from './api/api';
import {Medicine} from '../types/Medicine';

const MEDICINES_KEY = '@MedicamentosApp:medicines';

type Dose = {
  id: string;
  medicine_id: string;
  medicine_name: string;
  dose: string;
  compartment_id: number;
  scheduled_time: string;
  status: 'scheduled' | 'taken' | 'missed';
  taken_at: string | null;
  created_at: string;
};

/* =========================================================
   STORAGE LOCAL
   ========================================================= */

async function getLocalMedicines(): Promise<Medicine[]> {
  try {
    const storedMedicines =
      await AsyncStorage.getItem(MEDICINES_KEY);

    if (!storedMedicines) {
      return [];
    }

    const parsed = JSON.parse(storedMedicines);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Medicine[];
  } catch (error) {
    console.error(
      'Erro ao ler medicamentos locais:',
      error,
    );

    return [];
  }
}

async function saveLocalMedicines(
  medicines: Medicine[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      MEDICINES_KEY,
      JSON.stringify(medicines),
    );
  } catch (error) {
    console.error(
      'Erro ao salvar medicamentos localmente:',
      error,
    );
  }
}

/* =========================================================
   DOSES
   ========================================================= */

/**
 * Cria a primeira dose programada do medicamento.
 */
async function createInitialDose(
  medicine: Medicine,
): Promise<void> {
  await api.post('/doses', {
    medicineId: medicine.id,
    compartmentId: medicine.compartmentId,
    scheduledTime: medicine.time,
  });
}

/**
 * Atualiza a dose programada do medicamento.
 *
 * Se já existir uma dose scheduled, apenas altera o horário.
 * Caso não exista, cria uma nova.
 */
async function syncScheduledDose(
  medicine: Medicine,
): Promise<void> {
  const doses =
    await api.get<Dose[]>('/doses');

  const medicineDoses = doses.filter(
    dose => dose.medicine_id === medicine.id,
  );

  const scheduledDose = medicineDoses.find(
    dose => dose.status === 'scheduled',
  );

  if (scheduledDose) {
    await api.patch(
      `/doses/${scheduledDose.id}`,
      {
        scheduledTime: medicine.time,
      },
    );

    return;
  }

  await createInitialDose(medicine);
}

/* =========================================================
   MEDICAMENTOS
   ========================================================= */

/**
 * Busca todos os medicamentos.
 */
export async function getMedicines(): Promise<Medicine[]> {
  try {
    const medicines =
      await getMedicinesFromApi();

    await saveLocalMedicines(medicines);

    return medicines;
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (
        error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT'
      )
    ) {
      return getLocalMedicines();
    }

    throw error;
  }
}

/**
 * Busca um medicamento específico.
 */
export async function getMedicine(
  id: string,
): Promise<Medicine | null> {
  try {
    return await getMedicineById(id);
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (
        error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT'
      )
    ) {
      const medicines =
        await getLocalMedicines();

      return (
        medicines.find(
          medicine => medicine.id === id,
        ) ?? null
      );
    }

    if (
      error instanceof ApiRequestError &&
      error.status === 404
    ) {
      return null;
    }

    throw error;
  }
}

/**
 * Adiciona um medicamento.
 *
 * Também cria automaticamente a primeira dose programada.
 */
export async function addMedicine(
  medicine: Omit<Medicine, 'id'>,
): Promise<Medicine> {
  try {
    const createdMedicine =
      await createMedicine(medicine);

    /*
      Cria a dose programada correspondente.
    */
    await createInitialDose(
      createdMedicine,
    );

    const localMedicines =
      await getLocalMedicines();

    await saveLocalMedicines([
      ...localMedicines,
      createdMedicine,
    ]);

    return createdMedicine;
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (
        error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT'
      )
    ) {
      const localMedicines =
        await getLocalMedicines();

      const localMedicine: Medicine = {
        id: `local-${Date.now()}`,
        ...medicine,
      };

      await saveLocalMedicines([
        ...localMedicines,
        localMedicine,
      ]);

      return localMedicine;
    }

    throw error;
  }
}

/**
 * Atualiza completamente um medicamento.
 *
 * Também sincroniza sua dose programada.
 */
export async function editMedicine(
  id: string,
  medicine: Omit<Medicine, 'id'>,
): Promise<Medicine> {
  try {
    const updatedMedicine =
      await updateMedicine(
        id,
        medicine,
      );

    /*
      Atualiza/cria a dose programada.
    */
    await syncScheduledDose(
      updatedMedicine,
    );

    const localMedicines =
      await getLocalMedicines();

    const updatedLocalMedicines =
      localMedicines.map(item =>
        item.id === id
          ? updatedMedicine
          : item,
      );

    await saveLocalMedicines(
      updatedLocalMedicines,
    );

    return updatedMedicine;
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (
        error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT'
      )
    ) {
      const localMedicines =
        await getLocalMedicines();

      const updatedMedicine: Medicine = {
        id,
        ...medicine,
      };

      const exists =
        localMedicines.some(
          item => item.id === id,
        );

      const updatedLocalMedicines =
        exists
          ? localMedicines.map(item =>
              item.id === id
                ? updatedMedicine
                : item,
            )
          : [
              ...localMedicines,
              updatedMedicine,
            ];

      await saveLocalMedicines(
        updatedLocalMedicines,
      );

      return updatedMedicine;
    }

    throw error;
  }
}

/**
 * Atualiza parcialmente um medicamento.
 */
export async function editMedicinePartially(
  id: string,
  changes: Partial<Omit<Medicine, 'id'>>,
): Promise<Medicine> {
  try {
    const updatedMedicine =
      await patchMedicine(
        id,
        changes,
      );

    /*
      Só sincroniza a dose se horário ou compartimento
      forem alterados.
    */
    if (
      changes.time !== undefined ||
      changes.compartmentId !== undefined
    ) {
      await syncScheduledDose(
        updatedMedicine,
      );
    }

    const localMedicines =
      await getLocalMedicines();

    const updatedLocalMedicines =
      localMedicines.map(item =>
        item.id === id
          ? updatedMedicine
          : item,
      );

    await saveLocalMedicines(
      updatedLocalMedicines,
    );

    return updatedMedicine;
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (
        error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT'
      )
    ) {
      const localMedicines =
        await getLocalMedicines();

      const existingMedicine =
        localMedicines.find(
          item => item.id === id,
        );

      if (!existingMedicine) {
        throw new ApiRequestError(
          'Medicamento não encontrado no armazenamento local.',
          404,
          'LOCAL_NOT_FOUND',
        );
      }

      const updatedMedicine: Medicine = {
        ...existingMedicine,
        ...changes,
      };

      const updatedLocalMedicines =
        localMedicines.map(item =>
          item.id === id
            ? updatedMedicine
            : item,
        );

      await saveLocalMedicines(
        updatedLocalMedicines,
      );

      return updatedMedicine;
    }

    throw error;
  }
}

/**
 * Remove um medicamento.
 *
 * O backend remove também suas doses por CASCADE.
 */
export async function removeMedicine(
  id: string,
): Promise<void> {
  try {
    await deleteMedicine(id);

    const localMedicines =
      await getLocalMedicines();

    const updatedLocalMedicines =
      localMedicines.filter(
        medicine => medicine.id !== id,
      );

    await saveLocalMedicines(
      updatedLocalMedicines,
    );
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (
        error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT'
      )
    ) {
      const localMedicines =
        await getLocalMedicines();

      const updatedLocalMedicines =
        localMedicines.filter(
          medicine => medicine.id !== id,
        );

      await saveLocalMedicines(
        updatedLocalMedicines,
      );

      return;
    }

    throw error;
  }
}

/**
 * Limpa o cache local.
 */
export async function clearLocalMedicines(): Promise<void> {
  await AsyncStorage.removeItem(
    MEDICINES_KEY,
  );
}