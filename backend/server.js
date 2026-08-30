const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const app = express();

const PORT = 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

/* =========================================================
   BANCO DE DADOS
   ========================================================= */

const db = new Database('medloop.db');

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS medicamentos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dose TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS compartimentos (
    id INTEGER PRIMARY KEY,
    medicine_id TEXT,
    FOREIGN KEY (medicine_id)
      REFERENCES medicamentos(id)
      ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS doses (
    id TEXT PRIMARY KEY,
    medicine_id TEXT NOT NULL,
    compartment_id INTEGER NOT NULL,
    scheduled_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    taken_at TEXT,
    created_at TEXT NOT NULL,

    FOREIGN KEY (medicine_id)
      REFERENCES medicamentos(id)
      ON DELETE CASCADE,

    FOREIGN KEY (compartment_id)
      REFERENCES compartimentos(id)
      ON DELETE CASCADE
  );
`);

/* =========================================================
   COMPATIBILIDADE COM BANCO EXISTENTE
   ========================================================= */

try {
  db.exec(`
    ALTER TABLE medicamentos
    ADD COLUMN deleted_at TEXT;
  `);
} catch (error) {
  if (
    !String(error.message).includes(
      'duplicate column name',
    )
  ) {
    throw error;
  }
}

/* =========================================================
   7 COMPARTIMENTOS
   ========================================================= */

const createCompartment = db.prepare(`
  INSERT OR IGNORE INTO compartimentos (id)
  VALUES (?)
`);

for (let i = 1; i <= 7; i++) {
  createCompartment.run(i);
}

/*
  Um medicamento ativo só pode estar em um compartimento.
*/
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_compartimentos_medicine_unique
  ON compartimentos(medicine_id)
  WHERE medicine_id IS NOT NULL;
`);

/* =========================================================
   AUXILIARES
   ========================================================= */

function now() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

function errorResponse(
  res,
  status,
  code,
  message,
  details = null,
) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function validateMedicine(body) {
  if (!body || typeof body !== 'object') {
    return 'Os dados enviados são inválidos.';
  }

  if (
    typeof body.name !== 'string' ||
    !body.name.trim()
  ) {
    return 'O nome do medicamento é obrigatório.';
  }

  if (
    typeof body.dose !== 'string' ||
    !body.dose.trim()
  ) {
    return 'A dose do medicamento é obrigatória.';
  }

  if (
    typeof body.time !== 'string' ||
    !body.time.trim()
  ) {
    return 'O horário do medicamento é obrigatório.';
  }

  if (
    !Number.isInteger(body.compartmentId) ||
    body.compartmentId < 1 ||
    body.compartmentId > 7
  ) {
    return 'O compartimento deve estar entre 1 e 7.';
  }

  return null;
}

function getCompartment(id) {
  return db.prepare(`
    SELECT
      id,
      medicine_id
    FROM compartimentos
    WHERE id = ?
  `).get(id);
}

function getMedicine(id) {
  return db.prepare(`
    SELECT
      m.id,
      m.name,
      m.dose,
      m.time,
      c.id AS compartmentId,
      m.created_at,
      m.updated_at
    FROM medicamentos m
    LEFT JOIN compartimentos c
      ON c.medicine_id = m.id
    WHERE m.id = ?
      AND m.deleted_at IS NULL
  `).get(id);
}

function compartmentOccupied(
  compartmentId,
  ignoreMedicineId = null,
) {
  const compartment =
    getCompartment(compartmentId);

  if (!compartment) {
    return false;
  }

  if (!compartment.medicine_id) {
    return false;
  }

  if (
    ignoreMedicineId &&
    compartment.medicine_id === ignoreMedicineId
  ) {
    return false;
  }

  return true;
}

function getCurrentTimeBrazil() {
  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
  ).format(new Date());
}

/*
  Retorna uma dose programada específica.
*/
function getScheduledDose(
  medicineId,
  compartmentId,
  scheduledTime,
) {
  return db.prepare(`
    SELECT
      d.id,
      d.medicine_id AS medicineId,
      m.name AS medicineName,
      m.dose,
      d.compartment_id AS compartmentId,
      d.scheduled_time AS scheduledTime,
      d.status,
      d.taken_at AS takenAt,
      d.created_at AS createdAt
    FROM doses d
    INNER JOIN medicamentos m
      ON m.id = d.medicine_id
    WHERE d.medicine_id = ?
      AND d.compartment_id = ?
      AND d.scheduled_time = ?
      AND d.status = 'scheduled'
      AND m.deleted_at IS NULL
    LIMIT 1
  `).get(
    medicineId,
    compartmentId,
    scheduledTime,
  );
}

/* =========================================================
   ROTAS BÁSICAS
   ========================================================= */

app.get('/', (req, res) => {
  res.json({
    name: 'Medloop API',
    version: '1.0.0',
    status: 'online',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: now(),
  });
});

/* =========================================================
   MEDICAMENTOS
   ========================================================= */

app.get('/medicamentos', (req, res) => {
  try {
    const medicines = db.prepare(`
      SELECT
        m.id,
        m.name,
        m.dose,
        m.time,
        c.id AS compartmentId,
        m.created_at,
        m.updated_at
      FROM medicamentos m
      LEFT JOIN compartimentos c
        ON c.medicine_id = m.id
      WHERE m.deleted_at IS NULL
      ORDER BY m.time ASC
    `).all();

    return res.json(medicines);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível buscar os medicamentos.',
    );
  }
});

app.get('/medicamentos/:id', (req, res) => {
  try {
    const medicine =
      getMedicine(req.params.id);

    if (!medicine) {
      return errorResponse(
        res,
        404,
        'MEDICINE_NOT_FOUND',
        'Medicamento não encontrado.',
      );
    }

    return res.json(medicine);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível buscar o medicamento.',
    );
  }
});

app.post('/medicamentos', (req, res) => {
  try {
    const validationError =
      validateMedicine(req.body);

    if (validationError) {
      return errorResponse(
        res,
        422,
        'VALIDATION_ERROR',
        validationError,
      );
    }

    const {
      name,
      dose,
      time,
      compartmentId,
    } = req.body;

    const compartment =
      getCompartment(compartmentId);

    if (!compartment) {
      return errorResponse(
        res,
        404,
        'COMPARTMENT_NOT_FOUND',
        'Compartimento não encontrado.',
      );
    }

    if (
      compartmentOccupied(compartmentId)
    ) {
      return errorResponse(
        res,
        409,
        'COMPARTMENT_OCCUPIED',
        `O compartimento ${compartmentId} já está ocupado.`,
        {
          compartmentId,
          medicineId:
            compartment.medicine_id,
        },
      );
    }

    const id = createId();
    const timestamp = now();

    const transaction =
      db.transaction(() => {
        db.prepare(`
          INSERT INTO medicamentos (
            id,
            name,
            dose,
            time,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (?, ?, ?, ?, ?, ?, NULL)
        `).run(
          id,
          name.trim(),
          dose.trim(),
          time.trim(),
          timestamp,
          timestamp,
        );

        db.prepare(`
          UPDATE compartimentos
          SET medicine_id = ?
          WHERE id = ?
        `).run(
          id,
          compartmentId,
        );
      });

    transaction();

    return res
      .status(201)
      .json(getMedicine(id));
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível criar o medicamento.',
    );
  }
});

app.put('/medicamentos/:id', (req, res) => {
  try {
    const validationError =
      validateMedicine(req.body);

    if (validationError) {
      return errorResponse(
        res,
        422,
        'VALIDATION_ERROR',
        validationError,
      );
    }

    const existing =
      getMedicine(req.params.id);

    if (!existing) {
      return errorResponse(
        res,
        404,
        'MEDICINE_NOT_FOUND',
        'Medicamento não encontrado.',
      );
    }

    const {
      name,
      dose,
      time,
      compartmentId,
    } = req.body;

    if (
      compartmentOccupied(
        compartmentId,
        req.params.id,
      )
    ) {
      return errorResponse(
        res,
        409,
        'COMPARTMENT_OCCUPIED',
        `O compartimento ${compartmentId} já está ocupado.`,
      );
    }

    const transaction =
      db.transaction(() => {
        db.prepare(`
          UPDATE compartimentos
          SET medicine_id = NULL
          WHERE medicine_id = ?
        `).run(req.params.id);

        db.prepare(`
          UPDATE medicamentos
          SET
            name = ?,
            dose = ?,
            time = ?,
            updated_at = ?
          WHERE id = ?
            AND deleted_at IS NULL
        `).run(
          name.trim(),
          dose.trim(),
          time.trim(),
          now(),
          req.params.id,
        );

        db.prepare(`
          UPDATE compartimentos
          SET medicine_id = ?
          WHERE id = ?
        `).run(
          req.params.id,
          compartmentId,
        );
      });

    transaction();

    return res.json(
      getMedicine(req.params.id),
    );
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível atualizar o medicamento.',
    );
  }
});

app.patch('/medicamentos/:id', (req, res) => {
  try {
    const existing =
      getMedicine(req.params.id);

    if (!existing) {
      return errorResponse(
        res,
        404,
        'MEDICINE_NOT_FOUND',
        'Medicamento não encontrado.',
      );
    }

    const name =
      req.body.name !== undefined
        ? String(req.body.name).trim()
        : existing.name;

    const dose =
      req.body.dose !== undefined
        ? String(req.body.dose).trim()
        : existing.dose;

    const time =
      req.body.time !== undefined
        ? String(req.body.time).trim()
        : existing.time;

    const compartmentId =
      req.body.compartmentId !== undefined
        ? req.body.compartmentId
        : existing.compartmentId;

    if (!name || !dose || !time) {
      return errorResponse(
        res,
        422,
        'VALIDATION_ERROR',
        'Nome, dose e horário não podem ficar vazios.',
      );
    }

    if (
      !Number.isInteger(compartmentId) ||
      compartmentId < 1 ||
      compartmentId > 7
    ) {
      return errorResponse(
        res,
        422,
        'INVALID_COMPARTMENT',
        'O compartimento deve estar entre 1 e 7.',
      );
    }

    if (
      compartmentOccupied(
        compartmentId,
        req.params.id,
      )
    ) {
      return errorResponse(
        res,
        409,
        'COMPARTMENT_OCCUPIED',
        `O compartimento ${compartmentId} já está ocupado.`,
      );
    }

    const transaction =
      db.transaction(() => {
        db.prepare(`
          UPDATE medicamentos
          SET
            name = ?,
            dose = ?,
            time = ?,
            updated_at = ?
          WHERE id = ?
            AND deleted_at IS NULL
        `).run(
          name,
          dose,
          time,
          now(),
          req.params.id,
        );

        db.prepare(`
          UPDATE compartimentos
          SET medicine_id = NULL
          WHERE medicine_id = ?
        `).run(req.params.id);

        db.prepare(`
          UPDATE compartimentos
          SET medicine_id = ?
          WHERE id = ?
        `).run(
          req.params.id,
          compartmentId,
        );
      });

    transaction();

    return res.json(
      getMedicine(req.params.id),
    );
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível alterar o medicamento.',
    );
  }
});

/*
  Exclusão lógica:
  - libera o compartimento;
  - mantém o medicamento no banco;
  - preserva as doses para o histórico.
*/
app.delete('/medicamentos/:id', (req, res) => {
  try {
    const medicine = db.prepare(`
      SELECT id
      FROM medicamentos
      WHERE id = ?
        AND deleted_at IS NULL
    `).get(req.params.id);

    if (!medicine) {
      return errorResponse(
        res,
        404,
        'MEDICINE_NOT_FOUND',
        'Medicamento não encontrado.',
      );
    }

    const transaction =
      db.transaction(() => {
        db.prepare(`
          UPDATE compartimentos
          SET medicine_id = NULL
          WHERE medicine_id = ?
        `).run(req.params.id);

        db.prepare(`
          UPDATE medicamentos
          SET deleted_at = ?
          WHERE id = ?
        `).run(
          now(),
          req.params.id,
        );
      });

    transaction();

    return res.status(204).send();
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível excluir o medicamento.',
    );
  }
});

app.head('/medicamentos/:id', (req, res) => {
  try {
    const medicine = db.prepare(`
      SELECT id
      FROM medicamentos
      WHERE id = ?
        AND deleted_at IS NULL
    `).get(req.params.id);

    return medicine
      ? res.status(200).end()
      : res.status(404).end();
  } catch (error) {
    return res.status(500).end();
  }
});

app.options('/medicamentos', (req, res) => {
  res.set(
    'Allow',
    'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
  );

  return res.status(204).send();
});

/* =========================================================
   COMPARTIMENTOS
   ========================================================= */

app.get('/compartimentos', (req, res) => {
  try {
    const compartments = db.prepare(`
      SELECT
        c.id,
        c.medicine_id AS medicineId,
        m.name,
        m.dose,
        m.time
      FROM compartimentos c
      LEFT JOIN medicamentos m
        ON m.id = c.medicine_id
       AND m.deleted_at IS NULL
      ORDER BY c.id ASC
    `).all();

    return res.json(compartments);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível buscar os compartimentos.',
    );
  }
});

app.get('/compartimentos/:id', (req, res) => {
  try {
    const id = Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id < 1 ||
      id > 7
    ) {
      return errorResponse(
        res,
        400,
        'INVALID_COMPARTMENT',
        'O compartimento deve estar entre 1 e 7.',
      );
    }

    const compartment =
      db.prepare(`
        SELECT
          c.id,
          c.medicine_id AS medicineId,
          m.name,
          m.dose,
          m.time
        FROM compartimentos c
        LEFT JOIN medicamentos m
          ON m.id = c.medicine_id
         AND m.deleted_at IS NULL
        WHERE c.id = ?
      `).get(id);

    if (!compartment) {
      return errorResponse(
        res,
        404,
        'COMPARTMENT_NOT_FOUND',
        'Compartimento não encontrado.',
      );
    }

    return res.json(compartment);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível buscar o compartimento.',
    );
  }
});

app.put('/compartimentos/:id', (req, res) => {
  try {
    const compartmentId =
      Number(req.params.id);

    if (
      !Number.isInteger(compartmentId) ||
      compartmentId < 1 ||
      compartmentId > 7
    ) {
      return errorResponse(
        res,
        400,
        'INVALID_COMPARTMENT',
        'O compartimento deve estar entre 1 e 7.',
      );
    }

    const compartment =
      getCompartment(compartmentId);

    if (!compartment) {
      return errorResponse(
        res,
        404,
        'COMPARTMENT_NOT_FOUND',
        'Compartimento não encontrado.',
      );
    }

    const medicineId =
      req.body.medicineId ?? null;

    if (medicineId !== null) {
      const medicine = db.prepare(`
        SELECT id
        FROM medicamentos
        WHERE id = ?
          AND deleted_at IS NULL
      `).get(medicineId);

      if (!medicine) {
        return errorResponse(
          res,
          404,
          'MEDICINE_NOT_FOUND',
          'Medicamento não encontrado.',
        );
      }

      const assigned =
        db.prepare(`
          SELECT id
          FROM compartimentos
          WHERE medicine_id = ?
            AND id != ?
        `).get(
          medicineId,
          compartmentId,
        );

      if (assigned) {
        return errorResponse(
          res,
          409,
          'MEDICINE_ALREADY_ASSIGNED',
          'Este medicamento já está associado a outro compartimento.',
        );
      }

      if (
        compartment.medicine_id &&
        compartment.medicine_id !== medicineId
      ) {
        return errorResponse(
          res,
          409,
          'COMPARTMENT_OCCUPIED',
          `O compartimento ${compartmentId} já está ocupado.`,
        );
      }
    }

    db.prepare(`
      UPDATE compartimentos
      SET medicine_id = ?
      WHERE id = ?
    `).run(
      medicineId,
      compartmentId,
    );

    const updated =
      db.prepare(`
        SELECT
          c.id,
          c.medicine_id AS medicineId,
          m.name,
          m.dose,
          m.time
        FROM compartimentos c
        LEFT JOIN medicamentos m
          ON m.id = c.medicine_id
         AND m.deleted_at IS NULL
        WHERE c.id = ?
      `).get(compartmentId);

    return res.json(updated);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível atualizar o compartimento.',
    );
  }
});

/* =========================================================
   DOSES
   ========================================================= */

app.get('/doses', (req, res) => {
  try {
    const doses = db.prepare(`
      SELECT
        d.id,
        d.medicine_id AS medicineId,
        m.name AS medicineName,
        m.dose,
        d.compartment_id AS compartmentId,
        d.scheduled_time AS scheduledTime,
        d.status,
        d.taken_at AS takenAt,
        d.created_at AS createdAt
      FROM doses d
      INNER JOIN medicamentos m
        ON m.id = d.medicine_id
      ORDER BY d.scheduled_time ASC
    `).all();

    return res.json(doses);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível buscar as doses.',
    );
  }
});

/*
  POST /doses

  Se a mesma dose scheduled já existir,
  não cria outra.
*/
app.post('/doses', (req, res) => {
  try {
    const {
      medicineId,
      compartmentId,
      scheduledTime,
    } = req.body;

    if (
      !medicineId ||
      !Number.isInteger(compartmentId) ||
      !scheduledTime
    ) {
      return errorResponse(
        res,
        422,
        'VALIDATION_ERROR',
        'medicineId, compartmentId e scheduledTime são obrigatórios.',
      );
    }

    if (
      compartmentId < 1 ||
      compartmentId > 7
    ) {
      return errorResponse(
        res,
        422,
        'INVALID_COMPARTMENT',
        'O compartimento deve estar entre 1 e 7.',
      );
    }

    const medicine = db.prepare(`
      SELECT id
      FROM medicamentos
      WHERE id = ?
        AND deleted_at IS NULL
    `).get(medicineId);

    if (!medicine) {
      return errorResponse(
        res,
        404,
        'MEDICINE_NOT_FOUND',
        'Medicamento não encontrado.',
      );
    }

    const compartment =
      db.prepare(`
        SELECT id, medicine_id
        FROM compartimentos
        WHERE id = ?
      `).get(compartmentId);

    if (!compartment) {
      return errorResponse(
        res,
        404,
        'COMPARTMENT_NOT_FOUND',
        'Compartimento não encontrado.',
      );
    }

    if (
      compartment.medicine_id !== medicineId
    ) {
      return errorResponse(
        res,
        409,
        'MEDICINE_COMPARTMENT_MISMATCH',
        'O medicamento não está associado a esse compartimento.',
      );
    }

    /*
      Proteção contra duplicação.
    */
    const existingDose =
      getScheduledDose(
        medicineId,
        compartmentId,
        scheduledTime,
      );

    if (existingDose) {
      return res.status(200).json(
        existingDose,
      );
    }

    const id = createId();

    db.prepare(`
      INSERT INTO doses (
        id,
        medicine_id,
        compartment_id,
        scheduled_time,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, 'scheduled', ?)
    `).run(
      id,
      medicineId,
      compartmentId,
      scheduledTime,
      now(),
    );

    const dose =
      db.prepare(`
        SELECT
          d.id,
          d.medicine_id AS medicineId,
          m.name AS medicineName,
          m.dose,
          d.compartment_id AS compartmentId,
          d.scheduled_time AS scheduledTime,
          d.status,
          d.taken_at AS takenAt,
          d.created_at AS createdAt
        FROM doses d
        INNER JOIN medicamentos m
          ON m.id = d.medicine_id
        WHERE d.id = ?
      `).get(id);

    return res.status(201).json(dose);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível criar a dose.',
    );
  }
});

/*
  DELETE /doses/:id

  Usado para apagar uma dose cadastrada por engano.
*/
app.delete('/doses/:id', (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM doses
      WHERE id = ?
    `).run(req.params.id);

    if (result.changes === 0) {
      return errorResponse(
        res,
        404,
        'DOSE_NOT_FOUND',
        'Dose não encontrada.',
      );
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível excluir a dose.',
    );
  }
});

app.patch('/doses/:id', (req, res) => {
  try {
    const dose = db.prepare(`
      SELECT *
      FROM doses
      WHERE id = ?
    `).get(req.params.id);

    if (!dose) {
      return errorResponse(
        res,
        404,
        'DOSE_NOT_FOUND',
        'Dose não encontrada.',
      );
    }

    const status =
      req.body.status ?? dose.status;

    const scheduledTime =
      req.body.scheduledTime ??
      dose.scheduled_time;

    const takenAt =
      req.body.takenAt ??
      dose.taken_at;

    const validStatuses = [
      'scheduled',
      'taken',
      'missed',
    ];

    if (
      !validStatuses.includes(status)
    ) {
      return errorResponse(
        res,
        422,
        'INVALID_STATUS',
        'Status deve ser scheduled, taken ou missed.',
      );
    }

    /*
      Ao alterar uma dose para scheduled,
      também evita duplicação.
    */
    if (status === 'scheduled') {
      const duplicate =
        getScheduledDose(
          dose.medicine_id,
          dose.compartment_id,
          scheduledTime,
        );

      if (
        duplicate &&
        duplicate.id !== dose.id
      ) {
        return res.status(200).json(
          duplicate,
        );
      }
    }

    db.prepare(`
      UPDATE doses
      SET
        status = ?,
        scheduled_time = ?,
        taken_at = ?
      WHERE id = ?
    `).run(
      status,
      scheduledTime,
      takenAt,
      req.params.id,
    );

    const updatedDose =
      db.prepare(`
        SELECT
          d.id,
          d.medicine_id AS medicineId,
          m.name AS medicineName,
          m.dose,
          d.compartment_id AS compartmentId,
          d.scheduled_time AS scheduledTime,
          d.status,
          d.taken_at AS takenAt,
          d.created_at AS createdAt
        FROM doses d
        INNER JOIN medicamentos m
          ON m.id = d.medicine_id
        WHERE d.id = ?
      `).get(req.params.id);

    return res.json(updatedDose);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível atualizar a dose.',
    );
  }
});

app.post('/doses/:id/taken', (req, res) => {
  try {
    const dose = db.prepare(`
      SELECT id
      FROM doses
      WHERE id = ?
    `).get(req.params.id);

    if (!dose) {
      return errorResponse(
        res,
        404,
        'DOSE_NOT_FOUND',
        'Dose não encontrada.',
      );
    }

    db.prepare(`
      UPDATE doses
      SET
        status = 'taken',
        taken_at = ?
      WHERE id = ?
    `).run(
      now(),
      req.params.id,
    );

    const updatedDose =
      db.prepare(`
        SELECT
          d.id,
          d.medicine_id AS medicineId,
          m.name AS medicineName,
          m.dose,
          d.compartment_id AS compartmentId,
          d.scheduled_time AS scheduledTime,
          d.status,
          d.taken_at AS takenAt,
          d.created_at AS createdAt
        FROM doses d
        INNER JOIN medicamentos m
          ON m.id = d.medicine_id
        WHERE d.id = ?
      `).get(req.params.id);

    return res.json(updatedDose);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível registrar a dose tomada.',
    );
  }
});

app.post('/doses/:id/missed', (req, res) => {
  try {
    const dose = db.prepare(`
      SELECT id
      FROM doses
      WHERE id = ?
    `).get(req.params.id);

    if (!dose) {
      return errorResponse(
        res,
        404,
        'DOSE_NOT_FOUND',
        'Dose não encontrada.',
      );
    }

    db.prepare(`
      UPDATE doses
      SET status = 'missed'
      WHERE id = ?
    `).run(req.params.id);

    const updatedDose =
      db.prepare(`
        SELECT
          d.id,
          d.medicine_id AS medicineId,
          m.name AS medicineName,
          m.dose,
          d.compartment_id AS compartmentId,
          d.scheduled_time AS scheduledTime,
          d.status,
          d.taken_at AS takenAt,
          d.created_at AS createdAt
        FROM doses d
        INNER JOIN medicamentos m
          ON m.id = d.medicine_id
        WHERE d.id = ?
      `).get(req.params.id);

    return res.json(updatedDose);
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível registrar a dose perdida.',
    );
  }
});

/* =========================================================
   HARDWARE
   ========================================================= */

app.get('/hardware/doses', (req, res) => {
  try {
    const requestedTime =
      typeof req.query.time === 'string' &&
      /^\d{2}:\d{2}$/.test(req.query.time)
        ? req.query.time
        : getCurrentTimeBrazil();

    const doses = db.prepare(`
      SELECT
        d.id,
        d.medicine_id AS medicineId,
        m.name AS medicineName,
        m.dose,
        d.compartment_id AS compartmentId,
        d.scheduled_time AS scheduledTime,
        d.status
      FROM doses d
      INNER JOIN medicamentos m
        ON m.id = d.medicine_id
      WHERE d.status = 'scheduled'
        AND d.scheduled_time = ?
        AND m.deleted_at IS NULL
      ORDER BY d.compartment_id ASC
    `).all(requestedTime);

    return res.json({
      time: requestedTime,
      doses,
    });
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Não foi possível buscar as doses do hardware.',
    );
  }
});

/* =========================================================
   ERROS
   ========================================================= */

app.use((req, res) => {
  return errorResponse(
    res,
    404,
    'ROUTE_NOT_FOUND',
    `Rota ${req.method} ${req.path} não encontrada.`,
  );
});

app.use((error, req, res, next) => {
  console.error(
    'Erro não tratado:',
    error,
  );

  if (res.headersSent) {
    return next(error);
  }

  return errorResponse(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'Ocorreu um erro interno no servidor.',
  );
});

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('======================================');
  console.log('          MEDLOOP API ONLINE');
  console.log('======================================');
  console.log(
    `Servidor: http://localhost:${PORT}`,
  );
  console.log(
    `Health:   http://localhost:${PORT}/health`,
  );
  console.log(
    `Hardware: http://localhost:${PORT}/hardware/doses`,
  );
  console.log('');
});