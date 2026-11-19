import { useState } from 'react';
import { CalendarClock, CheckCircle2, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ConvocatoriaResumen, UserRole } from '../types';
import { formatDateShort, formatDateTime, toLocalDateTimeInput } from '../utils/format';

interface ConvocatoriasViewProps {
  role: UserRole;
  convocatorias: ConvocatoriaResumen[];
  onCreate: (payload: {
    nombre: string;
    cupos: number;
    apertura: string;
    cierre: string;
    descripcion: string;
  }) => Promise<boolean>;
  onUpdate: (
    id: string,
    payload: {
      nombre: string;
      cupos: number;
      apertura: string;
      cierre: string;
      descripcion: string;
    }
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  onFilterSolicitudes: (convocatoriaId: string) => void;
}

export function ConvocatoriasView({
  role,
  convocatorias,
  onCreate,
  onUpdate,
  onDelete,
  onFilterSolicitudes,
}: ConvocatoriasViewProps) {
  const isAdmin = role === 'admin';
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ConvocatoriaResumen | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [nombre, setNombre] = useState('');
  const [cupos, setCupos] = useState('4');
  const [apertura, setApertura] = useState('2026-11-01T00:00');
  const [cierre, setCierre] = useState('2026-12-20T23:59');
  const [descripcion, setDescripcion] = useState('');

  const openCreate = () => {
    setEditing(null);
    setNombre('');
    setCupos('5');
    setApertura('2026-11-15T00:00');
    setCierre('2026-12-30T23:59');
    setDescripcion('');
    setModalMode('create');
  };

  const openEdit = (conv: ConvocatoriaResumen) => {
    setEditing(conv);
    setNombre(conv.nombre);
    setCupos(String(conv.cupos));
    setApertura(toLocalDateTimeInput(conv.apertura));
    setCierre(toLocalDateTimeInput(conv.cierre));
    setDescripcion(conv.descripcion ?? '');
    setModalMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        nombre,
        cupos: Number(cupos),
        apertura,
        cierre,
        descripcion,
      };
      const ok =
        modalMode === 'create'
          ? await onCreate(payload)
          : editing
            ? await onUpdate(editing.id, payload)
            : false;
      if (ok) setModalMode(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Convocatorias de becas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Defina cupos, ventanas de apertura y cierre, y administre el catálogo de becas.'
              : 'Consulta autorizada de convocatorias vigentes, plazos y disponibilidad de cupos.'}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nueva convocatoria
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Apertura — Cierre</th>
                <th className="py-3 px-4">Vigencia</th>
                <th className="py-3 px-4 text-right">Cupos</th>
                <th className="py-3 px-4 text-right">Aprobadas</th>
                <th className="py-3 px-4 text-right">Restantes</th>
                <th className="py-3 px-4">Trazabilidad</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {convocatorias.map((conv) => (
                <tr key={conv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {conv.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => onFilterSolicitudes(conv.id)}
                      className="text-left font-medium text-slate-900 hover:text-blue-700 transition-colors"
                    >
                      {conv.nombre}
                    </button>
                    {conv.descripcion && (
                      <p className="text-xs text-slate-500 mt-0.5 max-w-md truncate">
                        {conv.descripcion}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {formatDateShort(conv.apertura)} — {formatDateShort(conv.cierre)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        conv.estadoPlazo === 'Abierta'
                          ? 'text-emerald-700'
                          : conv.estadoPlazo === 'Cerrada'
                            ? 'text-slate-500'
                            : 'text-amber-700'
                      }`}
                    >
                      {conv.estadoPlazo === 'Abierta' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {conv.estadoPlazo}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900">
                    {conv.cupos}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                    {conv.aprobadas}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold ${
                      conv.cuposRestantes === 0 ? 'text-red-700' : 'text-blue-700'
                    }`}
                  >
                    {conv.cuposRestantes}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                    <div>Alta: {formatDateShort(conv.createdAt)}</div>
                    <div>Act: {formatDateTime(conv.updatedAt)}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onFilterSolicitudes(conv.id)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      >
                        Solicitudes ({conv.recibidas})
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(conv)}
                            title="Editar convocatoria"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            aria-label={`Editar ${conv.nombre}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {confirmDeleteId === conv.id ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDelete(conv.id);
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
                              onClick={() => setConfirmDeleteId(conv.id)}
                              title="Dar de baja convocatoria"
                              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              aria-label={`Eliminar ${conv.nombre}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && isAdmin && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-conv-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="modal-conv-title" className="text-base font-semibold text-slate-900">
                {modalMode === 'create' ? 'Nueva convocatoria' : `Editar ${editing?.id}`}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="conv-nombre" className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre de la convocatoria
                </label>
                <input
                  id="conv-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Beca Innovación Tecnológica 2026"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label htmlFor="conv-cupos" className="block text-xs font-medium text-slate-700 mb-1">
                  Cupos disponibles
                </label>
                <input
                  id="conv-cupos"
                  type="number"
                  value={cupos}
                  onChange={(e) => setCupos(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="conv-ap" className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha de apertura
                  </label>
                  <input
                    id="conv-ap"
                    type="datetime-local"
                    value={apertura}
                    onChange={(e) => setApertura(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="conv-ci" className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha de cierre
                  </label>
                  <input
                    id="conv-ci"
                    type="datetime-local"
                    value={cierre}
                    onChange={(e) => setCierre(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="conv-desc" className="block text-xs font-medium text-slate-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  id="conv-desc"
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
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
                  {submitting ? 'Guardando...' : modalMode === 'create' ? 'Crear convocatoria' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
