const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const payload = req[source] || {};
    const { error, value } = schema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    req[source] = value;
    return next();
  };
};

module.exports = validate;
