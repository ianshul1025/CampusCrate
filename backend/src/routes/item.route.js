import { Router } from "express"

import {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  markReturned
} from "../controllers/item.controller.js"

import { protect } from "../middlewares/auth.middleware.js"

const router = Router()


// Create lost or found item
router.post("/", protect, createItem)


// Search & get items
router.get("/", getItems)


// Get single item
router.get("/:id", getItemById)


// Update item
router.patch("/:id", protect, updateItem)


// Delete item
router.delete("/:id", protect, deleteItem)


// Mark item returned
router.patch("/:id/returned", protect, markReturned)


export default router