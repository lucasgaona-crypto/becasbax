import { useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { PostulanteView, UserRole } from '../types';
import { formatDateShort, formatDateTime } from '../utils/format';

interface PostulantesViewProps {
  role: UserRole;
  postulantes: PostulanteView[];
  onCreate: (payload: { documento: string; nombre: string; curso: string }) => Promise<boolean>;
  onUpdate: (
    id: string,
    payload: { documento: string; nombre: string; curso: string }
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

export function PostulantesView({
  role,
  postulantes,
  onCreate,
  onUpdate,
  onDelete,
}: PostulantesViewProps) {
  const isAdmin = role === 'admin';
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<PostulanteView | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [documento, setDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [curso, setCurso] = useState('');

  const filtered = postulantes.filter((p) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.curso.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (isAdmin && p.documento.toLowerCase().includes(q))
    );
  });

  const openCreate = () => {
    setEditing(null);
    setDocumento('');
    setNombre('');
    setCurso('');
    setModalMode('create');
  };

  const openEdit = (p: PostulanteView) => {
    setEditing(p);
    setDocumento(p.documento);
    setNombre(p.nombre);
    setCurso(p.curso);
    setModalMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ok =
        modalMode === 'create'
          ? await onCreate({ documento, nombre, curso })
          : editing
            ? await onUpdate(editing.id, { documento, nombre, curso })
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
            Padrón de postulantes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Alta, modificación y baja de postulantes con validación de documento único.'
              : 'Vista de consulta autorizada: los números de documento completos están protegidos.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o curso..."
              className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 w-64"
            />
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nuevo postulante
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Nombre completo</th>
                <th className="py-3 px-4">Curso</th>
                <th className="py-3 px-4 text-right">Solicitudes</th>
                <th className="py-3 px-4">Creación / Act.</th>
                {isAdmin && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-slate-500">
                    No se encontraron postulantes coincidentes.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {p.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-800 whitespace-nowrap">
                      {p.documento}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {p.nombre}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{p.curso}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {p.totalSolicitudes}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      <div>Alta: {formatDateShort(p.createdAt)}</div>
                      <div>Act: {formatDateTime(p.updatedAt)}</div>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            title="Modificar postulante"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            aria-label={`Editar ${p.nombre}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {confirmDeleteId === p.id ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDelete(p.id);
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
                              onClick={() => setConfirmDeleteId(p.id)}
                              title="Dar de baja postulante"
                              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              aria-label={`Eliminar ${p.nombre}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && isAdmin && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-post-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="modal-post-title" className="text-base font-semibold text-slate-900">
                {modalMode === 'create' ? 'Registrar postulante' : `Modificar ${editing?.id}`}
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
                <label htmlFor="post-doc" className="block text-xs font-medium text-slate-700 mb-1">
                  Documento de identidad (único)
                </label>
                <input
                  id="post-doc"
                  type="text"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  placeholder="Ej: 46.890.123"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label htmlFor="post-nom" className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre completo
                </label>
                <input
                  id="post-nom"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Mariana López Pereyra"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label htmlFor="post-cur" className="block text-xs font-medium text-slate-700 mb-1">
                  Curso / Carrera
                </label>
                <input
                  id="post-cur"
                  type="text"
                  value={curso}
                  onChange={(e) => setCurso(e.target.value)}
                  placeholder="Ej: 2° Ingeniería Informática"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-700"
                  required
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
                  {submitting ? 'Guardando...' : modalMode === 'create' ? 'Registrar postulante' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
