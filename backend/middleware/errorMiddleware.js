// Debe registrarse en server.js DESPUÉS de todas las rutas.

export const notFound = (req, res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    error.status = 404;
    next(error);
};

// Handler final de errores (4 parámetros: Express lo reconoce como error
// handler por la firma, no por el nombre). Los controllers ya no necesitan
// try/catch para el camino de error genérico: basta con que estén envueltos
// en asyncHandler (o lancen dentro de un catch que no sepan manejar) y el
// error llega aquí. Los errores de negocio ya conocidos (email duplicado,
// FK inválida con un mensaje específico por recurso, etc.) se siguen
// capturando en el propio controller cuando el mensaje genérico de aquí
// no es suficientemente claro.
export const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "El valor ya existe (debe ser único)" });
    }

    if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW") {
        return res.status(400).json({ message: "Referencia inválida: uno de los recursos relacionados no existe" });
    }

    const status = err.status || err.statusCode;

    // Solo se devuelve err.message al cliente si el propio código fijó un
    // status < 500 a propósito (error "esperado", con mensaje seguro de
    // mostrar). Los 500 no controlados nunca exponen el mensaje interno
    // ni detalles del driver de BD — solo se registran en el log del
    // servidor (console.error de arriba).
    if (status && status < 500) {
        return res.status(status).json({ message: err.message });
    }

    res.status(500).json({ message: "Error interno del servidor" });
};
