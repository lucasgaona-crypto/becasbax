import type {
  ApiResponse,
  AuditEntry,
  ConvocatoriaResumen,
  DashboardSummary,
  PaginatedSolicitudesResponse,
  PostulanteView,
  SolicitudEstado,
  SolicitudView,
  UserRole,
} from '../types';

export interface ApiCallResult<T> {
  status: number;
  body: ApiResponse<T>;
}

async function request<T>(
  url: string,
  role: UserRole,
  options: RequestInit = {}
): Promise<ApiCallResult<T>> {
  const headers = new Headers(options.headers ?? {});
  headers.set('x-user-role', role);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const body = (await res.json()) as ApiResponse<T>;
  return { status: res.status, body };
}

export const api = {
  getDashboard(role: UserRole) {
    return request<DashboardSummary>('/api/dashboard', role);
  },

  getConvocatorias(role: UserRole) {
    return request<ConvocatoriaResumen[]>('/api/convocatorias', role);
  },

  createConvocatoria(
    role: UserRole,
    payload: { nombre: string; cupos: number; apertura: string; cierre: string; descripcion?: string }
  ) {
    return request<ConvocatoriaResumen>('/api/convocatorias', role, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateConvocatoria(
    role: UserRole,
    id: string,
    payload: { nombre: string; cupos: number; apertura: string; cierre: string; descripcion?: string }
  ) {
    return request<ConvocatoriaResumen>(`/api/convocatorias/${encodeURIComponent(id)}`, role, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteConvocatoria(role: UserRole, id: string) {
    return request<void>(`/api/convocatorias/${encodeURIComponent(id)}`, role, {
      method: 'DELETE',
    });
  },

  getPostulantes(role: UserRole) {
    return request<PostulanteView[]>('/api/postulantes', role);
  },

  createPostulante(
    role: UserRole,
    payload: { documento: string; nombre: string; curso: string }
  ) {
    return request<PostulanteView>('/api/postulantes', role, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updatePostulante(
    role: UserRole,
    id: string,
    payload: { documento: string; nombre: string; curso: string }
  ) {
    return request<PostulanteView>(`/api/postulantes/${encodeURIComponent(id)}`, role, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deletePostulante(role: UserRole, id: string) {
    return request<void>(`/api/postulantes/${encodeURIComponent(id)}`, role, {
      method: 'DELETE',
    });
  },

  getSolicitudes(
    role: UserRole,
    params: {
      search?: string;
      curso?: string;
      convocatoriaId?: string;
      estado?: string;
      minPromedio?: string;
      maxPromedio?: string;
      sortBy?: string;
      sortDir?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.curso && params.curso !== 'Todos') qs.set('curso', params.curso);
    if (params.convocatoriaId && params.convocatoriaId !== 'Todas') qs.set('convocatoriaId', params.convocatoriaId);
    if (params.estado && params.estado !== 'Todos') qs.set('estado', params.estado);
    if (params.minPromedio !== undefined && params.minPromedio !== '') qs.set('minPromedio', params.minPromedio);
    if (params.maxPromedio !== undefined && params.maxPromedio !== '') qs.set('maxPromedio', params.maxPromedio);
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortDir) qs.set('sortDir', params.sortDir);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));

    return request<PaginatedSolicitudesResponse>(`/api/solicitudes?${qs.toString()}`, role);
  },

  createSolicitud(
    role: UserRole,
    payload: {
      convocatoriaId: string;
      postulanteId: string;
      promedio: number;
      ingresoFamiliar: number;
      estado?: SolicitudEstado;
      motivoDecision?: string;
    }
  ) {
    return request<SolicitudView>('/api/solicitudes', role, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateSolicitud(
    role: UserRole,
    id: string,
    payload: {
      promedio?: number;
      ingresoFamiliar?: number;
      estado?: SolicitudEstado;
      motivoDecision?: string;
    }
  ) {
    return request<SolicitudView>(`/api/solicitudes/${encodeURIComponent(id)}`, role, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteSolicitud(role: UserRole, id: string) {
    return request<void>(`/api/solicitudes/${encodeURIComponent(id)}`, role, {
      method: 'DELETE',
    });
  },

  getAuditLog(role: UserRole) {
    return request<AuditEntry[]>('/api/audit', role);
  },

  resetDemo(role: UserRole) {
    return request<void>('/api/reset-demo', role, {
      method: 'POST',
    });
  },
};
