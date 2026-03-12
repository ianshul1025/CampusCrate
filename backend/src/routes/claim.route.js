import { Router } from "express"

import {
    createClaim,
    getMyClaims,
    verifyClaim
} from "../controllers/claim.controller.js"

import { protect } from "../middlewares/auth.middleware.js"

const router = Router()

// Submit claim
router.post("/:itemId", protect, createClaim)

// Get user's claims
router.get("/my", protect, getMyClaims)

// Verify claim (item owner)
router.patch("/:claimId/verify", protect, verifyClaim)

export default router