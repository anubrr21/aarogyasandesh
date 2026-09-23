
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authLimiter, ocrLimiter } from './middleware/rateLimiters.js';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import consentRoutes from './routes/consent.js';
import trustScoreRoutes from './routes/trustScore.js';
import anomalyRoutes from './routes/anomaly.js'
import ivrRoutes from './routes/ivr.js';
import billingRoutes from './routes/billing.js';
import notificationRoutes from './routes/notifications.js'
import doctorRoutes from './routes/doctors.js'
import visitingTimeRoutes from './routes/visitingTime.js'
import insuranceRoutes from './routes/insurance.routes.js'
import visitingPassRoutes from './routes/visitingPass.routes.js'
import medicalReferenceRoutes from './routes/medicalReference.js'
import indiaOpenDataRoutes from './routes/indiaOpenData.js'
import hospitalDirectoryRoutes from './routes/hospitalDirectory.js'


const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/trustscore', trustScoreRoutes);
app.use('/api/ivr', ivrRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/anomaly', ocrLimiter, anomalyRoutes);
app.use('/api/notifications', notificationRoutes)
app.use('/api/doctors', doctorRoutes)
app.use('/api/visiting-time', visitingTimeRoutes)
app.use('/api/insurance', insuranceRoutes)
app.use('/api/visiting-pass', visitingPassRoutes)
app.use('/api/medical-reference', medicalReferenceRoutes)
app.use('/api/india-data', indiaOpenDataRoutes)
app.use('/api/hospital-directory', hospitalDirectoryRoutes)


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  warmDataCaches(PORT);
});

function warmDataCaches(port) {
  const endpoints = [
    '/api/india-data/blood-supply',
    '/api/india-data/health-infrastructure',
    '/api/india-data/air-quality',
    '/api/hospital-directory/pmjay-stats'
  ];
  setTimeout(() => {
    endpoints.forEach((path) => {
      fetch(`http://localhost:${port}${path}`).catch(() => {});
    });
  }, 1000);
}