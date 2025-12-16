// Custom error class
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erreur interne du serveur';
  let code = err.code || 'INTERNAL_ERROR';

  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      code
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  }

  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Cette ressource existe déjà';
    code = 'DUPLICATE_ENTRY';
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Référence invalide';
    code = 'INVALID_REFERENCE';
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Fichier trop volumineux';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Type de fichier non autorisé';
    }
    code = 'FILE_UPLOAD_ERROR';
  }

  // Send response
  res.status(statusCode).json({
    error: message,
    code,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Async handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
const notFound = (req, res, next) => {
  const error = new AppError(`Route non trouvée: ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFound
};
