export type UserRole = 'admin' | 'consulta';

export type SolicitudEstado = 'Pendiente' | 'Aprobada' | 'Rechazada';

export interface Convocatoria {
  id: string;
  nombre: string;
  cupos: number;
  apertura: string;
  cierre: string;
  descripcion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConvocatoriaResumen extends Convocatoria {
  recibidas: number;
  aprobadas: number;
  pendientes: number;
  rechazadas: number;
  cuposRestantes: number;
  estadoPlazo: 'Abierta' | 'Cerrada' | 'Próxima';
  enPlazo: boolean;
}

export interface Postulante {
  id: string;
  documento: string;
  nombre: string;
  curso: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostulanteView extends Postulante {
  documentoAutorizado: boolean;
  totalSolicitudes: number;
}

export interface Solicitud {
  id: string;
  convocatoriaId: string;
  postulanteId: string;
  promedio: number;
  ingresoFamiliar: number;
  estado: SolicitudEstado;
  motivoDecision: string;
  createdAt: string;
  updatedAt: string;
}

export interface SolicitudView {
  id: string;
  convocatoriaId: string;
  postulanteId: string;
  promedio: number;
  ingresoFamiliar: number | null;
  ingresoAutorizado: boolean;
  estado: SolicitudEstado;
  motivoDecision: string;
  createdAt: string;
  updatedAt: string;
  convocatoriaNombre: string;
  convocatoriaCupos: number;
  convocatoriaAprobadas: number;
  convocatoriaRestantes: number;
  convocatoriaEnPlazo: boolean;
  postulanteNombre: string;
  postulanteDocumento: string;
  postulanteCurso: string;
}

export interface DashboardSummary {
  totalRecibidas: number;
  totalAprobadas: number;
  totalPendientes: number;
  totalRechazadas: number;
  cuposTotales: number;
  cuposRestantes: number;
  convocatoriasActivas: number;
  totalPostulantes: number;
  convocatorias: ConvocatoriaResumen[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  action: string;
  entity: 'Convocatoria' | 'Postulante' | 'Solicitud' | 'Sistema';
  entityId: string;
  accepted: boolean;
  rule: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  code: string;
  rule: string;
  message: string;
  details?: string;
  data?: T;
  solicitudPreserved?: boolean;
  lockTicket?: number;
}

export interface PaginatedSolicitudesResponse {
  items: SolicitudView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  cursosDisponibles: string[];
}
