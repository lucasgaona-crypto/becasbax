import fs from 'fs';
import path from 'path';
import type {
  ApiResponse,
  AuditEntry,
  Convocatoria,
  ConvocatoriaResumen,
  DashboardSummary,
  PaginatedSolicitudesResponse,
  Postulante,
  PostulanteView,
  Solicitud,
  SolicitudEstado,
  SolicitudView,
  UserRole,
} from '../src/types.ts';

interface DatabaseState {
  convocatorias: Convocatoria[];
  postulantes: Postulante[];
  solicitudes: Solicitud[];
  auditLog: AuditEntry[];
  counters: {
    conv: number;
    post: number;
    sol: number;
    audit: number;
    lockTicket: number;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'becagest-db.json');

// Async mutex that strictly serializes read-check-write transactions to guarantee quota invariants under concurrency.
class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

const mutex = new AsyncMutex();

function createInitialSeed(): DatabaseState {
  const now = '2026-11-18T10:00:00.000Z';

  const convocatorias: Convocatoria[] = [
    {
      id: 'CONV-2026-01',
      nombre: 'Beca Excelencia Académica 2026-II',
      cupos: 4,
      apertura: '2026-11-01T00:00:00',
      cierre: '2026-12-15T23:59:59',
      descripcion: 'Apoyo integral de matrícula para estudiantes con promedio destacado en carreras técnicas y científicas.',
      createdAt: '2026-10-25T09:00:00.000Z',
      updatedAt: '2026-11-12T14:20:00.000Z',
    },
    {
      id: 'CONV-2026-02',
      nombre: 'Beca Apoyo Socioeconómico STEM',
      cupos: 3,
      apertura: '2026-11-05T00:00:00',
      cierre: '2026-12-20T23:59:59',
      descripcion: 'Subsidio semestral de manutención y conectividad orientado a hogares de ingresos moderados.',
      createdAt: '2026-10-28T11:30:00.000Z',
      updatedAt: '2026-11-15T16:10:00.000Z',
    },
    {
      id: 'CONV-2026-03',
      nombre: 'Beca Movilidad e Investigación 2026-I',
      cupos: 3,
      apertura: '2026-09-01T00:00:00',
      cierre: '2026-10-31T23:59:59',
      descripcion: 'Financiamiento de pasantías de laboratorio e intercambio académico (convocatoria cerrada).',
      createdAt: '2026-08-20T08:00:00.000Z',
      updatedAt: '2026-11-01T09:00:00.000Z',
    },
    {
      id: 'CONV-2026-04',
      nombre: 'Beca Talento Cultural y Deportivo 2027',
      cupos: 5,
      apertura: '2026-12-01T00:00:00',
      cierre: '2027-01-31T23:59:59',
      descripcion: 'Convocatoria próxima a abrir para representantes institucionales en disciplinas deportivas y artísticas.',
      createdAt: '2026-11-10T12:00:00.000Z',
      updatedAt: '2026-11-10T12:00:00.000Z',
    },
  ];

  const postulantes: Postulante[] = [
    { id: 'POST-001', documento: '45.812.304', nombre: 'Valentina Morales Ríos', curso: '2° Ingeniería Civil', createdAt: now, updatedAt: now },
    { id: 'POST-002', documento: '46.109.772', nombre: 'Mateo Benítez Salgado', curso: '3° Ingeniería Informática', createdAt: now, updatedAt: now },
    { id: 'POST-003', documento: '44.920.118', nombre: 'Camila Duarte Paredes', curso: '1° Arquitectura', createdAt: now, updatedAt: now },
    { id: 'POST-004', documento: '47.304.519', nombre: 'Santiago Ferreyra Paz', curso: '4° Medicina', createdAt: now, updatedAt: now },
    { id: 'POST-005', documento: '45.219.840', nombre: 'Lucía Villalba Gómez', curso: '2° Ingeniería Informática', createdAt: now, updatedAt: now },
    { id: 'POST-006', documento: '46.774.205', nombre: 'Tomás Navarro Quiroga', curso: '1° Diseño Industrial', createdAt: now, updatedAt: now },
    { id: 'POST-007', documento: '44.508.931', nombre: 'Sofía Acosta Méndez', curso: '3° Ingeniería Civil', createdAt: now, updatedAt: now },
    { id: 'POST-008', documento: '47.118.642', nombre: 'Joaquín Pereyra Luna', curso: '2° Lic. en Datos', createdAt: now, updatedAt: now },
    { id: 'POST-009', documento: '45.993.410', nombre: 'Martina Cabrera Solís', curso: '4° Bioquímica', createdAt: now, updatedAt: now },
    { id: 'POST-010', documento: '46.402.887', nombre: 'Nicolás Ibarra Toledo', curso: '1° Ingeniería Informática', createdAt: now, updatedAt: now },
    { id: 'POST-011', documento: '45.140.663', nombre: 'Elena Giménez Bravo', curso: '3° Arquitectura', createdAt: now, updatedAt: now },
    { id: 'POST-012', documento: '47.625.190', nombre: 'Bruno Santillán Vega', curso: '2° Ingeniería Civil', createdAt: now, updatedAt: now },
  ];

  const solicitudes: Solicitud[] = [
    {
      id: 'SOL-0001',
      convocatoriaId: 'CONV-2026-01',
      postulanteId: 'POST-001',
      promedio: 4.85,
      ingresoFamiliar: 980000,
      estado: 'Aprobada',
      motivoDecision: 'Aprobada dentro de cupo: promedio sobresaliente (4.85) y documentación verificada.',
      createdAt: '2026-11-03T10:15:00.000Z',
      updatedAt: '2026-11-05T11:00:00.000Z',
    },
    {
      id: 'SOL-0002',
      convocatoriaId: 'CONV-2026-01',
      postulanteId: 'POST-002',
      promedio: 4.62,
      ingresoFamiliar: 1450000,
      estado: 'Aprobada',
      motivoDecision: 'Aprobada dentro de cupo: cumple requisitos académicos y plazo vigente.',
      createdAt: '2026-11-04T14:20:00.000Z',
      updatedAt: '2026-11-06T09:40:00.000Z',
    },
    {
      id: 'SOL-0003',
      convocatoriaId: 'CONV-2026-01',
      postulanteId: 'POST-004',
      promedio: 4.48,
      ingresoFamiliar: 1120000,
      estado: 'Pendiente',
      motivoDecision: 'Postulación admitida en plazo; pendiente de evaluación del comité.',
      createdAt: '2026-11-08T16:05:00.000Z',
      updatedAt: '2026-11-08T16:05:00.000Z',
    },
    {
      id: 'SOL-0004',
      convocatoriaId: 'CONV-2026-01',
      postulanteId: 'POST-005',
      promedio: 4.15,
      ingresoFamiliar: 740000,
      estado: 'Pendiente',
      motivoDecision: 'Postulación admitida en plazo; pendiente de evaluación del comité.',
      createdAt: '2026-11-10T09:30:00.000Z',
      updatedAt: '2026-11-10T09:30:00.000Z',
    },
    {
      id: 'SOL-0005',
      convocatoriaId: 'CONV-2026-01',
      postulanteId: 'POST-006',
      promedio: 3.12,
      ingresoFamiliar: 2650000,
      estado: 'Rechazada',
      motivoDecision: 'Rechazada en evaluación académica: promedio inferior al umbral competitivo del período.',
      createdAt: '2026-11-07T11:45:00.000Z',
      updatedAt: '2026-11-11T15:10:00.000Z',
    },
    {
      id: 'SOL-0006',
      convocatoriaId: 'CONV-2026-02',
      postulanteId: 'POST-007',
      promedio: 4.55,
      ingresoFamiliar: 520000,
      estado: 'Aprobada',
      motivoDecision: 'Aprobada dentro de cupo: prioridad socioeconómica y alto rendimiento.',
      createdAt: '2026-11-06T08:50:00.000Z',
      updatedAt: '2026-11-09T13:25:00.000Z',
    },
    {
      id: 'SOL-0007',
      convocatoriaId: 'CONV-2026-02',
      postulanteId: 'POST-008',
      promedio: 4.38,
      ingresoFamiliar: 610000,
      estado: 'Aprobada',
      motivoDecision: 'Aprobada dentro de cupo: cumple criterios STEM e ingreso declarado.',
      createdAt: '2026-11-07T13:10:00.000Z',
      updatedAt: '2026-11-10T17:00:00.000Z',
    },
    {
      id: 'SOL-0008',
      convocatoriaId: 'CONV-2026-02',
      postulanteId: 'POST-010',
      promedio: 4.28,
      ingresoFamiliar: 480000,
      estado: 'Pendiente',
      motivoDecision: 'Postulación admitida en plazo; compite por el último cupo disponible.',
      createdAt: '2026-11-12T10:00:00.000Z',
      updatedAt: '2026-11-12T10:00:00.000Z',
    },
    {
      id: 'SOL-0009',
      convocatoriaId: 'CONV-2026-02',
      postulanteId: 'POST-012',
      promedio: 4.19,
      ingresoFamiliar: 590000,
      estado: 'Pendiente',
      motivoDecision: 'Postulación admitida en plazo; en espera de dictamen.',
      createdAt: '2026-11-14T15:40:00.000Z',
      updatedAt: '2026-11-14T15:40:00.000Z',
    },
    {
      id: 'SOL-0010',
      convocatoriaId: 'CONV-2026-03',
      postulanteId: 'POST-003',
      promedio: 4.91,
      ingresoFamiliar: 1320000,
      estado: 'Aprobada',
      motivoDecision: 'Aprobada en período 2026-I; cupo asignado.',
      createdAt: '2026-09-12T11:00:00.000Z',
      updatedAt: '2026-10-05T10:00:00.000Z',
    },
    {
      id: 'SOL-0011',
      convocatoriaId: 'CONV-2026-03',
      postulanteId: 'POST-009',
      promedio: 4.74,
      ingresoFamiliar: 890000,
      estado: 'Aprobada',
      motivoDecision: 'Aprobada en período 2026-I; cupo asignado.',
      createdAt: '2026-09-15T14:30:00.000Z',
      updatedAt: '2026-10-06T12:15:00.000Z',
    },
    {
      id: 'SOL-0012',
      convocatoriaId: 'CONV-2026-03',
      postulanteId: 'POST-011',
      promedio: 4.68,
      ingresoFamiliar: 1050000,
      estado: 'Aprobada',
      motivoDecision: 'Aprobada en período 2026-I; completó el cupo máximo (3/3).',
      createdAt: '2026-09-18T16:10:00.000Z',
      updatedAt: '2026-10-07T09:00:00.000Z',
    },
    {
      id: 'SOL-0013',
      convocatoriaId: 'CONV-2026-03',
      postulanteId: 'POST-001',
      promedio: 4.50,
      ingresoFamiliar: 980000,
      estado: 'Pendiente',
      motivoDecision: 'Recibida en plazo; en lista de espera por cupos completos (3/3).',
      createdAt: '2026-10-20T12:00:00.000Z',
      updatedAt: '2026-10-20T12:00:00.000Z',
    },
  ];

  const auditLog: AuditEntry[] = [
    {
      id: 'AUD-0001',
      timestamp: '2026-11-15T16:10:00.000Z',
      actorRole: 'admin',
      action: 'Carga Inicial',
      entity: 'Sistema',
      entityId: 'SEED',
      accepted: true,
      rule: 'Inicialización de Datos Ficticios',
      message: 'Base de datos inicializada con 4 convocatorias, 12 postulantes y 13 solicitudes.',
    },
  ];

  return {
    convocatorias,
    postulantes,
    solicitudes,
    auditLog,
    counters: {
      conv: 4,
      post: 12,
      sol: 13,
      audit: 1,
      lockTicket: 0,
    },
  };
}

function loadDb(): DatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw) as DatabaseState;
}

function saveDb(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

function nextAudit(
  db: DatabaseState,
  actorRole: UserRole,
  action: string,
  entity: AuditEntry['entity'],
  entityId: string,
  accepted: boolean,
  rule: string,
  message: string
): void {
  db.counters.audit += 1;
  const entry: AuditEntry = {
    id: `AUD-${String(db.counters.audit).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    actorRole,
    action,
    entity,
    entityId,
    accepted,
    rule,
    message,
  };
  db.auditLog.unshift(entry);
  if (db.auditLog.length > 200) {
    db.auditLog = db.auditLog.slice(0, 200);
  }
}

function maskDocumento(doc: string): string {
  const trimmed = doc.trim();
  if (trimmed.length <= 3) return '•••';
  return `•••••${trimmed.slice(-3)}`;
}

function sanitizeMotivoForConsulta(estado: SolicitudEstado): string {
  if (estado === 'Aprobada') return 'Beneficio asignado (información pública autorizada).';
  if (estado === 'Rechazada') return 'No seleccionada en la convocatoria (detalle reservado).';
  return 'En proceso de evaluación (detalle reservado).';
}

function getWindowState(conv: Convocatoria, nowMs = Date.now()): {
  estadoPlazo: 'Abierta' | 'Cerrada' | 'Próxima';
  enPlazo: boolean;
} {
  const openMs = new Date(conv.apertura).getTime();
  const closeMs = new Date(conv.cierre).getTime();
  if (nowMs < openMs) {
    return { estadoPlazo: 'Próxima', enPlazo: false };
  }
  if (nowMs > closeMs) {
    return { estadoPlazo: 'Cerrada', enPlazo: false };
  }
  return { estadoPlazo: 'Abierta', enPlazo: true };
}

function buildConvocatoriaResumen(conv: Convocatoria, solicitudes: Solicitud[]): ConvocatoriaResumen {
  const related = solicitudes.filter((s) => s.convocatoriaId === conv.id);
  const aprobadas = related.filter((s) => s.estado === 'Aprobada').length;
  const pendientes = related.filter((s) => s.estado === 'Pendiente').length;
  const rechazadas = related.filter((s) => s.estado === 'Rechazada').length;
  const cuposRestantes = Math.max(0, conv.cupos - aprobadas);
  const windowInfo = getWindowState(conv);

  return {
    ...conv,
    recibidas: related.length,
    aprobadas,
    pendientes,
    rechazadas,
    cuposRestantes,
    estadoPlazo: windowInfo.estadoPlazo,
    enPlazo: windowInfo.enPlazo,
  };
}

function buildSolicitudView(
  sol: Solicitud,
  convMap: Map<string, ConvocatoriaResumen>,
  postMap: Map<string, Postulante>,
  role: UserRole
): SolicitudView {
  const conv = convMap.get(sol.convocatoriaId);
  const post = postMap.get(sol.postulanteId);
  const isAdmin = role === 'admin';

  return {
    id: sol.id,
    convocatoriaId: sol.convocatoriaId,
    postulanteId: sol.postulanteId,
    promedio: sol.promedio,
    ingresoFamiliar: isAdmin ? sol.ingresoFamiliar : null,
    ingresoAutorizado: isAdmin,
    estado: sol.estado,
    motivoDecision: isAdmin ? sol.motivoDecision : sanitizeMotivoForConsulta(sol.estado),
    createdAt: sol.createdAt,
    updatedAt: sol.updatedAt,
    convocatoriaNombre: conv?.nombre ?? 'Convocatoria eliminada',
    convocatoriaCupos: conv?.cupos ?? 0,
    convocatoriaAprobadas: conv?.aprobadas ?? 0,
    convocatoriaRestantes: conv?.cuposRestantes ?? 0,
    convocatoriaEnPlazo: conv?.enPlazo ?? false,
    postulanteNombre: post?.nombre ?? 'Postulante eliminado',
    postulanteDocumento: isAdmin
      ? post?.documento ?? '—'
      : maskDocumento(post?.documento ?? ''),
    postulanteCurso: post?.curso ?? '—',
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return mutex.runExclusive(() => {
    const db = loadDb();
    const resumenes = db.convocatorias.map((c) => buildConvocatoriaResumen(c, db.solicitudes));
    const totalRecibidas = db.solicitudes.length;
    const totalAprobadas = db.solicitudes.filter((s) => s.estado === 'Aprobada').length;
    const totalPendientes = db.solicitudes.filter((s) => s.estado === 'Pendiente').length;
    const totalRechazadas = db.solicitudes.filter((s) => s.estado === 'Rechazada').length;
    const cuposTotales = resumenes.reduce((acc, c) => acc + c.cupos, 0);
    const cuposRestantes = resumenes.reduce((acc, c) => acc + c.cuposRestantes, 0);
    const convocatoriasActivas = resumenes.filter((c) => c.enPlazo).length;

    return {
      totalRecibidas,
      totalAprobadas,
      totalPendientes,
      totalRechazadas,
      cuposTotales,
      cuposRestantes,
      convocatoriasActivas,
      totalPostulantes: db.postulantes.length,
      convocatorias: resumenes,
    };
  });
}

export async function listConvocatorias(): Promise<ConvocatoriaResumen[]> {
  return mutex.runExclusive(() => {
    const db = loadDb();
    return db.convocatorias.map((c) => buildConvocatoriaResumen(c, db.solicitudes));
  });
}

export async function listPostulantes(role: UserRole): Promise<PostulanteView[]> {
  return mutex.runExclusive(() => {
    const db = loadDb();
    const isAdmin = role === 'admin';
    return db.postulantes.map((p) => ({
      id: p.id,
      documento: isAdmin ? p.documento : maskDocumento(p.documento),
      nombre: p.nombre,
      curso: p.curso,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      documentoAutorizado: isAdmin,
      totalSolicitudes: db.solicitudes.filter((s) => s.postulanteId === p.id).length,
    }));
  });
}

export interface SolicitudesQuery {
  search?: string;
  curso?: string;
  convocatoriaId?: string;
  estado?: string;
  minPromedio?: number;
  maxPromedio?: number;
  sortBy?: 'createdAt' | 'promedio' | 'postulante' | 'estado' | 'ingresoFamiliar';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listSolicitudes(
  role: UserRole,
  query: SolicitudesQuery
): Promise<PaginatedSolicitudesResponse> {
  return mutex.runExclusive(() => {
    const db = loadDb();
    const resumenes = db.convocatorias.map((c) => buildConvocatoriaResumen(c, db.solicitudes));
    const convMap = new Map(resumenes.map((c) => [c.id, c]));
    const postMap = new Map(db.postulantes.map((p) => [p.id, p]));

    const allViews = db.solicitudes.map((s) => buildSolicitudView(s, convMap, postMap, role));
    const cursosSet = new Set(db.postulantes.map((p) => p.curso));

    let filtered = allViews;

    if (query.search && query.search.trim() !== '') {
      const needle = query.search.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        const matchPublic =
          item.id.toLowerCase().includes(needle) ||
          item.postulanteNombre.toLowerCase().includes(needle) ||
          item.postulanteCurso.toLowerCase().includes(needle) ||
          item.convocatoriaNombre.toLowerCase().includes(needle);
        if (role === 'admin') {
          return matchPublic || item.postulanteDocumento.toLowerCase().includes(needle);
        }
        return matchPublic;
      });
    }

    if (query.curso && query.curso !== 'Todos') {
      filtered = filtered.filter((item) => item.postulanteCurso === query.curso);
    }

    if (query.convocatoriaId && query.convocatoriaId !== 'Todas') {
      filtered = filtered.filter((item) => item.convocatoriaId === query.convocatoriaId);
    }

    if (query.estado && query.estado !== 'Todos') {
      filtered = filtered.filter((item) => item.estado === query.estado);
    }

    if (typeof query.minPromedio === 'number' && !Number.isNaN(query.minPromedio)) {
      filtered = filtered.filter((item) => item.promedio >= query.minPromedio!);
    }

    if (typeof query.maxPromedio === 'number' && !Number.isNaN(query.maxPromedio)) {
      filtered = filtered.filter((item) => item.promedio <= query.maxPromedio!);
    }

    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      if (sortBy === 'promedio') {
        return (a.promedio - b.promedio) * sortDir;
      }
      if (sortBy === 'postulante') {
        return a.postulanteNombre.localeCompare(b.postulanteNombre, 'es') * sortDir;
      }
      if (sortBy === 'estado') {
        return a.estado.localeCompare(b.estado, 'es') * sortDir;
      }
      if (sortBy === 'ingresoFamiliar' && role === 'admin') {
        return ((a.ingresoFamiliar ?? 0) - (b.ingresoFamiliar ?? 0)) * sortDir;
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sortDir;
    });

    const total = filtered.length;
    const pageSize = Math.max(1, Math.min(50, Number(query.pageSize) || 6));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.max(1, Math.min(totalPages, Number(query.page) || 1));
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      cursosDisponibles: Array.from(cursosSet).sort((a, b) => a.localeCompare(b, 'es')),
    };
  });
}

export async function listAuditLog(role: UserRole): Promise<{ status: number; body: ApiResponse<AuditEntry[]> }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Acceso denegado: la bitácora administrativa solo está autorizada para el rol Administrador.',
      },
    };
  }
  return mutex.runExclusive(() => {
    const db = loadDb();
    return {
      status: 200,
      body: {
        ok: true,
        code: 'OK',
        rule: 'Control de Acceso por Rol',
        message: 'Bitácora administrativa consultada.',
        data: db.auditLog,
      },
    };
  });
}

export async function createConvocatoria(
  role: UserRole,
  input: { nombre?: string; cupos?: number; apertura?: string; cierre?: string; descripcion?: string }
): Promise<{ status: number; body: ApiResponse<ConvocatoriaResumen> }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: el usuario de consulta no tiene permisos para crear convocatorias.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const db = loadDb();
    const nombre = (input.nombre ?? '').trim();
    const cupos = Number(input.cupos);
    const apertura = (input.apertura ?? '').trim();
    const cierre = (input.cierre ?? '').trim();
    const descripcion = (input.descripcion ?? '').trim();

    if (!nombre) {
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_INPUT',
          rule: 'Datos Obligatorios de Convocatoria',
          message: 'Operación rechazada: el nombre de la convocatoria es obligatorio.',
        },
      };
    }

    if (!Number.isInteger(cupos) || cupos < 1) {
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_QUOTA',
          rule: 'Validación de Cupos',
          message: 'Operación rechazada: la cantidad de cupos debe ser un número entero mayor o igual a 1.',
        },
      };
    }

    const openMs = new Date(apertura).getTime();
    const closeMs = new Date(cierre).getTime();
    if (!apertura || !cierre || Number.isNaN(openMs) || Number.isNaN(closeMs) || openMs >= closeMs) {
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_DATES',
          rule: 'Ventana de Postulación',
          message: 'Operación rechazada: la fecha de apertura debe ser estrictamente anterior a la fecha de cierre.',
        },
      };
    }

    const dupName = db.convocatorias.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (dupName) {
      nextAudit(db, role, 'Alta Convocatoria', 'Convocatoria', 'NUEVA', false, 'Unicidad de Convocatoria', `Rechazada: ya existe "${nombre}".`);
      saveDb(db);
      return {
        status: 409,
        body: {
          ok: false,
          code: 'DUPLICATE_CONVOCATORIA',
          rule: 'Unicidad de Convocatoria',
          message: `Operación rechazada: ya existe una convocatoria registrada con el nombre "${nombre}".`,
        },
      };
    }

    db.counters.conv += 1;
    const now = new Date().toISOString();
    const created: Convocatoria = {
      id: `CONV-2026-${String(db.counters.conv).padStart(2, '0')}`,
      nombre,
      cupos,
      apertura,
      cierre,
      descripcion,
      createdAt: now,
      updatedAt: now,
    };
    db.convocatorias.push(created);
    nextAudit(db, role, 'Alta Convocatoria', 'Convocatoria', created.id, true, 'Alta Validada', `Convocatoria "${nombre}" creada con ${cupos} cupo(s).`);
    saveDb(db);

    return {
      status: 201,
      body: {
        ok: true,
        code: 'CREATED',
        rule: 'Alta de Convocatoria',
        message: `Convocatoria "${created.nombre}" creada correctamente con ${created.cupos} cupo(s) disponibles.`,
        data: buildConvocatoriaResumen(created, db.solicitudes),
      },
    };
  });
}

export async function updateConvocatoria(
  role: UserRole,
  id: string,
  input: { nombre?: string; cupos?: number; apertura?: string; cierre?: string; descripcion?: string }
): Promise<{ status: number; body: ApiResponse<ConvocatoriaResumen> }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: el usuario de consulta no tiene permisos para modificar convocatorias.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const db = loadDb();
    const idx = db.convocatorias.findIndex((c) => c.id === id);
    if (idx === -1) {
      return {
        status: 404,
        body: {
          ok: false,
          code: 'NOT_FOUND',
          rule: 'Existencia de Registro',
          message: `Operación rechazada: no se encontró la convocatoria ${id}.`,
        },
      };
    }

    const existing = db.convocatorias[idx];
    const nombre = input.nombre !== undefined ? input.nombre.trim() : existing.nombre;
    const cupos = input.cupos !== undefined ? Number(input.cupos) : existing.cupos;
    const apertura = input.apertura !== undefined ? input.apertura.trim() : existing.apertura;
    const cierre = input.cierre !== undefined ? input.cierre.trim() : existing.cierre;
    const descripcion = input.descripcion !== undefined ? input.descripcion.trim() : existing.descripcion;

    if (!nombre) {
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_INPUT',
          rule: 'Datos Obligatorios de Convocatoria',
          message: 'Operación rechazada: el nombre de la convocatoria no puede quedar vacío.',
        },
      };
    }

    if (!Number.isInteger(cupos) || cupos < 1) {
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_QUOTA',
          rule: 'Validación de Cupos',
          message: 'Operación rechazada: los cupos deben ser un entero mayor o igual a 1.',
        },
      };
    }

    const aprobadasActuales = db.solicitudes.filter((s) => s.convocatoriaId === id && s.estado === 'Aprobada').length;
    if (cupos < aprobadasActuales) {
      nextAudit(db, role, 'Modificación Convocatoria', 'Convocatoria', id, false, 'Control de Cupos', `Rechazada: cupo propuesto (${cupos}) < aprobadas (${aprobadasActuales}).`);
      saveDb(db);
      return {
        status: 409,
        body: {
          ok: false,
          code: 'QUOTA_BELOW_APPROVED',
          rule: 'Control de Cupos',
          message: `Operación rechazada: no puede reducir el cupo a ${cupos} porque ya existen ${aprobadasActuales} solicitud(es) aprobada(s).`,
        },
      };
    }

    const openMs = new Date(apertura).getTime();
    const closeMs = new Date(cierre).getTime();
    if (Number.isNaN(openMs) || Number.isNaN(closeMs) || openMs >= closeMs) {
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_DATES',
          rule: 'Ventana de Postulación',
          message: 'Operación rechazada: la fecha de apertura debe ser anterior a la fecha de cierre.',
        },
      };
    }

    const dupName = db.convocatorias.some((c) => c.id !== id && c.nombre.toLowerCase() === nombre.toLowerCase());
    if (dupName) {
      return {
        status: 409,
        body: {
          ok: false,
          code: 'DUPLICATE_CONVOCATORIA',
          rule: 'Unicidad de Convocatoria',
          message: `Operación rechazada: ya existe otra convocatoria con el nombre "${nombre}".`,
        },
      };
    }

    const updated: Convocatoria = {
      ...existing,
      nombre,
      cupos,
      apertura,
      cierre,
      descripcion,
      updatedAt: new Date().toISOString(),
    };
    db.convocatorias[idx] = updated;
    nextAudit(db, role, 'Modificación Convocatoria', 'Convocatoria', id, true, 'Modificación Validada', `Convocatoria actualizada (${cupos} cupos).`);
    saveDb(db);

    return {
      status: 200,
      body: {
        ok: true,
        code: 'UPDATED',
        rule: 'Modificación de Convocatoria',
        message: `Convocatoria "${updated.nombre}" actualizada correctamente.`,
        data: buildConvocatoriaResumen(updated, db.solicitudes),
      },
    };
  });
}

export async function deleteConvocatoria(
  role: UserRole,
  id: string
): Promise<{ status: number; body: ApiResponse }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: el usuario de consulta no tiene permisos para eliminar convocatorias.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const db = loadDb();
    const conv = db.convocatorias.find((c) => c.id === id);
    if (!conv) {
      return {
        status: 404,
        body: {
          ok: false,
          code: 'NOT_FOUND',
          rule: 'Existencia de Registro',
          message: `Operación rechazada: no existe la convocatoria ${id}.`,
        },
      };
    }

    const linkedCount = db.solicitudes.filter((s) => s.convocatoriaId === id).length;
    if (linkedCount > 0) {
      nextAudit(db, role, 'Baja Convocatoria', 'Convocatoria', id, false, 'Integridad Referencial', `Rechazada: ${linkedCount} solicitud(es) vinculada(s).`);
      saveDb(db);
      return {
        status: 409,
        body: {
          ok: false,
          code: 'HAS_LINKED_SOLICITUDES',
          rule: 'Integridad Referencial',
          message: `Operación rechazada: la convocatoria "${conv.nombre}" tiene ${linkedCount} solicitud(es) vinculada(s). Debe dar de baja las solicitudes antes de eliminarla.`,
        },
      };
    }

    db.convocatorias = db.convocatorias.filter((c) => c.id !== id);
    nextAudit(db, role, 'Baja Convocatoria', 'Convocatoria', id, true, 'Baja Validada', `Convocatoria "${conv.nombre}" eliminada.`);
    saveDb(db);

    return {
      status: 200,
      body: {
        ok: true,
        code: 'DELETED',
        rule: 'Baja de Convocatoria',
        message: `Convocatoria "${conv.nombre}" eliminada correctamente.`,
      },
    };
  });
}

export async function createPostulante(
  role: UserRole,
  input: { documento?: string; nombre?: string; curso?: string }
): Promise<{ status: number; body: ApiResponse<PostulanteView> }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: el usuario de consulta no tiene permisos para registrar postulantes.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const db = loadDb();
    const documento = (input.documento ?? '').trim();
    const nombre = (input.nombre ?? '').trim();
    const curso = (input.curso ?? '').trim();

    if (!documento || !nombre || !curso) {
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_INPUT',
          rule: 'Datos Obligatorios de Postulante',
          message: 'Operación rechazada: documento, nombre y curso son campos obligatorios.',
        },
      };
    }

    const normalizedDoc = documento.replace(/[\s.-]/g, '').toLowerCase();
    const duplicate = db.postulantes.find(
      (p) => p.documento.replace(/[\s.-]/g, '').toLowerCase() === normalizedDoc
    );
    if (duplicate) {
      nextAudit(db, role, 'Alta Postulante', 'Postulante', documento, false, 'Unicidad de Documento', `Rechazada: documento ${documento} ya registrado (${duplicate.nombre}).`);
      saveDb(db);
      return {
        status: 409,
        body: {
          ok: false,
          code: 'DUPLICATE_DOCUMENTO',
          rule: 'Bloqueo de Duplicados',
          message: `Operación rechazada: ya existe un postulante registrado con el documento ${documento} (${duplicate.nombre}).`,
        },
      };
    }

    db.counters.post += 1;
    const now = new Date().toISOString();
    const created: Postulante = {
      id: `POST-${String(db.counters.post).padStart(3, '0')}`,
      documento,
      nombre,
      curso,
      createdAt: now,
      updatedAt: now,
    };
    db.postulantes.push(created);
    nextAudit(db, role, 'Alta Postulante', 'Postulante', created.id, true, 'Alta Validada', `Postulante "${nombre}" registrado (${curso}).`);
    saveDb(db);

    return {
      status: 201,
      body: {
        ok: true,
        code: 'CREATED',
        rule: 'Alta de Postulante',
        message: `Postulante "${created.nombre}" registrado correctamente (${created.id}).`,
        data: {
          ...created,
          documentoAutorizado: true,
          totalSolicitudes: 0,
        },
      },
    };
  });
}

export async function updatePostulante(
  role: UserRole,
  id: string,
  input: { documento?: string; nombre?: string; curso?: string }
): Promise<{ status: number; body: ApiResponse<PostulanteView> }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: el usuario de consulta no tiene permisos para modificar postulantes.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const db = loadDb();
    const idx = db.postulantes.findIndex((p) => p.id === id);
    if (idx === -1) {
      return {
        status: 404,
        body: {
          ok: false,
          code: 'NOT_FOUND',
          rule: 'Existencia de Registro',
          message: `Operación rechazada: no existe el postulante ${id}.`,
        },
      };
    }

    const existing = db.postulantes[idx];
    const documento = input.documento !== undefined ? input.documento.trim() : existing.documento;
    const nombre = input.nombre !== undefined ? input.nombre.trim() : existing.nombre;
    const curso = input.curso !== undefined ? input.curso.trim() : existing.curso;

    if (!documento || !nombre || !curso) {
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_INPUT',
          rule: 'Datos Obligatorios de Postulante',
          message: 'Operación rechazada: documento, nombre y curso no pueden estar vacíos.',
        },
      };
    }

    const normalizedDoc = documento.replace(/[\s.-]/g, '').toLowerCase();
    const duplicate = db.postulantes.find(
      (p) => p.id !== id && p.documento.replace(/[\s.-]/g, '').toLowerCase() === normalizedDoc
    );
    if (duplicate) {
      return {
        status: 409,
        body: {
          ok: false,
          code: 'DUPLICATE_DOCUMENTO',
          rule: 'Bloqueo de Duplicados',
          message: `Operación rechazada: el documento ${documento} ya pertenece a ${duplicate.nombre}.`,
        },
      };
    }

    const updated: Postulante = {
      ...existing,
      documento,
      nombre,
      curso,
      updatedAt: new Date().toISOString(),
    };
    db.postulantes[idx] = updated;
    nextAudit(db, role, 'Modificación Postulante', 'Postulante', id, true, 'Modificación Validada', `Postulante "${nombre}" actualizado.`);
    saveDb(db);

    return {
      status: 200,
      body: {
        ok: true,
        code: 'UPDATED',
        rule: 'Modificación de Postulante',
        message: `Postulante "${updated.nombre}" actualizado correctamente.`,
        data: {
          ...updated,
          documentoAutorizado: true,
          totalSolicitudes: db.solicitudes.filter((s) => s.postulanteId === id).length,
        },
      },
    };
  });
}

export async function deletePostulante(
  role: UserRole,
  id: string
): Promise<{ status: number; body: ApiResponse }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: el usuario de consulta no tiene permisos para dar de baja postulantes.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const db = loadDb();
    const post = db.postulantes.find((p) => p.id === id);
    if (!post) {
      return {
        status: 404,
        body: {
          ok: false,
          code: 'NOT_FOUND',
          rule: 'Existencia de Registro',
          message: `Operación rechazada: no se encontró el postulante ${id}.`,
        },
      };
    }

    const linked = db.solicitudes.filter((s) => s.postulanteId === id).length;
    if (linked > 0) {
      nextAudit(db, role, 'Baja Postulante', 'Postulante', id, false, 'Integridad Referencial', `Rechazada: posee ${linked} solicitud(es) vinculada(s).`);
      saveDb(db);
      return {
        status: 409,
        body: {
          ok: false,
          code: 'HAS_LINKED_SOLICITUDES',
          rule: 'Integridad Referencial',
          message: `Operación rechazada: "${post.nombre}" tiene ${linked} solicitud(es) registrada(s). Dé de baja sus solicitudes primero.`,
        },
      };
    }

    db.postulantes = db.postulantes.filter((p) => p.id !== id);
    nextAudit(db, role, 'Baja Postulante', 'Postulante', id, true, 'Baja Validada', `Postulante "${post.nombre}" eliminado.`);
    saveDb(db);

    return {
      status: 200,
      body: {
        ok: true,
        code: 'DELETED',
        rule: 'Baja de Postulante',
        message: `Postulante "${post.nombre}" eliminado correctamente.`,
      },
    };
  });
}

export async function createSolicitud(
  role: UserRole,
  input: {
    convocatoriaId?: string;
    postulanteId?: string;
    promedio?: number;
    ingresoFamiliar?: number;
    estado?: SolicitudEstado;
    motivoDecision?: string;
  }
): Promise<{ status: number; body: ApiResponse<SolicitudView> }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: el usuario de consulta no tiene permisos para registrar solicitudes.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const db = loadDb();
    db.counters.lockTicket += 1;
    const lockTicket = db.counters.lockTicket;

    const convocatoriaId = (input.convocatoriaId ?? '').trim();
    const postulanteId = (input.postulanteId ?? '').trim();
    const promedio = Number(input.promedio);
    const ingresoFamiliar = Number(input.ingresoFamiliar);
    const estado: SolicitudEstado = input.estado ?? 'Pendiente';

    const conv = db.convocatorias.find((c) => c.id === convocatoriaId);
    if (!conv) {
      return {
        status: 404,
        body: {
          ok: false,
          code: 'CONVOCATORIA_NOT_FOUND',
          rule: 'Integridad Referencial',
          message: 'Operación rechazada: debe seleccionar una convocatoria existente.',
          lockTicket,
        },
      };
    }

    const post = db.postulantes.find((p) => p.id === postulanteId);
    if (!post) {
      return {
        status: 404,
        body: {
          ok: false,
          code: 'POSTULANTE_NOT_FOUND',
          rule: 'Integridad Referencial',
          message: 'Operación rechazada: debe seleccionar un postulante existente.',
          lockTicket,
        },
      };
    }

    // Rule 1: Validación de promedio entre 1 y 5
    if (!Number.isFinite(promedio) || promedio < 1 || promedio > 5) {
      nextAudit(db, role, 'Alta Solicitud', 'Solicitud', 'NUEVA', false, 'Validación de Promedio', `Rechazada: promedio ${input.promedio} fuera del rango [1.00, 5.00].`);
      saveDb(db);
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_AVERAGE',
          rule: 'Validación de Promedio (1 a 5)',
          message: `Operación rechazada: el promedio ingresado (${input.promedio}) debe estar comprendido entre 1.00 y 5.00.`,
          lockTicket,
        },
      };
    }

    // Rule 2: Validación de ingresos no negativos
    if (!Number.isFinite(ingresoFamiliar) || ingresoFamiliar < 0) {
      nextAudit(db, role, 'Alta Solicitud', 'Solicitud', 'NUEVA', false, 'Validación de Ingresos', `Rechazada: ingreso familiar negativo (${input.ingresoFamiliar}).`);
      saveDb(db);
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_INCOME',
          rule: 'Validación de Ingresos No Negativos',
          message: `Operación rechazada: el ingreso familiar (${input.ingresoFamiliar}) no puede ser negativo.`,
          lockTicket,
        },
      };
    }

    // Rule 3: Bloquear solicitudes fuera de plazo
    const windowState = getWindowState(conv);
    if (!windowState.enPlazo) {
      const reason =
        windowState.estadoPlazo === 'Cerrada'
          ? `la convocatoria "${conv.nombre}" cerró el ${conv.cierre.slice(0, 10)}`
          : `la convocatoria "${conv.nombre}" recién abre el ${conv.apertura.slice(0, 10)}`;
      nextAudit(db, role, 'Alta Solicitud', 'Solicitud', 'NUEVA', false, 'Control de Plazo', `Rechazada fuera de plazo (${windowState.estadoPlazo}) en ${conv.id}.`);
      saveDb(db);
      return {
        status: 422,
        body: {
          ok: false,
          code: 'OUT_OF_WINDOW',
          rule: 'Bloqueo Fuera de Plazo',
          message: `Operación rechazada: solicitud fuera de plazo porque ${reason}.`,
          details: `Ventana habilitada: ${conv.apertura.slice(0, 10)} al ${conv.cierre.slice(0, 10)}.`,
          lockTicket,
        },
      };
    }

    // Rule 4: Bloquear duplicados (mismo postulante + misma convocatoria)
    const dup = db.solicitudes.find(
      (s) => s.convocatoriaId === convocatoriaId && s.postulanteId === postulanteId
    );
    if (dup) {
      nextAudit(db, role, 'Alta Solicitud', 'Solicitud', dup.id, false, 'Bloqueo de Duplicados', `Rechazada: ${post.nombre} ya posee la solicitud ${dup.id} en ${conv.id}.`);
      saveDb(db);
      return {
        status: 409,
        body: {
          ok: false,
          code: 'DUPLICATE_SOLICITUD',
          rule: 'Bloqueo de Duplicados',
          message: `Operación rechazada: ${post.nombre} ya registra una postulación (${dup.id}) en "${conv.nombre}".`,
          lockTicket,
        },
      };
    }

    // Rule 5: Si se intenta crear directamente como Aprobada, verificar cupo
    if (estado === 'Aprobada') {
      const aprobadasActuales = db.solicitudes.filter(
        (s) => s.convocatoriaId === convocatoriaId && s.estado === 'Aprobada'
      ).length;
      if (aprobadasActuales >= conv.cupos) {
        nextAudit(db, role, 'Alta Solicitud (Aprobada)', 'Solicitud', 'NUEVA', false, 'Control de Cupos', `Rechazada: cupos completos (${aprobadasActuales}/${conv.cupos}) en ${conv.id}.`);
        saveDb(db);
        return {
          status: 409,
          body: {
            ok: false,
            code: 'QUOTA_EXCEEDED',
            rule: 'Control de Cupos',
            message: `Operación rechazada: no se puede aprobar porque "${conv.nombre}" completó sus ${conv.cupos} cupo(s) (${aprobadasActuales}/${conv.cupos}). Registre la solicitud como Pendiente.`,
            lockTicket,
          },
        };
      }
    }

    db.counters.sol += 1;
    const now = new Date().toISOString();
    const roundedProm = Math.round(promedio * 100) / 100;
    const defaultMotivo =
      estado === 'Aprobada'
        ? `Aprobada al registrar dentro del cupo disponible.`
        : estado === 'Rechazada'
          ? `Registrada en estado Rechazada.`
          : `Postulación registrada dentro del plazo vigente; pendiente de evaluación.`;

    const created: Solicitud = {
      id: `SOL-${String(db.counters.sol).padStart(4, '0')}`,
      convocatoriaId,
      postulanteId,
      promedio: roundedProm,
      ingresoFamiliar,
      estado,
      motivoDecision: (input.motivoDecision ?? '').trim() || defaultMotivo,
      createdAt: now,
      updatedAt: now,
    };

    db.solicitudes.push(created);
    nextAudit(
      db,
      role,
      'Alta Solicitud',
      'Solicitud',
      created.id,
      true,
      'Alta Validada',
      `Solicitud ${created.id} registrada para ${post.nombre} en ${conv.nombre} (estado: ${created.estado}).`
    );
    saveDb(db);

    const resumenes = db.convocatorias.map((c) => buildConvocatoriaResumen(c, db.solicitudes));
    const convMap = new Map(resumenes.map((c) => [c.id, c]));
    const postMap = new Map(db.postulantes.map((p) => [p.id, p]));

    return {
      status: 201,
      body: {
        ok: true,
        code: 'CREATED',
        rule: 'Alta de Solicitud',
        message: `Solicitud ${created.id} aceptada y registrada en "${conv.nombre}" para ${post.nombre}.`,
        data: buildSolicitudView(created, convMap, postMap, role),
        lockTicket,
      },
    };
  });
}

export async function updateSolicitud(
  role: UserRole,
  id: string,
  input: {
    promedio?: number;
    ingresoFamiliar?: number;
    estado?: SolicitudEstado;
    motivoDecision?: string;
  }
): Promise<{ status: number; body: ApiResponse<SolicitudView> }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: el usuario de consulta no tiene permisos para modificar o evaluar solicitudes.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const db = loadDb();
    db.counters.lockTicket += 1;
    const lockTicket = db.counters.lockTicket;

    const idx = db.solicitudes.findIndex((s) => s.id === id);
    if (idx === -1) {
      return {
        status: 404,
        body: {
          ok: false,
          code: 'NOT_FOUND',
          rule: 'Existencia de Registro',
          message: `Operación rechazada: no existe la solicitud ${id}.`,
          lockTicket,
        },
      };
    }

    const existing = db.solicitudes[idx];
    const conv = db.convocatorias.find((c) => c.id === existing.convocatoriaId);
    const post = db.postulantes.find((p) => p.id === existing.postulanteId);
    if (!conv || !post) {
      return {
        status: 409,
        body: {
          ok: false,
          code: 'INTEGRITY_ERROR',
          rule: 'Integridad Referencial',
          message: 'Operación rechazada: la convocatoria o postulante asociado ya no existe.',
          lockTicket,
        },
      };
    }

    const promedio = input.promedio !== undefined ? Number(input.promedio) : existing.promedio;
    const ingresoFamiliar =
      input.ingresoFamiliar !== undefined ? Number(input.ingresoFamiliar) : existing.ingresoFamiliar;
    const nextEstado: SolicitudEstado = input.estado ?? existing.estado;

    if (!Number.isFinite(promedio) || promedio < 1 || promedio > 5) {
      nextAudit(db, role, 'Modificación Solicitud', 'Solicitud', id, false, 'Validación de Promedio', `Rechazada: promedio ${input.promedio} fuera de [1, 5]. Solicitud preservada.`);
      saveDb(db);
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_AVERAGE',
          rule: 'Validación de Promedio (1 a 5)',
          message: `Operación rechazada: el promedio (${promedio}) debe estar entre 1.00 y 5.00. La solicitud ${id} se mantuvo sin cambios.`,
          solicitudPreserved: true,
          lockTicket,
        },
      };
    }

    if (!Number.isFinite(ingresoFamiliar) || ingresoFamiliar < 0) {
      nextAudit(db, role, 'Modificación Solicitud', 'Solicitud', id, false, 'Validación de Ingresos', `Rechazada: ingreso negativo (${input.ingresoFamiliar}). Solicitud preservada.`);
      saveDb(db);
      return {
        status: 400,
        body: {
          ok: false,
          code: 'INVALID_INCOME',
          rule: 'Validación de Ingresos No Negativos',
          message: `Operación rechazada: el ingreso familiar (${ingresoFamiliar}) no puede ser negativo. La solicitud ${id} se mantuvo sin cambios.`,
          solicitudPreserved: true,
          lockTicket,
        },
      };
    }

    // Critical quota check: approving an application that wasn't already approved
    if (nextEstado === 'Aprobada' && existing.estado !== 'Aprobada') {
      const aprobadasActuales = db.solicitudes.filter(
        (s) => s.convocatoriaId === existing.convocatoriaId && s.estado === 'Aprobada'
      ).length;

      if (aprobadasActuales >= conv.cupos) {
        nextAudit(
          db,
          role,
          'Aprobación Solicitud',
          'Solicitud',
          id,
          false,
          'Control de Cupos',
          `Rechazada aprobación de ${id} (${post.nombre}): cupo completo (${aprobadasActuales}/${conv.cupos}) en "${conv.nombre}". Solicitud conservada en estado ${existing.estado}.`
        );
        saveDb(db);

        const resumenes = db.convocatorias.map((c) => buildConvocatoriaResumen(c, db.solicitudes));
        const convMap = new Map(resumenes.map((c) => [c.id, c]));
        const postMap = new Map(db.postulantes.map((p) => [p.id, p]));

        return {
          status: 409,
          body: {
            ok: false,
            code: 'QUOTA_EXCEEDED',
            rule: 'Control de Cupos',
            message: `Aprobación rechazada: la convocatoria "${conv.nombre}" completó su cupo máximo (${aprobadasActuales}/${conv.cupos}). La solicitud ${id} de ${post.nombre} se conservó intacta en estado "${existing.estado}".`,
            details: `Ticket de serialización #${lockTicket}. Cupos restantes: 0.`,
            data: buildSolicitudView(existing, convMap, postMap, role),
            solicitudPreserved: true,
            lockTicket,
          },
        };
      }
    }

    const roundedProm = Math.round(promedio * 100) / 100;
    let motivoDecision =
      input.motivoDecision !== undefined && input.motivoDecision.trim() !== ''
        ? input.motivoDecision.trim()
        : existing.motivoDecision;

    if (input.estado && input.estado !== existing.estado && (!input.motivoDecision || input.motivoDecision.trim() === '')) {
      if (nextEstado === 'Aprobada') {
        const aprobadasTras =
          db.solicitudes.filter(
            (s) => s.convocatoriaId === existing.convocatoriaId && s.estado === 'Aprobada'
          ).length + 1;
        motivoDecision = `Aprobada dentro de cupo (${aprobadasTras}/${conv.cupos} ocupados).`;
      } else if (nextEstado === 'Rechazada') {
        motivoDecision = `Rechazada por evaluación administrativa.`;
      } else {
        motivoDecision = `Devuelta a estado Pendiente; cupo liberado para reasignación.`;
      }
    }

    const updated: Solicitud = {
      ...existing,
      promedio: roundedProm,
      ingresoFamiliar,
      estado: nextEstado,
      motivoDecision,
      updatedAt: new Date().toISOString(),
    };

    db.solicitudes[idx] = updated;
    nextAudit(
      db,
      role,
      nextEstado !== existing.estado ? `Cambio de Estado (${nextEstado})` : 'Modificación Solicitud',
      'Solicitud',
      id,
      true,
      nextEstado === 'Aprobada' ? 'Control de Cupos' : 'Modificación Validada',
      `Solicitud ${id} (${post.nombre}) actualizada a estado "${nextEstado}".`
    );
    saveDb(db);

    const resumenes = db.convocatorias.map((c) => buildConvocatoriaResumen(c, db.solicitudes));
    const convMap = new Map(resumenes.map((c) => [c.id, c]));
    const postMap = new Map(db.postulantes.map((p) => [p.id, p]));
    const view = buildSolicitudView(updated, convMap, postMap, role);

    return {
      status: 200,
      body: {
        ok: true,
        code: 'UPDATED',
        rule: nextEstado === 'Aprobada' ? 'Control de Cupos' : 'Modificación de Solicitud',
        message:
          nextEstado === 'Aprobada' && existing.estado !== 'Aprobada'
            ? `Solicitud ${id} de ${post.nombre} aprobada (${view.convocatoriaAprobadas}/${view.convocatoriaCupos} cupos ocupados; quedan ${view.convocatoriaRestantes}).`
            : `Solicitud ${id} actualizada correctamente (estado: ${view.estado}).`,
        details: `Ticket de serialización #${lockTicket}.`,
        data: view,
        lockTicket,
      },
    };
  });
}

export async function deleteSolicitud(
  role: UserRole,
  id: string
): Promise<{ status: number; body: ApiResponse }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: el usuario de consulta no tiene permisos para eliminar solicitudes.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const db = loadDb();
    const sol = db.solicitudes.find((s) => s.id === id);
    if (!sol) {
      return {
        status: 404,
        body: {
          ok: false,
          code: 'NOT_FOUND',
          rule: 'Existencia de Registro',
          message: `Operación rechazada: no se encontró la solicitud ${id}.`,
        },
      };
    }

    db.solicitudes = db.solicitudes.filter((s) => s.id !== id);
    nextAudit(
      db,
      role,
      'Baja Solicitud',
      'Solicitud',
      id,
      true,
      'Baja Validada',
      `Solicitud ${id} eliminada${sol.estado === 'Aprobada' ? ' (1 cupo liberado)' : ''}.`
    );
    saveDb(db);

    return {
      status: 200,
      body: {
        ok: true,
        code: 'DELETED',
        rule: 'Baja de Solicitud',
        message: `Solicitud ${id} dada de baja correctamente${sol.estado === 'Aprobada' ? ' y su cupo fue liberado' : ''}.`,
      },
    };
  });
}

export async function resetDemoDatabase(role: UserRole): Promise<{ status: number; body: ApiResponse }> {
  if (role !== 'admin') {
    return {
      status: 403,
      body: {
        ok: false,
        code: 'FORBIDDEN_ROLE',
        rule: 'Control de Acceso por Rol',
        message: 'Operación rechazada: solo el Administrador puede restablecer los datos ficticios iniciales.',
      },
    };
  }

  return mutex.runExclusive(() => {
    const initial = createInitialSeed();
    saveDb(initial);
    return {
      status: 200,
      body: {
        ok: true,
        code: 'RESET',
        rule: 'Restablecimiento de Datos',
        message: 'Base de datos restablecida al conjunto inicial de datos ficticios.',
      },
    };
  });
}
