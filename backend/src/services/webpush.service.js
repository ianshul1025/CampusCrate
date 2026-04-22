import webpush from "web-push";
import User from "../models/user.model.js";

// Configure VAPID on module load
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@campuscrate.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a Web Push notification to all registered devices for a user.
 * Silently removes expired/invalid subscriptions from the DB.
 */
export const sendPushToUser = async (userId, payload) => {
    try {
        const user = await User.findById(userId).select("pushSubscriptions");
        if (!user || !user.pushSubscriptions?.length) return;

        const results = await Promise.allSettled(
            user.pushSubscriptions.map((sub) =>
                webpush.sendNotification(sub, JSON.stringify(payload))
            )
        );

        // Collect invalid endpoints to clean up
        const expiredEndpoints = [];
        results.forEach((result, i) => {
            if (result.status === "rejected") {
                const err = result.reason;
                // 410 Gone = subscription no longer valid
                if (err?.statusCode === 410 || err?.statusCode === 404) {
                    expiredEndpoints.push(user.pushSubscriptions[i].endpoint);
                } else {
                    console.warn("Push notification failed:", err?.message);
                }
            }
        });

        // Remove dead subscriptions
        if (expiredEndpoints.length > 0) {
            await User.findByIdAndUpdate(userId, {
                $pull: {
                    pushSubscriptions: { endpoint: { $in: expiredEndpoints } }
                }
            });
        }
    } catch (err) {
        console.error("sendPushToUser error:", err);
    }
};

/**
 * Register a push subscription for a user.
 * Prevents duplicate endpoints.
 */
export const registerPushSubscription = async (userId, subscription) => {
    if (!subscription?.endpoint) throw new Error("Invalid subscription");

    await User.findByIdAndUpdate(userId, {
        // Add only if not already present (matched by endpoint)
        $addToSet: { pushSubscriptions: subscription }
    });
};

/**
 * Remove a specific push subscription for a user.
 */
export const removePushSubscription = async (userId, endpoint) => {
    await User.findByIdAndUpdate(userId, {
        $pull: { pushSubscriptions: { endpoint } }
    });
};
