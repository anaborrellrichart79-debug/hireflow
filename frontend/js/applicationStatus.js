import { t } from "./i18n.js";

export const STATUS_OPTIONS = ["wishlist", "applied", "interview", "offer", "rejected"];

const STATUS_LABEL_KEYS = {
    wishlist: "applications.statusWishlist",
    applied: "applications.statusApplied",
    interview: "applications.statusInterview",
    offer: "applications.statusOffer",
    rejected: "applications.statusRejected"
};

export const statusLabel = (status) => t(STATUS_LABEL_KEYS[status] || status);
