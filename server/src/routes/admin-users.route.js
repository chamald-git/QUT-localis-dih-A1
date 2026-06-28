import { Router } from 'express';
import {
  findAll,
  findById,
  findByEmail,
  create,
  update,
  remove
} from '../repositories/user.repository.js';
import { sendSuccess } from '../utils/respond.js';

const router = Router();

const ALLOWED_ROLES = ['admin', 'government', 'dmo', 'operator'];
const ALLOWED_TIERS = ['full', 'spend-only'];
const ALLOWED_REGIONS = ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'];

/**
 * @what  Validates the shape of a user create or update payload. Returns
 *        an array of error messages, empty when the payload is valid.
 * @why   Centralises the validation rules so create and update share
 *        them. Returning a string array rather than throwing lets the
 *        route handler produce a single 400 with all problems at once,
 *        which is the React form's preferred shape.
 * @alternative-considered express-validator was considered but adding a
 *        new dependency for one route group is heavier than a 40-line
 *        function. The function is also easier to grep at viva.
 * @module-source IFQ716 Week 6, request validation pattern.
 * @param {object} input
 * @param {boolean} isCreate  When true, email and password are required.
 * @returns {string[]}
 */
function validateUserPayload(input, isCreate) {
  const errors = [];

  if (isCreate && (!input.email || typeof input.email !== 'string')) {
    errors.push('email is required');
  }
  if (input.email !== undefined && typeof input.email !== 'string') {
    errors.push('email must be a string');
  }
  if (input.email && !input.email.includes('@')) {
    errors.push('email must contain @');
  }

  if (isCreate && (!input.password || typeof input.password !== 'string')) {
    errors.push('password is required');
  }
  if (input.password !== undefined && input.password.length < 8) {
    errors.push('password must be at least 8 characters');
  }

  if (input.role !== undefined && !ALLOWED_ROLES.includes(input.role)) {
    errors.push(`role must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }

  if (input.tier !== undefined && !ALLOWED_TIERS.includes(input.tier)) {
    errors.push(`tier must be one of: ${ALLOWED_TIERS.join(', ')}`);
  }

  if (input.regions !== undefined) {
    if (!Array.isArray(input.regions)) {
      errors.push('regions must be an array');
    } else {
      const invalid = input.regions.filter((r) => !ALLOWED_REGIONS.includes(r));
      if (invalid.length > 0) {
        errors.push(`invalid regions: ${invalid.join(', ')}`);
      }
    }
  }

  return errors;
}

/**
 * @what  GET /api/admin/users
 *        Returns all users for the admin table.
 * @why   DIH-49 list view. authenticate + roleGuard('admin') applied
 *        at route registration time in routes/index.js, so by the time
 *        this handler runs req.user is guaranteed admin.
 * @module-source IFQ716 Week 7, REST list endpoint.
 */
router.get('/', async (req, res, next) => {
  try {
    const users = await findAll();
    sendSuccess(res, users);
  } catch (err) {
    next(err);
  }
});

/**
 * @what  GET /api/admin/users/:id
 *        Returns a single user by id.
 * @why   DIH-49 read endpoint. Used by the edit form to pre-populate
 *        fields before the admin patches the record.
 * @module-source IFQ716 Week 7, REST read endpoint.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await findById(Number(req.params.id));
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

/**
 * @what  POST /api/admin/users
 *        Creates a new user with admin-supplied password.
 * @why   DIH-49 create endpoint. Validation runs first; duplicate
 *        email check runs before insert to surface a friendly 409
 *        rather than a raw MySQL duplicate key error.
 * @module-source IFQ716 Week 7, REST create endpoint with validation.
 */
router.post('/', async (req, res, next) => {
  try {
    const errors = validateUserPayload(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: errors }
      });
    }

    const existing = await findByEmail(req.body.email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_TAKEN', message: 'A user with that email already exists' }
      });
    }

    const created = await create({
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      regions: req.body.regions || [],
      tier: req.body.tier
    });

    res.status(201);
    sendSuccess(res, created);
  } catch (err) {
    next(err);
  }
});

/**
 * @what  PATCH /api/admin/users/:id
 *        Partial update of email, role, regions, or tier.
 * @why   DIH-49 update endpoint. Password updates intentionally not
 *        supported here; if needed they belong on a dedicated
 *        /api/admin/users/:id/password endpoint to keep audit trails
 *        and validation rules separate.
 * @module-source IFQ716 Week 7, REST partial-update endpoint.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const errors = validateUserPayload(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: errors }
      });
    }

    const existing = await findById(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    if (req.body.email && req.body.email !== existing.email) {
      const dupe = await findByEmail(req.body.email);
      if (dupe) {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_TAKEN', message: 'A user with that email already exists' }
        });
      }
    }

    const updated = await update(Number(req.params.id), req.body);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * @what  DELETE /api/admin/users/:id
 *        Hard-deletes the user row.
 * @why   DIH-49 delete endpoint. Prevents an admin from deleting their
 *        own account to avoid lockout-by-mistake during the demo. A2
 *        future-work will recommend soft delete plus a confirmation
 *        flow that requires typing the user's email.
 * @module-source IFQ716 Week 7, REST delete endpoint.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);

    if (targetId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_DELETE_FORBIDDEN', message: 'You cannot delete your own account' }
      });
    }

    const removed = await remove(targetId);
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;