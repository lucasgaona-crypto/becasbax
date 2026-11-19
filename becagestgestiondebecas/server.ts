import express from 'express';
import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import {
  createConvocatoria,
  createPostulante,
  createSolicitud,
  deleteConvocatoria,
  deletePostulante,
  deleteSolicitud,
  getDashboardSummary,
  listAuditLog,
  listConvocatorias,
  listPostulantes,
  listSolicitudes,
  resetDemoDatabase,
  updateConvocatoria,
  updatePostulante,
  updateSolicitud,
} from './server/db.ts';
import type { UserRole } from './src/types.ts';

function resolveRole(req: Request): UserRole {
  const headerRole = String(req.header('x-user-role') ?? '').trim().toLowerCase();
  return headerRole === 'admin' ? 'admin' : 'consulta';
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, status: 'ready' });
  });

  app.get('/api/dashboard', async (_req: Request, res: Response) => {
    const data = await getDashboardSummary();
    res.json({
      ok: true,
      code: 'OK',
      rule: 'Panel de Control',
      message: 'Resumen actualizado.',
      data,
    });
  });

  // Convocatorias CRUD
  app.get('/api/convocatorias', async (_req: Request, res: Response) => {
    const data = await listConvocatorias();
    res.json({
      ok: true,
      code: 'OK',
      rule: 'Consulta de Convocatorias',
      message: `${data.length} convocatorias consultadas.`,
      data,
    });
  });

  app.post('/api/convocatorias', async (req: Request, res: Response) => {
    const result = await createConvocatoria(resolveRole(req), req.body ?? {});
    res.status(result.status).json(result.body);
  });

  app.put('/api/convocatorias/:id', async (req: Request, res: Response) => {
    const result = await updateConvocatoria(resolveRole(req), String(req.params.id), req.body ?? {});
    res.status(result.status).json(result.body);
  });

  app.delete('/api/convocatorias/:id', async (req: Request, res: Response) => {
    const result = await deleteConvocatoria(resolveRole(req), String(req.params.id));
    res.status(result.status).json(result.body);
  });

  // Postulantes CRUD
  app.get('/api/postulantes', async (req: Request, res: Response) => {
    const role = resolveRole(req);
    const data = await listPostulantes(role);
    res.json({
      ok: true,
      code: 'OK',
      rule: 'Consulta de Postulantes',
      message:
        role === 'admin'
          ? `${data.length} postulantes consultados con acceso completo.`
          : `${data.length} postulantes consultados (documentos protegidos para rol Consulta).`,
      data,
    });
  });

  app.post('/api/postulantes', async (req: Request, res: Response) => {
    const result = await createPostulante(resolveRole(req), req.body ?? {});
    res.status(result.status).json(result.body);
  });

  app.put('/api/postulantes/:id', async (req: Request, res: Response) => {
    const result = await updatePostulante(resolveRole(req), String(req.params.id), req.body ?? {});
    res.status(result.status).json(result.body);
  });

  app.delete('/api/postulantes/:id', async (req: Request, res: Response) => {
    const result = await deletePostulante(resolveRole(req), String(req.params.id));
    res.status(result.status).json(result.body);
  });

  // Solicitudes CRUD + Filters/Sort/Pagination
  app.get('/api/solicitudes', async (req: Request, res: Response) => {
    const role = resolveRole(req);
    const minP = req.query.minPromedio !== undefined && req.query.minPromedio !== ''
      ? Number(req.query.minPromedio)
      : undefined;
    const maxP = req.query.maxPromedio !== undefined && req.query.maxPromedio !== ''
      ? Number(req.query.maxPromedio)
      : undefined;

    const sortByRaw = String(req.query.sortBy ?? 'createdAt');
    const sortBy =
      sortByRaw === 'promedio' ||
      sortByRaw === 'postulante' ||
      sortByRaw === 'estado' ||
      sortByRaw === 'ingresoFamiliar'
        ? sortByRaw
        : 'createdAt';

    const data = await listSolicitudes(role, {
      search: String(req.query.search ?? ''),
      curso: String(req.query.curso ?? 'Todos'),
      convocatoriaId: String(req.query.convocatoriaId ?? 'Todas'),
      estado: String(req.query.estado ?? 'Todos'),
      minPromedio: minP,
      maxPromedio: maxP,
      sortBy,
      sortDir: String(req.query.sortDir ?? 'desc') === 'asc' ? 'asc' : 'desc',
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 6),
    });

    res.json({
      ok: true,
      code: 'OK',
      rule: 'Consulta de Solicitudes',
      message: `${data.total} solicitud(es) coincidente(s).`,
      data,
    });
  });

  app.post('/api/solicitudes', async (req: Request, res: Response) => {
    const result = await createSolicitud(resolveRole(req), req.body ?? {});
    res.status(result.status).json(result.body);
  });

  app.patch('/api/solicitudes/:id', async (req: Request, res: Response) => {
    const result = await updateSolicitud(resolveRole(req), String(req.params.id), req.body ?? {});
    res.status(result.status).json(result.body);
  });

  app.put('/api/solicitudes/:id', async (req: Request, res: Response) => {
    const result = await updateSolicitud(resolveRole(req), String(req.params.id), req.body ?? {});
    res.status(result.status).json(result.body);
  });

  app.delete('/api/solicitudes/:id', async (req: Request, res: Response) => {
    const result = await deleteSolicitud(resolveRole(req), String(req.params.id));
    res.status(result.status).json(result.body);
  });

  app.get('/api/audit', async (req: Request, res: Response) => {
    const result = await listAuditLog(resolveRole(req));
    res.status(result.status).json(result.body);
  });

  app.post('/api/reset-demo', async (req: Request, res: Response) => {
    const result = await resetDemoDatabase(resolveRole(req));
    res.status(result.status).json(result.body);
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build no encontrado.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BecaGest server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
