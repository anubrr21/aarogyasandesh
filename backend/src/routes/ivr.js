import express from 'express';
const router = express.Router();

router.post('/callback', (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="alice">
        Patient is stable. Current bill is 25,000 rupees. 
        Next doctor visit is at 5 PM.
      </Say>
    </Response>`;
  res.set('Content-Type', 'text/xml');
  res.send(twiml);
});

export default router;