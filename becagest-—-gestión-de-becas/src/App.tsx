import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { api } from './api/client';
import { ConvocatoriasView } from './components/ConvocatoriasView';
import { FeedbackBanner, type FeedbackState } from './components/FeedbackBanner';
import { PanelControl } from './components/PanelControl';
import { PostulantesView } from './components/PostulantesView';
import { PruebasView } from './components/PruebasView';
import { SolicitudesView, type SolicitudesFiltersState } from './components/SolicitudesView';
import type {
  ApiResponse,
  AuditEntry,
  ConvocatoriaResumen,
  DashboardSummary,
  PaginatedSolicitudesResponse,
  PostulanteView,
  SolicitudEstado,
  UserRole,
} from './types';

type ActiveTab = 'panel' | 'solicitudes' | 'convocatorias' | 'postulantes' | 'pruebas';

const DEFAULT_FILTERS: SolicitudesFiltersState = {
  search: '',
  curso: 'Todos',
  convocatoriaId: 'Todas',
  estado: 'Todos',
  minPromedio: '',
  maxPromedio: '',
  sortBy: 'createdAt',
  sortDir: 'desc',
  page: 1,
  pageSize: 6,
};

export default function App() {
  const [role, setRole] = useState<UserRole>('admin');
  const [activeTab, setActiveTab] = useState<ActiveTab>('panel');

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaResumen[]>([]);
  const [postulantes, setPostulantes] = useState<PostulanteView[]>([]);
  const [solicitudesData, setSolicitudesData] = useState<PaginatedSolicitudesResponse | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const [filters, setFilters] = useState<SolicitudesFiltersState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [openCreateSignal, setOpenCreateSignal] = useState(0);

  const pushFeedback = useCallback((status: number, body: ApiResponse<unknown>) => {
    setFeedback({
      ok: body.ok,
      httpStatus: status,
      rule: body.rule,
      message: body.message,
      details: body.details,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const loadSolicitudes = useCallback(
    async (currentRole: UserRole, currentFilters: SolicitudesFiltersState) => {
      const res = await api.getSolicitudes(currentRole, currentFilters);
      if (res.body.ok && res.body.data) {
        setSolicitudesData(res.body.data);
      }
    },
    []
  );

  const loadAll = useCallback(
    async (currentRole: UserRole, currentFilters: SolicitudesFiltersState) => {
      setLoading(true);
      try {
        const [dashRes, convRes, postRes, solRes] = await Promise.all([
          api.getDashboard(currentRole),
          api.getConvocatorias(currentRole),
          api.getPostulantes(currentRole),
          api.getSolicitudes(currentRole, currentFilters),
        ]);

        if (dashRes.body.ok && dashRes.body.data) setDashboard(dashRes.body.data);
        if (convRes.body.ok && convRes.body.data) setConvocatorias(convRes.body.data);
        if (postRes.body.ok && postRes.body.data) setPostulantes(postRes.body.data);
        if (solRes.body.ok && solRes.body.data) setSolicitudesData(solRes.body.data);

        if (currentRole === 'admin') {
          const auditRes = await api.getAuditLog(currentRole);
          if (auditRes.body.ok && auditRes.body.data) {
            setAuditLog(auditRes.body.data);
          }
        } else {
          setAuditLog([]);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadAll(role, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    void loadSolicitudes(role, filters);
  }, [role, filters, loadSolicitudes]);

  const handleRoleChange = (nextRole: UserRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setFilters((prev) => ({
      ...prev,
      sortBy: prev.sortBy === 'ingresoFamiliar' && nextRole === 'consulta' ? 'createdAt' : prev.sortBy,
      page: 1,
    }));
    setFeedback({
      ok: true,
      httpStatus: 200,
      rule: 'Cambio de Sesión y Autorización',
      message:
        nextRole === 'admin'
          ? 'Sesión activa como Administrador: acceso completo de operación y datos económicos.'
          : 'Sesión activa como Usuario de Consulta: solo lectura sobre información autorizada (ingresos y documentos completos protegidos).',
      timestamp: new Date().toISOString(),
    });
  };

  const handleChangeFilters = (next: Partial<SolicitudesFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Convocatoria Handlers
  const handleCreateConvocatoria = async (payload: {
    nombre: string;
    cupos: number;
    apertura: string;
    cierre: string;
    descripcion: string;
  }) => {
    const res = await api.createConvocatoria(role, payload);
    pushFeedback(res.status, res.body);
    if (res.body.ok) {
      await loadAll(role, filters);
      return true;
    }
    return false;
  };

  const handleUpdateConvocatoria = async (
    id: string,
    payload: {
      nombre: string;
      cupos: number;
      apertura: string;
      cierre: string;
      descripcion: string;
    }
  ) => {
    const res = await api.updateConvocatoria(role, id, payload);
    pushFeedback(res.status, res.body);
    if (res.body.ok) {
      await loadAll(role, filters);
      return true;
    }
    return false;
  };

  const handleDeleteConvocatoria = async (id: string) => {
    const res = await api.deleteConvocatoria(role, id);
    pushFeedback(res.status, res.body);
    await loadAll(role, filters);
  };

  // Postulante Handlers
  const handleCreatePostulante = async (payload: {
    documento: string;
    nombre: string;
    curso: string;
  }) => {
    const res = await api.createPostulante(role, payload);
    pushFeedback(res.status, res.body);
    if (res.body.ok) {
      await loadAll(role, filters);
      return true;
    }
    return false;
  };

  const handleUpdatePostulante = async (
    id: string,
    payload: { documento: string; nombre: string; curso: string }
  ) => {
    const res = await api.updatePostulante(role, id, payload);
    pushFeedback(res.status, res.body);
    if (res.body.ok) {
      await loadAll(role, filters);
      return true;
    }
    return false;
  };

  const handleDeletePostulante = async (id: string) => {
    const res = await api.deletePostulante(role, id);
    pushFeedback(res.status, res.body);
    await loadAll(role, filters);
  };

  // Solicitud Handlers
  const handleCreateSolicitud = async (payload: {
    convocatoriaId: string;
    postulanteId: string;
    promedio: number;
    ingresoFamiliar: number;
    estado: SolicitudEstado;
    motivoDecision: string;
  }) => {
    const res = await api.createSolicitud(role, payload);
    pushFeedback(res.status, res.body);
    if (res.body.ok) {
      await loadAll(role, filters);
      return true;
    }
    await loadAll(role, filters);
    return false;
  };

  const handleUpdateSolicitud = async (
    id: string,
    payload: {
      promedio?: number;
      ingresoFamiliar?: number;
      estado?: SolicitudEstado;
      motivoDecision?: string;
    }
  ) => {
    const res = await api.updateSolicitud(role, id, payload);
    pushFeedback(res.status, res.body);
    await loadAll(role, filters);
    return res.body.ok;
  };

  const handleDeleteSolicitud = async (id: string) => {
    const res = await api.deleteSolicitud(role, id);
    pushFeedback(res.status, res.body);
    await loadAll(role, filters);
  };

  const handleResetDemo = async () => {
    const res = await api.resetDemo(role);
    pushFeedback(res.status, res.body);
    if (res.body.ok) {
      setFilters(DEFAULT_FILTERS);
      await loadAll(role, DEFAULT_FILTERS);
    }
  };

  const navigateToConvocatoriaSolicitudes = (convocatoriaId: string) => {
    setFilters((prev) => ({
      ...prev,
      convocatoriaId,
      page: 1,
    }));
    setActiveTab('solicitudes');
  };

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'panel', label: 'Panel' },
    { id: 'solicitudes', label: 'Solicitudes' },
    { id: 'convocatorias', label: 'Convocatorias' },
    { id: 'postulantes', label: 'Postulantes' },
    { id: 'pruebas', label: 'Pruebas' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('panel')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700 rounded"
          >
            BecaGest
          </button>

          <nav aria-label="Navegación principal" className="flex items-center gap-6 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700 ${
                    isActive
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('solicitudes');
                if (role === 'admin') {
                  setOpenCreateSignal((n) => n + 1);
                }
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              {role === 'admin' ? 'Nueva solicitud' : 'Consultar becas'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Workspace Toolbar: Role Selector & Context */}
        <section
          aria-label="Control de sesión y perfil"
          className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-base font-semibold text-slate-900 text-balance">
              Administración de postulaciones y asignaciones de becas
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {role === 'admin'
                ? 'Modo Administrador · Alta, consulta, modificación, baja y aprobación de cupos habilitadas.'
                : 'Modo Usuario de Consulta · Lectura autorizada únicamente (sin edición ni visualización de ingresos o documentos completos).'}
            </p>
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0"
            role="group"
            aria-label="Selector de rol"
          >
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                role === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              Administrador
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('consulta')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                role === 'consulta'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              Usuario de consulta
            </button>
          </div>
        </section>

        {/* Explicit Operation Feedback Banner */}
        <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

        {/* Active View */}
        {activeTab === 'panel' && (
          <PanelControl
            summary={dashboard}
            auditLog={auditLog}
            role={role}
            loading={loading}
            onNavigateConvocatoria={navigateToConvocatoriaSolicitudes}
          />
        )}

        {activeTab === 'solicitudes' && (
          <SolicitudesView
            role={role}
            data={solicitudesData}
            convocatorias={convocatorias}
            postulantes={postulantes}
            filters={filters}
            loading={loading}
            onChangeFilters={handleChangeFilters}
            onResetFilters={handleResetFilters}
            onCreateSolicitud={handleCreateSolicitud}
            onUpdateSolicitud={handleUpdateSolicitud}
            onDeleteSolicitud={handleDeleteSolicitud}
            externalOpenCreateSignal={openCreateSignal}
          />
        )}

        {activeTab === 'convocatorias' && (
          <ConvocatoriasView
            role={role}
            convocatorias={convocatorias}
            onCreate={handleCreateConvocatoria}
            onUpdate={handleUpdateConvocatoria}
            onDelete={handleDeleteConvocatoria}
            onFilterSolicitudes={navigateToConvocatoriaSolicitudes}
          />
        )}

        {activeTab === 'postulantes' && (
          <PostulantesView
            role={role}
            postulantes={postulantes}
            onCreate={handleCreatePostulante}
            onUpdate={handleUpdatePostulante}
            onDelete={handleDeletePostulante}
          />
        )}

        {activeTab === 'pruebas' && (
          <PruebasView
            role={role}
            onAfterRun={() => loadAll(role, filters)}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>BecaGest · Datos ficticios de demostración</span>
          <span>Reglas activas: unicidad, ventana de plazo, promedio [1–5], ingreso &ge; 0 y control atómico de cupos</span>
        </div>
      </footer>
    </div>
  );
}
