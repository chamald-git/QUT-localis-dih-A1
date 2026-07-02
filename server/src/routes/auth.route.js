import { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

/**
 * @what  POST /api/auth/login validates credentials and returns a JWT.
 * @why   The React login page (DIH-37) submits email and password here.
 *        On success the frontend stores the token in AuthContext (memory,
 *        per ADR-0006) and attaches it as a Bearer header on every
 *        subsequent API call.
 * @alternative-considered  A /api/auth/register endpoint was considered
 *        but the client model has admin-created accounts only (DIH-9),
 *        not self-registration.
 * @module-source  IFQ716 Week 7, login route pattern
 */
router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: result.error.issues.map((i) => i.message).join('; ')
      }
    });
  }

  try {
    const { token, user } = await authService.login(result.data.email, result.data.password);

    return res.json({
      success: true,
      data: { token, user }
    });
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' }
      });
    }

    req.log?.error(err, 'login failed');
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' }
    });
  }
});

export default router;
