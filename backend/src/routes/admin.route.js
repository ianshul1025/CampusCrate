import express from "express";
import { verifyAdmin } from "../middlewares/admin.middleware.js";
import { getAnalytics, getAllItemsAdmin, deleteAnyItem, getAllUsers, toggleBlockUser, getAllReports, updateReportStatus } from "../controllers/admin.controller.js";
import { adminLogin, adminLogout, changeAdminPassword } from "../controllers/admin.auth.controller.js";

const router = express.Router();

// Public admin auth routes
router.post("/login", adminLogin);
router.post("/logout", adminLogout);

// All routes below require valid admin JWT
router.use(verifyAdmin);
router.post("/change-password", changeAdminPassword);

router.get("/analytics", getAnalytics);
router.get("/items", getAllItemsAdmin);
router.delete("/items/:id", deleteAnyItem);
router.get("/users", getAllUsers);
router.post("/users/:userId/block", toggleBlockUser);

// User Reports (Complaints)
router.get("/reports", getAllReports);
router.patch("/reports/:reportId/status", updateReportStatus);

export default router;
