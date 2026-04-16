import { Router } from "express"

import {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  markReturned,
  getGlobalStats,
  getSavedItems,
  toggleSaveItem
} from "../controllers/item.controller.js"

import { protect } from "../middlewares/auth.middleware.js"
import { verifyAdmin } from "../middlewares/admin.middleware.js"

const router = Router()


// Create lost or found item
router.post("/", protect, createItem)


// Search & get items
router.get("/", getItems)


// Global Stats
router.get("/stats", getGlobalStats)

// Get saved items
router.get("/saved", protect, getSavedItems)

// Get single item
router.get("/:id", getItemById)


// Update item
router.patch("/:id", protect, updateItem)


// Delete item
router.delete("/:id", protect, deleteItem)


// Mark item returned
router.patch("/:id/returned", protect, markReturned)

// Toggle save item
router.post("/:id/save", protect, toggleSaveItem)

// Admin Delete Item
router.delete("/admin/:id", verifyAdmin, deleteItem)

export default router