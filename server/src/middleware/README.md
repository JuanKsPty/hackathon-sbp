# Perfiles y control de acceso

**Responsable:** Juan

Tres perfiles (`publico`, `analista`, `admin`), cada uno con opciones distintas (entregable 8, lámina 6):

- **Público:** consulta rankings, filtra, ve gráficos y tablas, descarga.
- **Analista:** además compara entidades y períodos y genera reportes personalizados.
- **Administrador:** además carga o actualiza un período, administra parámetros y catálogos y consulta el registro de operaciones.

Los endpoints de administrador responden 403 a los demás perfiles. Si hay usuarios con contraseña, se crean desde variables de entorno: nunca contraseñas en el repo (R5).
