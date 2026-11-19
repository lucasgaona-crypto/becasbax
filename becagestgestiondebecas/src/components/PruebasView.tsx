import { useState } from 'react';
import { CheckCircle2, Play, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { api } from '../api/client';
import type { UserRole } from '../types';

interface TestRow {
  caso: string;
  entradas: string;
  esperado: string;
  obtenido: string;
  httpStatus: number;
  cumple: boolean;
}

interface PruebasViewProps {
  role: UserRole;
  onAfterRun: () => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export function PruebasView({ role, onAfterRun, onResetDemo }: PruebasViewProps) {
  const isAdmin = role === 'admin';
  const [runningSuite, setRunningSuite] = useState<'quota' | 'concurrency' | 'rules' | null>(null);
  const [quotaResults, setQuotaResults] = useState<TestRow[]>([]);
  const [concurrencyResults, setConcurrencyResults] = useState<TestRow[]>([]);
  const [rulesResults, setRulesResults] = useState<TestRow[]>([]);
  const [suiteError, setSuiteError] = useState<string | null>(null);

  // Suite A: Fill quotas (cupos = 2) and reject 3rd approval without losing the application
  const runQuotaTest = async () => {
    setRunningSuite('quota');
    setSuiteError(null);
    const tag = Date.now().toString().slice(-5);
    const rows: TestRow[] = [];

    try {
      const convRes = await api.createConvocatoria('admin', {
        nombre: `Prueba Cupo Lleno ${tag}`,
        cupos: 2,
        apertura: '2026-01-01T00:00:00',
        cierre: '2027-12-31T23:59:59',
        descripcion: 'Convocatoria controlada para prueba individual obligatoria de cupos.',
      });

      if (!convRes.body.ok || !convRes.body.data) {
        setSuiteError(convRes.body.message);
        return;
      }
      const conv = convRes.body.data;

      rows.push({
        caso: '1. Alta convocatoria de prueba',
        entradas: `nombre="${conv.nombre}", cupos=2, plazo abierto`,
        esperado: 'HTTP 201 · Convocatoria creada con 2 cupos',
        obtenido: convRes.body.message,
        httpStatus: convRes.status,
        cumple: convRes.status === 201 && conv.cupos === 2,
      });

      const postIds: string[] = [];
      for (let i = 1; i <= 3; i += 1) {
        const pRes = await api.createPostulante('admin', {
          documento: `99.${tag}.${i}`,
          nombre: `Postulante Prueba ${tag}-${i}`,
          curso: '3° Ingeniería Informática',
        });
        if (!pRes.body.ok || !pRes.body.data) {
          setSuiteError(pRes.body.message);
          return;
        }
        postIds.push(pRes.body.data.id);
      }

      const solIds: string[] = [];
      for (let i = 0; i < 3; i += 1) {
        const sRes = await api.createSolicitud('admin', {
          convocatoriaId: conv.id,
          postulanteId: postIds[i],
          promedio: Number((4.8 - i * 0.2).toFixed(2)),
          ingresoFamiliar: 750000 + i * 100000,
          estado: 'Pendiente',
        });
        if (!sRes.body.ok || !sRes.body.data) {
          setSuiteError(sRes.body.message);
          return;
        }
        solIds.push(sRes.body.data.id);
      }

      rows.push({
        caso: '2. Registro de 3 solicitudes pendientes',
        entradas: `3 solicitudes en ${conv.id} (promedios 4.80, 4.60, 4.40)`,
        esperado: 'HTTP 201 · 3 solicitudes en estado Pendiente',
        obtenido: `Registradas ${solIds.join(', ')} en estado Pendiente`,
        httpStatus: 201,
        cumple: solIds.length === 3,
      });

      const ap1 = await api.updateSolicitud('admin', solIds[0], { estado: 'Aprobada' });
      rows.push({
        caso: '3. Aprobación solicitud #1 (1/2 cupos)',
        entradas: `PATCH /api/solicitudes/${solIds[0]} { estado: "Aprobada" }`,
        esperado: 'HTTP 200 · Aceptada, 1 cupo restante',
        obtenido: ap1.body.message,
        httpStatus: ap1.status,
        cumple: ap1.status === 200 && ap1.body.data?.estado === 'Aprobada',
      });

      const ap2 = await api.updateSolicitud('admin', solIds[1], { estado: 'Aprobada' });
      rows.push({
        caso: '4. Aprobación solicitud #2 (2/2 cupos llenos)',
        entradas: `PATCH /api/solicitudes/${solIds[1]} { estado: "Aprobada" }`,
        esperado: 'HTTP 200 · Aceptada, 0 cupos restantes',
        obtenido: ap2.body.message,
        httpStatus: ap2.status,
        cumple: ap2.status === 200 && ap2.body.data?.estado === 'Aprobada',
      });

      const ap3 = await api.updateSolicitud('admin', solIds[2], { estado: 'Aprobada' });
      rows.push({
        caso: '5. Intento de aprobación #3 con cupo completo',
        entradas: `PATCH /api/solicitudes/${solIds[2]} { estado: "Aprobada" }`,
        esperado: 'HTTP 409 · Rechazada por cupo completo sin perder solicitud',
        obtenido: ap3.body.message,
        httpStatus: ap3.status,
        cumple: ap3.status === 409 && ap3.body.solicitudPreserved === true,
      });

      const verifyRes = await api.getSolicitudes('admin', {
        convocatoriaId: conv.id,
        pageSize: 20,
      });
      const preserved = verifyRes.body.data?.items.find((item) => item.id === solIds[2]);
      const approvedCount =
        verifyRes.body.data?.items.filter((item) => item.estado === 'Aprobada').length ?? -1;

      rows.push({
        caso: '6. Verificación de integridad tras rechazo',
        entradas: `GET /api/solicitudes?convocatoriaId=${conv.id}`,
        esperado: `3 solicitudes existentes, 2 aprobadas, ${solIds[2]} intacta en Pendiente`,
        obtenido: `Total=${verifyRes.body.data?.total}, Aprobadas=${approvedCount}, Estado(${solIds[2]})=${preserved?.estado ?? 'NO ENCONTRADA'}`,
        httpStatus: verifyRes.status,
        cumple:
          verifyRes.body.data?.total === 3 &&
          approvedCount === 2 &&
          preserved?.estado === 'Pendiente',
      });

      setQuotaResults(rows);
      await onAfterRun();
    } catch (err) {
      setSuiteError(err instanceof Error ? err.message : 'Error ejecutando la prueba.');
    } finally {
      setRunningSuite(null);
    }
  };

  // Suite B: Concurrency race test on last remaining quota using Promise.all
  const runConcurrencyTest = async () => {
    setRunningSuite('concurrency');
    setSuiteError(null);
    const tag = Date.now().toString().slice(-5);
    const rows: TestRow[] = [];

    try {
      const convRes = await api.createConvocatoria('admin', {
        nombre: `Prueba Concurrencia ${tag}`,
        cupos: 1,
        apertura: '2026-01-01T00:00:00',
        cierre: '2027-12-31T23:59:59',
        descripcion: 'Convocatoria con 1 cupo para demostrar exclusión mutua ante solicitudes paralelas.',
      });

      if (!convRes.body.ok || !convRes.body.data) {
        setSuiteError(convRes.body.message);
        return;
      }
      const conv = convRes.body.data;

      const pA = await api.createPostulante('admin', {
        documento: `88.${tag}.1`,
        nombre: `Concurrente Alfa ${tag}`,
        curso: '2° Ingeniería Civil',
      });
      const pB = await api.createPostulante('admin', {
        documento: `88.${tag}.2`,
        nombre: `Concurrente Beta ${tag}`,
        curso: '2° Ingeniería Civil',
      });

      if (!pA.body.data || !pB.body.data) {
        setSuiteError('No se pudieron crear los postulantes de prueba.');
        return;
      }

      const sA = await api.createSolicitud('admin', {
        convocatoriaId: conv.id,
        postulanteId: pA.body.data.id,
        promedio: 4.75,
        ingresoFamiliar: 620000,
        estado: 'Pendiente',
      });
      const sB = await api.createSolicitud('admin', {
        convocatoriaId: conv.id,
        postulanteId: pB.body.data.id,
        promedio: 4.75,
        ingresoFamiliar: 620000,
        estado: 'Pendiente',
      });

      if (!sA.body.data || !sB.body.data) {
        setSuiteError('No se pudieron crear las solicitudes de prueba.');
        return;
      }

      const idA = sA.body.data.id;
      const idB = sB.body.data.id;

      rows.push({
        caso: '1. Escenario inicial (1 cupo disponible)',
        entradas: `Convocatoria ${conv.id} (cupos=1), solicitudes ${idA} y ${idB} en Pendiente`,
        esperado: 'Cupo restante = 1; ambas solicitudes listas para competir',
        obtenido: `Cupo=1, ${idA} (Pendiente) y ${idB} (Pendiente)`,
        httpStatus: 201,
        cumple: true,
      });

      // Fire BOTH approval requests simultaneously with Promise.all
      const [resA, resB] = await Promise.all([
        api.updateSolicitud('admin', idA, { estado: 'Aprobada' }),
        api.updateSolicitud('admin', idB, { estado: 'Aprobada' }),
      ]);

      rows.push({
        caso: `2a. Petición paralela #1 (${idA})`,
        entradas: `Promise.all → PATCH /api/solicitudes/${idA} { estado: "Aprobada" }`,
        esperado: '1 petición HTTP 200 y 1 petición HTTP 409',
        obtenido: `Ticket #${resA.body.lockTicket ?? '?'} · ${resA.body.message}`,
        httpStatus: resA.status,
        cumple: resA.status === 200 || resA.status === 409,
      });

      rows.push({
        caso: `2b. Petición paralela #2 (${idB})`,
        entradas: `Promise.all → PATCH /api/solicitudes/${idB} { estado: "Aprobada" }`,
        esperado: 'Complementaria a #1 (exclusión mutua en servidor)',
        obtenido: `Ticket #${resB.body.lockTicket ?? '?'} · ${resB.body.message}`,
        httpStatus: resB.status,
        cumple: resB.status === 200 || resB.status === 409,
      });

      const verifyRes = await api.getSolicitudes('admin', {
        convocatoriaId: conv.id,
        pageSize: 10,
      });
      const items = verifyRes.body.data?.items ?? [];
      const approvedCount = items.filter((i) => i.estado === 'Aprobada').length;
      const pendingCount = items.filter((i) => i.estado === 'Pendiente').length;
      const oneOkOneConflict =
        (resA.status === 200 && resB.status === 409) ||
        (resA.status === 409 && resB.status === 200);

      rows.push({
        caso: '3. Invariante de cupo y conservación post-concurrencia',
        entradas: `GET /api/solicitudes?convocatoriaId=${conv.id}`,
        esperado: 'Exactamente 1 Aprobada (<= 1 cupo) y 1 Pendiente conservada',
        obtenido: `Aprobadas=${approvedCount}, Pendientes=${pendingCount}, Status=[${resA.status}, ${resB.status}]`,
        httpStatus: verifyRes.status,
        cumple: oneOkOneConflict && approvedCount === 1 && pendingCount === 1,
      });

      setConcurrencyResults(rows);
      await onAfterRun();
    } catch (err) {
      setSuiteError(err instanceof Error ? err.message : 'Error ejecutando prueba de concurrencia.');
    } finally {
      setRunningSuite(null);
    }
  };

  // Suite C: Business rules & Role access checks
  const runRulesTest = async () => {
    setRunningSuite('rules');
    setSuiteError(null);
    const rows: TestRow[] = [];

    try {
      const convs = await api.getConvocatorias('admin');
      const posts = await api.getPostulantes('admin');
      const openConv = convs.body.data?.find((c) => c.enPlazo);
      const closedConv = convs.body.data?.find((c) => c.estadoPlazo === 'Cerrada');
      const anyPost = posts.body.data?.[0];

      if (!openConv || !closedConv || !anyPost) {
        setSuiteError('Se requieren convocatorias abiertas, cerradas y al menos un postulante.');
        return;
      }

      // 1. Invalid average
      const rAvg = await api.createSolicitud('admin', {
        convocatoriaId: openConv.id,
        postulanteId: anyPost.id,
        promedio: 5.4,
        ingresoFamiliar: 500000,
      });
      rows.push({
        caso: 'Promedio fuera de rango (> 5)',
        entradas: `promedio=5.40 en ${openConv.id}`,
        esperado: 'HTTP 400 · Rechazo por promedio fuera de [1, 5]',
        obtenido: rAvg.body.message,
        httpStatus: rAvg.status,
        cumple: rAvg.status === 400 && rAvg.body.code === 'INVALID_AVERAGE',
      });

      // 2. Negative income
      const rInc = await api.createSolicitud('admin', {
        convocatoriaId: openConv.id,
        postulanteId: anyPost.id,
        promedio: 4.1,
        ingresoFamiliar: -15000,
      });
      rows.push({
        caso: 'Ingreso familiar negativo',
        entradas: `ingresoFamiliar=-15000 en ${openConv.id}`,
        esperado: 'HTTP 400 · Rechazo por ingreso negativo',
        obtenido: rInc.body.message,
        httpStatus: rInc.status,
        cumple: rInc.status === 400 && rInc.body.code === 'INVALID_INCOME',
      });

      // 3. Out of window
      const rWin = await api.createSolicitud('admin', {
        convocatoriaId: closedConv.id,
        postulanteId: anyPost.id,
        promedio: 4.5,
        ingresoFamiliar: 700000,
      });
      rows.push({
        caso: 'Solicitud fuera de plazo (convocatoria cerrada)',
        entradas: `convocatoriaId=${closedConv.id} (cierre ${closedConv.cierre.slice(0, 10)})`,
        esperado: 'HTTP 422 · Rechazo por ventana cerrada',
        obtenido: rWin.body.message,
        httpStatus: rWin.status,
        cumple: rWin.status === 422 && rWin.body.code === 'OUT_OF_WINDOW',
      });

      // 4. Duplicate solicitud
      const dupTarget = (await api.getSolicitudes('admin', { convocatoriaId: openConv.id, pageSize: 1 }))
        .body.data?.items[0];
      if (dupTarget) {
        const rDup = await api.createSolicitud('admin', {
          convocatoriaId: dupTarget.convocatoriaId,
          postulanteId: dupTarget.postulanteId,
          promedio: 4.2,
          ingresoFamiliar: 800000,
        });
        rows.push({
          caso: 'Bloqueo de solicitud duplicada',
          entradas: `convocatoria=${dupTarget.convocatoriaId}, postulante=${dupTarget.postulanteId}`,
          esperado: 'HTTP 409 · Rechazo por duplicado',
          obtenido: rDup.body.message,
          httpStatus: rDup.status,
          cumple: rDup.status === 409 && rDup.body.code === 'DUPLICATE_SOLICITUD',
        });
      }

      // 5. Role Consulta attempting mutation + checking redaction
      const rRoleWrite = await api.createSolicitud('consulta', {
        convocatoriaId: openConv.id,
        postulanteId: anyPost.id,
        promedio: 4.5,
        ingresoFamiliar: 500000,
      });
      const rRoleRead = await api.getSolicitudes('consulta', { pageSize: 1 });
      const firstConsultaItem = rRoleRead.body.data?.items[0];
      const redactedOk =
        firstConsultaItem !== undefined &&
        firstConsultaItem.ingresoFamiliar === null &&
        firstConsultaItem.ingresoAutorizado === false;

      rows.push({
        caso: 'Restricción de escritura y redacción de datos para rol Consulta',
        entradas: `POST /api/solicitudes (x-user-role: consulta) + GET /api/solicitudes`,
        esperado: 'HTTP 403 en escritura + ingresoFamiliar=null en lectura',
        obtenido: `${rRoleWrite.body.message} | ingresoFamiliar=${String(firstConsultaItem?.ingresoFamiliar)}`,
        httpStatus: rRoleWrite.status,
        cumple: rRoleWrite.status === 403 && redactedOk,
      });

      setRulesResults(rows);
      await onAfterRun();
    } catch (err) {
      setSuiteError(err instanceof Error ? err.message : 'Error ejecutando validaciones.');
    } finally {
      setRunningSuite(null);
    }
  };

  const renderResultTable = (rows: TestRow[]) => {
    if (rows.length === 0) return null;
    return (
      <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-4">Paso / Caso</th>
                <th className="py-2.5 px-4">Entradas</th>
                <th className="py-2.5 px-4">Resultado esperado</th>
                <th className="py-2.5 px-4">Resultado obtenido</th>
                <th className="py-2.5 px-4 text-right">HTTP</th>
                <th className="py-2.5 px-4 text-right">Veredicto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-medium text-slate-900">{row.caso}</td>
                  <td className="py-3 px-4 font-mono text-slate-600 max-w-xs">{row.entradas}</td>
                  <td className="py-3 px-4 text-slate-700">{row.esperado}</td>
                  <td className="py-3 px-4 text-slate-800 max-w-sm">{row.obtenido}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {row.httpStatus}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        row.cumple ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {row.cumple ? (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {row.cumple ? 'CUMPLE' : 'FALLA'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Pruebas obligatorias de cupo, concurrencia y reglas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ejecute verificaciones reales contra los endpoints del servidor y documente entradas y resultados.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={onResetDemo}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Restablecer datos ficticios iniciales
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-slate-800">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <span>
            Para ejecutar las pruebas de escritura y concurrencia, cambie el perfil activo a <strong>Administrador</strong> en la barra superior de espacio de trabajo.
          </span>
        </div>
      )}

      {suiteError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          {suiteError}
        </div>
      )}

      {/* Test 1: Mandatory Quota Fill & Reject Extra Approval */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h3 className="text-base font-semibold text-slate-900">
              01. Prueba individual obligatoria: completar cupos y rechazar aprobación adicional sin pérdida
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Crea una convocatoria con 2 cupos y 3 solicitudes pendientes. Aprueba las dos primeras para completar el cupo (2/2), intenta aprobar la tercera y verifica que el servidor rechaza la operación con HTTP 409 mientras la solicitud permanece intacta en estado Pendiente.
            </p>
          </div>
          <button
            type="button"
            disabled={!isAdmin || runningSuite !== null}
            onClick={runQuotaTest}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            {runningSuite === 'quota' ? 'Ejecutando...' : 'Ejecutar prueba de cupos'}
          </button>
        </div>

        {renderResultTable(quotaResults)}
      </section>

      {/* Test 2: Concurrency with Promise.all */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h3 className="text-base font-semibold text-slate-900">
              02. Prueba de concurrencia por último cupo disponible
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Prepara una convocatoria con 1 único cupo disponible y 2 solicitudes pendientes. Envía ambas aprobaciones en paralelo mediante <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">Promise.all</code> para demostrar que la exclusión mutua del servidor serializa las peticiones (tickets secuenciales), aprueba exactamente 1 y rechaza la segunda sin sobrepasar el cupo.
            </p>
          </div>
          <button
            type="button"
            disabled={!isAdmin || runningSuite !== null}
            onClick={runConcurrencyTest}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            {runningSuite === 'concurrency' ? 'Ejecutando...' : 'Ejecutar prueba de concurrencia'}
          </button>
        </div>

        {renderResultTable(concurrencyResults)}
      </section>

      {/* Test 3: Rules & Role Access */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h3 className="text-base font-semibold text-slate-900">
              03. Verificación de validaciones, plazos, duplicados y control de acceso por rol
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Comprueba el rechazo ante promedio fuera de [1, 5], ingreso negativo, postulación fuera de plazo, solicitud duplicada y restricción de escritura/datos sensibles para el usuario de consulta.
            </p>
          </div>
          <button
            type="button"
            disabled={!isAdmin || runningSuite !== null}
            onClick={runRulesTest}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            {runningSuite === 'rules' ? 'Ejecutando...' : 'Verificar reglas y roles'}
          </button>
        </div>

        {renderResultTable(rulesResults)}
      </section>
    </div>
  );
}
