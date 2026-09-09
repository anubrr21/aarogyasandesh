import express from 'express';
const router = express.Router();

router.get('/:hospitalId', async (req, res) => {
  const score = {
    overall: 94,
    costAccuracy: 92,
    dischargeAccuracy: 96,
    patientSatisfaction: 88
  };
  res.json(score);
});

export default router;