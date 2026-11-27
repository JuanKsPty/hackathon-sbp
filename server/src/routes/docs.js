// Documentación de la API pública (#9): /api/openapi.json y Swagger UI en /api/docs.
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { crearDocumentoOpenApi } from '../docs/openapi.js';

export function rutasDeDocumentacion(almacen) {
  const rutas = Router();
  const documento = crearDocumentoOpenApi(almacen.catalogos);

  rutas.get('/openapi.json', (req, res) => res.json(documento));
  rutas.use('/docs', swaggerUi.serve, swaggerUi.setup(documento, { customSiteTitle: 'API rankings de crédito · SBP 2026' }));
  return rutas;
}
