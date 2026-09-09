
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
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


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/trustscore', trustScoreRoutes);
app.use('/api/ivr', ivrRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/anomaly', anomalyRoutes);
app.use('/api/notifications', notificationRoutes)
app.use('/api/doctors', doctorRoutes)
app.use('/api/visiting-time', visitingTimeRoutes)
app.use('/api/insurance', insuranceRoutes)
app.use('/api/visiting-pass', visitingPassRoutes)


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});