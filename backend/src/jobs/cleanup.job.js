import cron from "node-cron";
import Item from "../models/item.model.js";
import Claim from "../models/claim.model.js";
import Message from "../models/message.model.js";
import { Notification } from "../models/notification.model.js";

// Run every hour to check for items that were returned 12 hours ago
export const startCleanupJob = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("Running Cleanup Job: Deleting returned items older than 12h...");

    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

      // Find items marked as returned BEFORE 12 hours ago
      const itemsToDelete = await Item.find({
        state: "returned",
        $or: [
          { returnedAt: { $lt: twelveHoursAgo } },
          { returnedAt: { $exists: false }, updatedAt: { $lt: twelveHoursAgo } }
        ]
      });

      if (itemsToDelete.length > 0) {
        console.log(`Found ${itemsToDelete.length} item(s) to automatically clean up.`);

        for (const item of itemsToDelete) {
          // Cascade delete claims and messages associated with this item
          await Claim.deleteMany({ itemId: item._id });
          await Message.deleteMany({ item: item._id });

          // Finally, delete the item itself
          await item.deleteOne();
        }
        console.log("12h Cleanup completed.");
      }

      // Handle old inactive items (> 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const expiredPossibleItems = await Item.find({
        state: { $ne: "returned" },
        updatedAt: { $lt: thirtyDaysAgo }
      });

      let expiredCount = 0;
      for (const item of expiredPossibleItems) {
        const hasRecentClaim = await Claim.exists({ itemId: item._id, updatedAt: { $gt: thirtyDaysAgo } });
        const hasRecentMessage = await Message.exists({ item: item._id, createdAt: { $gt: thirtyDaysAgo } });

        if (!hasRecentClaim && !hasRecentMessage) {
          expiredCount++;
          if (item.reportedBy) {
            await Notification.create({
              recipient: item.reportedBy,
              type: "ITEM_EXPIRED",
              title: "Item Expired & Removed",
              message: `The item "${item.title}" has been removed as there was no response in the past 30 days. You can report the item again for a successful return.`,
              item: item._id
            });
          }
          await Claim.deleteMany({ itemId: item._id });
          await Message.deleteMany({ item: item._id });
          await item.deleteOne();
        }
      }

      if (expiredCount > 0) {
        console.log(`Cleaned up ${expiredCount} expired items (30 days inactivity).`);
      }

      console.log("Cleanup Job: Completed successfully.");
    } catch (error) {
      console.error("Cleanup Job Error:", error);
    }
  });

  console.log("Cleanup Job Scheduler Initialized.");
};
