const Joi = require('joi');

const userSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role_id: Joi.number().integer().positive().required(),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const financeRecordSchema = Joi.object({
  amount: Joi.number().positive().required(),
  type: Joi.string().valid('income', 'expense').required(),
  category_id: Joi.number().integer().positive().required(),
  date: Joi.date().iso().required(),
  description: Joi.string().max(500).allow('')
});

const financeRecordUpdateSchema = Joi.object({
  amount: Joi.number().positive(),
  type: Joi.string().valid('income', 'expense'),
  category_id: Joi.number().integer().positive(),
  date: Joi.date().iso(),
  description: Joi.string().max(500).allow('')
}).min(1);

const categorySchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  type: Joi.string().valid('income', 'expense').required()
});

const filterSchema = Joi.object({
  start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('start_date must be in YYYY-MM-DD format'),
  end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('end_date must be in YYYY-MM-DD format'),
  type: Joi.string().valid('income', 'expense'),
  category_id: Joi.number().integer().positive(),
  limit: Joi.number().integer().positive().max(100).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    req.validatedBody = value;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Query validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    req.validatedQuery = value;
    next();
  };
}

module.exports = {
  validate,
  validateQuery,
  userSchema,
  loginSchema,
  financeRecordSchema,
  financeRecordUpdateSchema,
  categorySchema,
  filterSchema
};
