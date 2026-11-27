// Endpoints de consulta (públicos para los 3 perfiles). Formatos en contracts/consulta.md.
import { Router } from 'express';
import { encabezado, resumenDePeriodo, filaDeRanking, filaDeSubactividad, calidadDePeriodo, filaExcluida } from './formato.js';
import { periodoPedido, periodosPedidos, rankingPedido, bancoPedido, subactividadPedida, motivoPedido } from './parametros.js';

export function rutasDeConsulta(almacen) {
  const rutas = Router();

  // Períodos cargados, del más antiguo al más reciente.
  rutas.get('/periodos', (req, res) => {
    res.json({
      ...encabezado(),
      ultimo: almacen.ultimaFecha(),
      periodos: almacen.todos().map(resumenDePeriodo),
      // "Todos los períodos": el acumulado de los cortes cargados (null si no hay ninguno).
      acumulado: almacen.todos().length > 0 ? resumenDePeriodo(almacen.acumulado()) : null,
    });
  });

  // Bancos, rankings y subactividades (para llenar los filtros del front).
  rutas.get('/catalogos', (req, res) => {
    const { bancos, macroactividades, subactividadesPorMacro } = almacen.catalogos;
    res.json({
      ...encabezado(),
      bancos: [...bancos].map(([codigo, nombre]) => ({ Codigo_Banco: codigo, Banco: nombre })),
      rankings: macroactividades.map((macro) => ({ Ranking: macro, Subactividades: subactividadesPorMacro.get(macro) })),
    });
  });

  // Rankings de un período (por defecto el último), filtrables por ranking y banco.
  rutas.get('/rankings', (req, res) => {
    const periodo = periodoPedido(almacen, req.query.periodo, { permitirTodos: true });
    const ranking = rankingPedido(almacen, req.query.ranking);
    const banco = bancoPedido(almacen, req.query.banco);
    const rankings = periodo.rankings
      .filter((r) => !ranking || r.ranking === ranking)
      .map((r) => ({
        Ranking: r.ranking,
        bancos: r.filas.filter((f) => !banco || f.codigoBanco === banco).map(filaDeRanking),
      }));
    res.json({ ...encabezado(periodo), rankings });
  });

  // Desglose por subactividad (incluye la reclasificación SB21 a Tarjeta).
  rutas.get('/subactividades', (req, res) => {
    const periodo = periodoPedido(almacen, req.query.periodo, { permitirTodos: true });
    const ranking = rankingPedido(almacen, req.query.ranking);
    const banco = bancoPedido(almacen, req.query.banco);
    const subactividad = subactividadPedida(almacen, req.query.subactividad);
    const subactividades = periodo.desglose
      .filter((d) => (!ranking || d.ranking === ranking) && (!banco || d.codigoBanco === banco))
      .filter((d) => !subactividad || d.subactividad === subactividad)
      .map((d) => filaDeSubactividad(d, almacen.catalogos));
    res.json({ ...encabezado(periodo), subactividades });
  });

  // Calidad: cascada E1-E4, universo válido, alertas y reconciliaciones. Sin ?periodo devuelve todos.
  rutas.get('/calidad', (req, res) => {
    res.json({ ...encabezado(), periodos: periodosPedidos(almacen, req.query.periodo, { acumular: true }).map(calidadDePeriodo) });
  });

  // Exclusión auditable: filas excluidas con su motivo, filtrables por motivo y banco.
  rutas.get('/excluidas', (req, res) => {
    const periodo = periodoPedido(almacen, req.query.periodo, { permitirTodos: true });
    const motivo = motivoPedido(req.query.motivo);
    const banco = bancoPedido(almacen, req.query.banco);
    const excluidas = periodo.excluidas
      .filter((e) => (!motivo || e.motivo === motivo) && (!banco || e.codigoBanco === banco))
      .map(filaExcluida);
    res.json({ ...encabezado(periodo), total: excluidas.length, excluidas });
  });

  return rutas;
}
