import express from 'express'
import * as insuranceController from '../controllers/insurance.controller.js'

const router = express.Router()

const authMiddleware = (req, res, next) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  next()
}

const staffAuthMiddleware = (req, res, next) => {
  if (!req.user || !req.user.uid || req.user.token?.role !== 'staff') {
    return res.status(403).json({ success: false, error: 'Forbidden - Staff access required' })
  }
  next()
}

router.use(authMiddleware)

router.get('/', insuranceController.getPolicies)
router.post('/', insuranceController.createPolicy)
router.get('/:policyId', insuranceController.getPolicy)
router.put('/:policyId', insuranceController.updatePolicy)
router.delete('/:policyId', insuranceController.deletePolicy)

router.get('/:policyId/claims', insuranceController.getClaims)
router.post('/:policyId/claims', insuranceController.createClaim)
router.get('/:policyId/claims/:claimId', insuranceController.getClaim)
router.put('/:policyId/claims/:claimId', insuranceController.updateClaim)

router.get('/patient/:patientId/summary', staffAuthMiddleware, insuranceController.getInsuranceSummary)

export default router