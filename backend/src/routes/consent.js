import express from 'express';
const router = express.Router();

router.post('/', async (req, res) => {
  const consent = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString(),
    status: 'approved'
  };
  res.status(201).json(consent);
});

export default router;