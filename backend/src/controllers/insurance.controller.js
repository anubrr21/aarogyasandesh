import * as insuranceService from '../services/insurance.service.js'

export const getPolicies = async (req, res) => {
  try {
    const userId = req.user.uid
    const policies = await insuranceService.getPolicies(userId)
    const maskedPolicies = policies.map(p => ({
      ...p,
      policyNumber: p.policyNumber ? `XXXX-XXXX-${p.policyNumber.slice(-4)}` : null
    }))
    res.json({ success: true, policies: maskedPolicies })
  } catch (error) {
    console.error('Get policies error:', error)
    res.status(500).json({ success: false, error: 'Failed to get policies' })
  }
}

export const getPolicy = async (req, res) => {
  try {
    const userId = req.user.uid
    const { policyId } = req.params
    const policy = await insuranceService.getPolicyById(userId, policyId)
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' })
    }
    res.json({ success: true, policy })
  } catch (error) {
    console.error('Get policy error:', error)
    res.status(500).json({ success: false, error: 'Failed to get policy' })
  }
}

export const createPolicy = async (req, res) => {
  try {
    const userId = req.user.uid
    const policyData = req.body
    const policy = await insuranceService.createPolicy(userId, policyData)
    res.json({ success: true, policy })
  } catch (error) {
    console.error('Create policy error:', error)
    res.status(500).json({ success: false, error: 'Failed to create policy' })
  }
}

export const updatePolicy = async (req, res) => {
  try {
    const userId = req.user.uid
    const { policyId } = req.params
    const policyData = req.body
    const policy = await insuranceService.updatePolicy(userId, policyId, policyData)
    res.json({ success: true, policy })
  } catch (error) {
    console.error('Update policy error:', error)
    res.status(500).json({ success: false, error: 'Failed to update policy' })
  }
}

export const deletePolicy = async (req, res) => {
  try {
    const userId = req.user.uid
    const { policyId } = req.params
    await insuranceService.deletePolicy(userId, policyId)
    res.json({ success: true })
  } catch (error) {
    console.error('Delete policy error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete policy' })
  }
}

export const getClaims = async (req, res) => {
  try {
    const userId = req.user.uid
    const { policyId } = req.params
    const claims = await insuranceService.getClaims(userId, policyId)
    res.json({ success: true, claims })
  } catch (error) {
    console.error('Get claims error:', error)
    res.status(500).json({ success: false, error: 'Failed to get claims' })
  }
}

export const getClaim = async (req, res) => {
  try {
    const userId = req.user.uid
    const { policyId, claimId } = req.params
    const claim = await insuranceService.getClaimById(userId, policyId, claimId)
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' })
    }
    res.json({ success: true, claim })
  } catch (error) {
    console.error('Get claim error:', error)
    res.status(500).json({ success: false, error: 'Failed to get claim' })
  }
}

export const createClaim = async (req, res) => {
  try {
    const userId = req.user.uid
    const { policyId } = req.params
    const claimData = req.body
    const claim = await insuranceService.createClaim(userId, policyId, claimData)
    res.json({ success: true, claim })
  } catch (error) {
    console.error('Create claim error:', error)
    res.status(500).json({ success: false, error: 'Failed to create claim' })
  }
}

export const updateClaim = async (req, res) => {
  try {
    const userId = req.user.uid
    const { policyId, claimId } = req.params
    const claimData = req.body
    const claim = await insuranceService.updateClaim(userId, policyId, claimId, claimData)
    res.json({ success: true, claim })
  } catch (error) {
    console.error('Update claim error:', error)
    res.status(500).json({ success: false, error: 'Failed to update claim' })
  }
}

export const getInsuranceSummary = async (req, res) => {
  try {
    const { patientId } = req.params
    const summary = await insuranceService.getInsuranceSummary(patientId)
    res.json({ success: true, summary })
  } catch (error) {
    console.error('Get insurance summary error:', error)
    res.status(500).json({ success: false, error: 'Failed to get insurance summary' })
  }
}