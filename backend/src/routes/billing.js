import express from 'express';
const router = express.Router();

router.post('/check-anomaly', async (req, res) => {
  const { item, amount } = req.body;
  const reference = {
    'blood test': 500,
    'x-ray': 800,
    'mri': 3000,
    'ct scan': 2500,
    'surgery': 50000,
    'icu bed': 5000,
    'general ward': 1500,
    'medicine': 200
  };

  const expected = reference[item.toLowerCase()] || 1000;
  const percentage = ((amount - expected) / expected) * 100;
  const isAnomaly = Math.abs(percentage) > 30;

  res.json({
    item,
    amount,
    expected,
    percentage: Math.round(percentage),
    isAnomaly,
    status: isAnomaly ? (percentage > 0 ? 'high' : 'low') : 'normal'
  });
});

export default router;