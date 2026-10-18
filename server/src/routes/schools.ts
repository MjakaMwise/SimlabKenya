import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireAdmin, requireSchool } from '../middleware/auth.js';
import {
  registerSchool, loginSchool, getMe, listStudents, addStudent, addStudentsBulk, updateStudent, deleteStudent,
  changeSchoolPassword, adminListSchools, adminListStudents, adminUpdateSchool, adminDeleteSchool, adminExportCsv,
} from '../controllers/schoolController.js';

const router = Router();

const limiter = (limit: number, message: string) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } });

// Public
router.post('/register', limiter(10, 'Too many registrations from this connection. Please try again later.'), registerSchool);
router.post('/login', limiter(20, 'Too many attempts. Please try again later.'), loginSchool);

// Admin only (declared before the school routes so "/admin" is not read as an id)
router.use('/admin', requireAuth, requireAdmin);
router.get('/admin/list', adminListSchools);
router.get('/admin/export.csv', adminExportCsv);
router.get('/admin/:id/students', adminListStudents);
router.patch('/admin/:id', adminUpdateSchool);
router.delete('/admin/:id', adminDeleteSchool);

// School portal
router.use(requireSchool);
router.get('/me', getMe);
router.post('/change-password', limiter(10, 'Too many attempts. Please try again later.'), changeSchoolPassword);
router.get('/students', listStudents);
router.post('/students', addStudent);
router.post('/students/bulk', addStudentsBulk);
router.patch('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

export default router;
