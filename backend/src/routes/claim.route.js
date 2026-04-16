import { Router } from "express"

import {
    createClaim,
    getMyClaims,
    getMyClaimForItem,
    getClaimsForItem,
    verifyClaim
} from "../controllers/claim.controller.js"

import { protect } from "../middlewares/auth.middleware.js"

const router = Router()

// Get current user's claim for a specific item (must be before /:itemId to avoid route conflict)
router.get("/my-claim/:itemId", protect, getMyClaimForItem)

// Get all user's claims
router.get("/my", protect, getMyClaims)

// Get all claims for an item (item owner only)
router.get("/item/:itemId", protect, getClaimsForItem)

// Submit a claim
router.post("/:itemId", protect, createClaim)

// Accept or reject a claim
router.patch("/:claimId/verify", protect, verifyClaim)

export default router