import {api} from './api';
import {Medicine} from '../../types/Medicine';

export type Compartment = {
  id: number;
  medicineId: string | null;
  name: string | null;
  dose: string | null;
  time: string | null;
};

export type CreateMedicineData = {
  name: string;
  dose: string;
  time: string;
  compartmentId: number;
};

export type UpdateMedicineData = {
  name: string;
  dose: string;
  time: string;
  compartmentId: number;
};

export type PatchMedicineData =
  Partial<UpdateMedicineData>;

export async function getMedicines(): Promise<Medicine[]> {
  return api.get<Medicine[]>('/medicamentos');
}

export async function getMedicineById(
  id: string,
): Promise<Medicine> {
  return api.get<Medicine>(
    `/medicamentos/${id}`,
  );
}

export async function createMedicine(
  data: CreateMedicineData,
): Promise<Medicine> {
  return api.post<Medicine>(
    '/medicamentos',
    data,
  );
}

export async function updateMedicine(
  id: string,
  data: UpdateMedicineData,
): Promise<Medicine> {
  return api.put<Medicine>(
    `/medicamentos/${id}`,
    data,
  );
}

export async function patchMedicine(
  id: string,
  data: PatchMedicineData,
): Promise<Medicine> {
  return api.patch<Medicine>(
    `/medicamentos/${id}`,
    data,
  );
}

export async function deleteMedicine(
  id: string,
): Promise<void> {
  await api.delete<void>(
    `/medicamentos/${id}`,
  );
}

export async function medicineExists(
  id: string,
): Promise<boolean> {
  try {
    await api.head(`/medicamentos/${id}`);
    return true;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'status' in error &&
      (error as {status?: number}).status === 404
    ) {
      return false;
    }

    throw error;
  }
}

export async function getMedicineApiOptions(): Promise<void> {
  await api.options('/medicamentos');
}

export async function getCompartments(): Promise<Compartment[]> {
  return api.get<Compartment[]>('/compartimentos');
}