// Envuelve un controller async para que cualquier error que lance (o cuya
// promesa rechace) llegue a errorMiddleware.js vía next(), sin necesidad de
// repetir try/catch en cada controller.
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
