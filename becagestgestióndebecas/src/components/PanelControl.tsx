import { CalendarClock, CheckCircle2, Lock, XCircle } from 'lucide-react';
import type { AuditEntry, DashboardSummary, UserRole } from '../types';
import { formatDateShort, formatDateTime } from '../utils/format';

interface PanelControlProps {
  summary: DashboardSummary | null;
  auditLog: AuditEntry[];
  role: UserRole;
  loading: boolean;
  onNavigateConvocatoria: (convocatoriaId: string) => void;
}

export function PanelControl({
  summary,
  auditLog,
  role,
  loading,
  onNavigateConvocatoria,
}: PanelControlProps) {
  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-6 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 h-64 animate-pulse" />
      </div>
    );
  }

  if (!summary) return null;

  const tasaAprobacion =
    summary.totalRecibidas > 0
      ? Math.round((summary.totalAprobadas / summary.totalRecibidas) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Primary KPI Strip */}
      <section aria-label="Indicadores principales">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-sm font-medium text-slate-600">Solicitudes recibidas</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2 font-mono tabular-nums">
              {summary.totalRecibidas}
            </p>
            <p className="text-xs text-slate-500 mt-3 tabular-nums">
              {summary.totalPendientes} pendientes <span aria-hidden="true">·</span> {summary.totalRechazadas} rechazadas
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-sm font-medium text-slate-600">Solicitudes aprobadas</p>
            <p className="text-3xl font-semibold text-emerald-700 mt-2 font-mono tabular-nums">
              {summary.totalAprobadas}
            </p>
            <p className="text-xs text-slate-500 mt-3 tabular-nums">
              {tasaAprobacion}% del total recibido <span aria-hidden="true">·</span> {summary.totalPostulantes} postulantes
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-sm font-medium text-slate-600">Cupos restantes</p>
            <p className="text-3xl font-semibold text-blue-700 mt-2 font-mono tabular-nums">
              {summary.cuposRestantes}
            </p>
            <p className="text-xs text-slate-500 mt-3 tabular-nums">
              de {summary.cuposTotales} cupos totales <span aria-hidden="true">·</span> {summary.convocatoriasActivas} convocatorias abiertas
            </p>
          </div>
        </div>
      </section>

      {/* Quota Breakdown per Convocatoria */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Disponibilidad de cupos por convocatoria
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seguimiento de solicitudes recibidas, aprobaciones asignadas y saldo de cupos habilitados.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {summary.convocatorias.length} convocatorias registradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-6">Convocatoria</th>
                <th className="py-3 px-4">Vigencia</th>
                <th className="py-3 px-4">Plazo</th>
                <th className="py-3 px-4 text-right">Recibidas</th>
                <th className="py-3 px-4 text-right">Aprobadas</th>
                <th className="py-3 px-4 text-right">Cupos</th>
                <th className="py-3 px-4 text-right">Restantes</th>
                <th className="py-3 px-6 w-44">Ocupación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {summary.convocatorias.map((conv) => {
                const ratio = conv.cupos > 0 ? Math.min(100, Math.round((conv.aprobadas / conv.cupos) * 100)) : 0;
                const full = conv.cuposRestantes === 0;
                return (
                  <tr key={conv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6">
                      <button
                        type="button"
                        onClick={() => onNavigateConvocatoria(conv.id)}
                        className="text-left font-medium text-slate-900 hover:text-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 rounded"
                      >
                        {conv.nombre}
                      </button>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{conv.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
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
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {conv.recibidas}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-emerald-700">
                      {conv.aprobadas}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {conv.cupos}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold ${
                        full ? 'text-red-700' : 'text-blue-700'
                      }`}
                    >
                      {conv.cuposRestantes}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${
                              full ? 'bg-red-600' : 'bg-blue-700'
                            }`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono tabular-nums text-slate-600 w-9 text-right">
                          {ratio}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Operational Audit Log (Admin) or Authorization Notice (Consulta) */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Registro de decisiones y reglas evaluadas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Trazabilidad de operaciones aceptadas y rechazadas en el servidor.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {role === 'admin' ? 'Acceso completo de administrador' : 'Acceso restringido'}
          </span>
        </div>

        {role !== 'admin' ? (
          <div className="px-6 py-8 flex items-center gap-3 text-sm text-slate-600">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span>
              La bitácora operativa interna y los datos socioeconómicos sensibles están restringidos al perfil Administrador. El usuario de consulta solo visualiza convocatorias, resultados autorizados y promedios académicos.
            </span>
          </div>
        ) : auditLog.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-500">
            No hay movimientos registrados todavía.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {auditLog.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {entry.accepted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-900">{entry.action}</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.rule}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{entry.entityId}</span>
                    </div>
                    <p className="text-slate-700 text-sm mt-0.5">{entry.message}</p>
                  </div>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                  {formatDateTime(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
