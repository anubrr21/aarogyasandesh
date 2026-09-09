import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
  res.json([
    { id: '1', name: 'Patient 1', status: 'active' },
    { id: '2', name: 'Patient 2', status: 'discharged' }
  ]);
});

router.post('/', async (req, res) => {
  const patient = { id: Date.now().toString(), ...req.body };
  res.status(201).json(patient);
});

router.put('/:id', async (req, res) => {
  res.json({ success: true, message: 'Patient updated' });
});

export default router;