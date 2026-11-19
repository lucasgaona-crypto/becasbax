import { useEffect, useState } from 'react';
import {
  ArrowDownUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import type {
  ConvocatoriaResumen,
  PaginatedSolicitudesResponse,
  PostulanteView,
  SolicitudEstado,
  SolicitudView,
  UserRole,
} from '../types';
import { formatCurrency, formatDateShort, formatDateTime } from '../utils/format';

export interface SolicitudesFiltersState {
  search: string;
  curso: string;
  convocatoriaId: string;
  estado: string;
  minPromedio: string;
  maxPromedio: string;
  sortBy: 'createdAt' | 'promedio' | 'postulante' | 'estado' | 'ingresoFamiliar';
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

interface SolicitudesViewProps {
  role: UserRole;
  data: PaginatedSolicitudesResponse | null;
  convocatorias: ConvocatoriaResumen[];
  postulantes: PostulanteView[];
  filters: SolicitudesFiltersState;
  loading: boolean;
  onChangeFilters: (next: Partial<SolicitudesFiltersState>) => void;
  onResetFilters: () => void;
  onCreateSolicitud: (payload: {
    convocatoriaId: string;
    postulanteId: string;
    promedio: number;
    ingresoFamiliar: number;
    estado: SolicitudEstado;
    motivoDecision: string;
  }) => Promise<boolean>;
  onUpdateSolicitud: (
    id: string,
    payload: {
      promedio?: number;
      ingresoFamiliar?: number;
      estado?: SolicitudEstado;
      motivoDecision?: string;
    }
  ) => Promise<boolean>;
  onDeleteSolicitud: (id: string) => Promise<void>;
  externalOpenCreateSignal: number;
}

export function SolicitudesView({
  role,
  data,
  convocatorias,
  postulantes,
  filters,
  loading,
  onChangeFilters,
  onResetFilters,
  onCreateSolicitud,
  onUpdateSolicitud,
  onDeleteSolicitud,
  externalOpenCreateSignal,
}: SolicitudesViewProps) {
  const isAdmin = role === 'admin';

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<SolicitudView | null>(null);
  const [detailItem, setDetailItem] = useState<SolicitudView | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formConvId, setFormConvId] = useState('');
  const [formPostId, setFormPostId] = useState('');
  const [formPromedio, setFormPromedio] = useState('4.20');
  const [formIngreso, setFormIngreso] = useState('850000');
  const [formEstado, setFormEstado] = useState<SolicitudEstado>('Pendiente');
  const [formMotivo, setFormMotivo] = useState('');

  const openCreateModal = () => {
    const firstOpen = convocatorias.find((c) => c.enPlazo) ?? convocatorias[0];
    setFormConvId(firstOpen?.id ?? '');
    setFormPostId(postulantes[0]?.id ?? '');
    setFormPromedio('4.25');
    setFormIngreso('900000');
    setFormEstado('Pendiente');
    setFormMotivo('');
    setEditingItem(null);
    setModalMode('create');
  };

  useEffect(() => {
    if (externalOpenCreateSignal > 0 && isAdmin) {
      openCreateModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalOpenCreateSignal]);

  const openEditModal = (item: SolicitudView) => {
    setEditingItem(item);
    setFormConvId(item.convocatoriaId);
    setFormPostId(item.postulanteId);
    setFormPromedio(String(item.promedio));
    setFormIngreso(String(item.ingresoFamiliar ?? 0));
    setFormEstado(item.estado);
    setFormMotivo(item.motivoDecision);
    setModalMode('edit');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const ok = await onCreateSolicitud({
          convocatoriaId: formConvId,
          postulanteId: formPostId,
          promedio: Number(formPromedio),
          ingresoFamiliar: Number(formIngreso),
          estado: formEstado,
          motivoDecision: formMotivo,
        });
        if (ok) setModalMode(null);
      } else if (modalMode === 'edit' && editingItem) {
        const ok = await onUpdateSolicitud(editingItem.id, {
          promedio: Number(formPromedio),
          ingresoFamiliar: Number(formIngreso),
          estado: formEstado,
          motivoDecision: formMotivo,
        });
        if (ok) setModalMode(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.curso !== 'Todos' ||
    filters.convocatoriaId !== 'Todas' ||
    filters.estado !== 'Todos' ||
    filters.minPromedio !== '' ||
    filters.maxPromedio !== '';

  const total = data?.total ?? 0;
  const startIdx = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const endIdx = Math.min(total, filters.page * filters.pageSize);

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Gestión de solicitudes de beca
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Administre postulaciones, evalúe estados y controle cupos en tiempo real.'
              : 'Vista de consulta autorizada: se muestran promedios, convocatorias y estados sin datos económicos sensibles.'}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Registrar solicitud
          </button>
        )}
      </div>

      {/* Combined Search, 5 Filters, Sort & Reset Toolbar */}
      <section
        aria-label="Búsqueda y filtros combinados"
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <label htmlFor="sol-search" className="block text-xs font-medium text-slate-600 mb-1">
              Búsqueda textual
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="sol-search"
                type="text"
                value={filters.search}
                onChange={(e) => onChangeFilters({ search: e.target.value, page: 1 })}
                placeholder={isAdmin ? 'Postulante, documento, ID o beca...' : 'Postulante, ID o convocatoria...'}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          {/* Convocatoria Filter */}
          <div>
            <label htmlFor="sol-conv" className="block text-xs font-medium text-slate-600 mb-1">
              Convocatoria
            </label>
            <select
              id="sol-conv"
              value={filters.convocatoriaId}
              onChange={(e) => onChangeFilters({ convocatoriaId: e.target.value, page: 1 })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
            >
              <option value="Todas">Todas</option>
              {convocatorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Curso Filter */}
          <div>
            <label htmlFor="sol-curso" className="block text-xs font-medium text-slate-600 mb-1">
              Curso
            </label>
            <select
              id="sol-curso"
              value={filters.curso}
              onChange={(e) => onChangeFilters({ curso: e.target.value, page: 1 })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
            >
              <option value="Todos">Todos</option>
              {(data?.cursosDisponibles ?? []).map((curso) => (
                <option key={curso} value={curso}>
                  {curso}
                </option>
              ))}
            </select>
          </div>

          {/* Estado Filter */}
          <div>
            <label htmlFor="sol-estado" className="block text-xs font-medium text-slate-600 mb-1">
              Estado
            </label>
            <select
              id="sol-estado"
              value={filters.estado}
              onChange={(e) => onChangeFilters({ estado: e.target.value, page: 1 })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
            >
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Aprobada">Aprobada</option>
              <option value="Rechazada">Rechazada</option>
            </select>
          </div>

          {/* Average Range */}
          <div>
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Rango de promedio
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                aria-label="Promedio mínimo"
                value={filters.minPromedio}
                onChange={(e) => onChangeFilters({ minPromedio: e.target.value, page: 1 })}
                placeholder="Mín"
                className="w-full px-2.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
              />
              <span className="text-slate-400 text-xs" aria-hidden="true">–</span>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                aria-label="Promedio máximo"
                value={filters.maxPromedio}
                onChange={(e) => onChangeFilters({ maxPromedio: e.target.value, page: 1 })}
                placeholder="Máx"
                className="w-full px-2.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>
        </div>

        {/* Sort + Reset Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="sol-sort" className="text-xs font-medium text-slate-600">
                Ordenar por
              </label>
              <select
                id="sol-sort"
                value={filters.sortBy}
                onChange={(e) =>
                  onChangeFilters({
                    sortBy: e.target.value as SolicitudesFiltersState['sortBy'],
                    page: 1,
                  })
                }
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
              >
                <option value="createdAt">Fecha de creación</option>
                <option value="promedio">Promedio</option>
                <option value="postulante">Postulante</option>
                <option value="estado">Estado</option>
                {isAdmin && <option value="ingresoFamiliar">Ingreso familiar</option>}
              </select>
            </div>

            <button
              type="button"
              onClick={() =>
                onChangeFilters({
                  sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc',
                  page: 1,
                })
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowDownUp className="w-3.5 h-3.5" aria-hidden="true" />
              {filters.sortDir === 'asc' ? 'Ascendente' : 'Descendente'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {total} resultado{total === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={onResetFilters}
              disabled={!hasActiveFilters && filters.sortBy === 'createdAt' && filters.sortDir === 'desc'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Limpiar filtros
            </button>
          </div>
        </div>
      </section>

      {/* Solicitudes Data Grid */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Postulante</th>
                <th className="py-3 px-4">Convocatoria</th>
                <th className="py-3 px-4 text-right">Promedio</th>
                <th className="py-3 px-4 text-right">Ingreso familiar</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Actualización</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && !data ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 text-sm">
                    Cargando solicitudes...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-6 text-center">
                    <p className="text-sm font-medium text-slate-800">
                      No se encontraron solicitudes con los filtros aplicados.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ajuste la búsqueda o limpie los filtros para visualizar todos los registros.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={onResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {item.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{item.postulanteNombre}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span>{item.postulanteCurso}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono">Doc: {item.postulanteDocumento}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900">{item.convocatoriaNombre}</div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        Cupos: {item.convocatoriaAprobadas}/{item.convocatoriaCupos} ({item.convocatoriaRestantes} disp.)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {item.promedio.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {item.ingresoAutorizado ? (
                        formatCurrency(item.ingresoFamiliar)
                      ) : (
                        <span className="text-xs text-slate-400 font-sans">No autorizado</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          item.estado === 'Aprobada'
                            ? 'text-emerald-700'
                            : item.estado === 'Rechazada'
                              ? 'text-red-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {item.estado === 'Aprobada' && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                        {item.estado === 'Rechazada' && <XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                        {item.estado === 'Pendiente' && <Clock className="w-3.5 h-3.5" aria-hidden="true" />}
                        {item.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                      {formatDateShort(item.updatedAt)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          title="Ver detalle y trazabilidad"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          aria-label={`Ver detalle de ${item.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <>
                            {item.estado !== 'Aprobada' && (
                              <button
                                type="button"
                                onClick={() => onUpdateSolicitud(item.id, { estado: 'Aprobada' })}
                                className="px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              >
                                Aprobar
                              </button>
                            )}
                            {item.estado !== 'Rechazada' && (
                              <button
                                type="button"
                                onClick={() => onUpdateSolicitud(item.id, { estado: 'Rechazada' })}
                                className="px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded transition-colors"
                              >
                                Rechazar
                              </button>
                            )}
                            {item.estado !== 'Pendiente' && (
                              <button
                                type="button"
                                onClick={() => onUpdateSolicitud(item.id, { estado: 'Pendiente' })}
                                className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              >
                                Pendiente
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Modificar solicitud"
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              aria-label={`Editar ${item.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {confirmDeleteId === item.id ? (
                              <div className="inline-flex items-center gap-1 ml-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onDeleteSolicitud(item.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                title="Dar de baja solicitud"
                                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                aria-label={`Eliminar ${item.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-mono tabular-nums">
              Mostrando {startIdx}–{endIdx} de {total}
            </span>
            <label className="inline-flex items-center gap-1.5">
              <span>Filas:</span>
              <select
                value={filters.pageSize}
                onChange={(e) => onChangeFilters({ pageSize: Number(e.target.value), page: 1 })}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono tabular-nums"
              >
                <option value={5}>5</option>
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => onChangeFilters({ page: filters.page - 1 })}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none rounded text-slate-700 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Anterior
            </button>

            <span className="px-3 font-mono tabular-nums text-slate-700">
              Página {data?.page ?? 1} de {data?.totalPages ?? 1}
            </span>

            <button
              type="button"
              disabled={!data || filters.page >= data.totalPages}
              onClick={() => onChangeFilters({ page: filters.page + 1 })}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none rounded text-slate-700 font-medium"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Create / Edit Modal (Admin) */}
      {modalMode && isAdmin && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-sol-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="modal-sol-title" className="text-base font-semibold text-slate-900">
                {modalMode === 'create' ? 'Registrar nueva solicitud' : `Modificar solicitud ${editingItem?.id}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div>
                <label htmlFor="form-conv" className="block text-xs font-medium text-slate-700 mb-1">
                  Convocatoria
                </label>
                <select
                  id="form-conv"
                  value={formConvId}
                  disabled={modalMode === 'edit'}
                  onChange={(e) => setFormConvId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md disabled:bg-slate-100 text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  {convocatorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.estadoPlazo} · {c.cuposRestantes}/{c.cupos} cupos disp.)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Las convocatorias cerradas o próximas son bloqueadas por la regla de plazo.
                </p>
              </div>

              <div>
                <label htmlFor="form-post" className="block text-xs font-medium text-slate-700 mb-1">
                  Postulante
                </label>
                <select
                  id="form-post"
                  value={formPostId}
                  disabled={modalMode === 'edit'}
                  onChange={(e) => setFormPostId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md disabled:bg-slate-100 text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  {postulantes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.curso} · Doc {p.documento})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Un mismo postulante no puede duplicar solicitud en la misma convocatoria.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form-prom" className="block text-xs font-medium text-slate-700 mb-1">
                    Promedio (1.00 a 5.00)
                  </label>
                  <input
                    id="form-prom"
                    type="number"
                    step="0.01"
                    value={formPromedio}
                    onChange={(e) => setFormPromedio(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="form-ing" className="block text-xs font-medium text-slate-700 mb-1">
                    Ingreso familiar (&ge; 0)
                  </label>
                  <input
                    id="form-ing"
                    type="number"
                    step="1000"
                    value={formIngreso}
                    onChange={(e) => setFormIngreso(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="form-est" className="block text-xs font-medium text-slate-700 mb-1">
                  Estado de la solicitud
                </label>
                <select
                  id="form-est"
                  value={formEstado}
                  onChange={(e) => setFormEstado(e.target.value as SolicitudEstado)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Aprobada">Aprobada (sujeto a cupo disponible)</option>
                  <option value="Rechazada">Rechazada</option>
                </select>
              </div>

              <div>
                <label htmlFor="form-motivo" className="block text-xs font-medium text-slate-700 mb-1">
                  Observación / Motivo de decisión (opcional)
                </label>
                <textarea
                  id="form-motivo"
                  rows={2}
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  placeholder="Motivo administrativo o nota de evaluación..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md"
                >
                  {submitting ? 'Procesando...' : modalMode === 'create' ? 'Registrar solicitud' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal (Role-aware) */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-detail-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="modal-detail-title" className="text-base font-semibold text-slate-900">
                Detalle de solicitud <span className="font-mono">{detailItem.id}</span>
              </h3>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded"
                aria-label="Cerrar detalle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-xs text-slate-500">Postulante</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{detailItem.postulanteNombre}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Documento</dt>
                  <dd className="font-mono text-slate-900 mt-0.5">{detailItem.postulanteDocumento}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Curso</dt>
                  <dd className="text-slate-900 mt-0.5">{detailItem.postulanteCurso}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Convocatoria</dt>
                  <dd className="text-slate-900 mt-0.5">{detailItem.convocatoriaNombre}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Promedio académico</dt>
                  <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                    {detailItem.promedio.toFixed(2)} / 5.00
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Ingreso familiar</dt>
                  <dd className="font-mono tabular-nums text-slate-900 mt-0.5">
                    {detailItem.ingresoAutorizado ? formatCurrency(detailItem.ingresoFamiliar) : 'No autorizado'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Estado actual</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{detailItem.estado}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Cupos de convocatoria</dt>
                  <dd className="font-mono tabular-nums text-slate-900 mt-0.5">
                    {detailItem.convocatoriaAprobadas}/{detailItem.convocatoriaCupos} ({detailItem.convocatoriaRestantes} disponibles)
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Fecha de creación</dt>
                  <dd className="font-mono tabular-nums text-xs text-slate-700 mt-0.5">
                    {formatDateTime(detailItem.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Última actualización</dt>
                  <dd className="font-mono tabular-nums text-xs text-slate-700 mt-0.5">
                    {formatDateTime(detailItem.updatedAt)}
                  </dd>
                </div>
              </dl>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500">Motivo / Resolución</p>
                <p className="text-sm text-slate-800 mt-1">{detailItem.motivoDecision}</p>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
