import { t } from "./i18n.js";

export const STATUS_OPTIONS = ["wishlist", "applied", "interview", "offer", "rejected"];

// La empresa no puede devolver a nadie a "wishlist" (Interesa): mismo criterio
// que updateApplicationStatusValidators en el backend.
export const RECRUITER_STATUS_OPTIONS = ["applied", "interview", "offer", "rejected"];

const STATUS_LABEL_KEYS = {
    wishlist: "applications.statusWishlist",
    applied: "applications.statusApplied",
    interview: "applications.statusInterview",
    offer: "applications.statusOffer",
    rejected: "applications.statusRejected"
};

export const statusLabel = (status) => t(STATUS_LABEL_KEYS[status] || status);
