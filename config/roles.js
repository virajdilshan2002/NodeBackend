import { PERMISSIONS } from "./permissions.js";
import { VIEWS } from "./views.js";

export const ROLES = {
    ADMIN: {
        name: "ADMIN",
        permissions: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.ADMINISTRATE],
        views: [VIEWS.ADMIN, VIEWS.CHAT, VIEWS.ORDERS, VIEWS.LOCATE]
    },
    USER: {
        name: "USER",
        permissions: [PERMISSIONS.READ, PERMISSIONS.CREATE],
        views: [VIEWS.HOME, VIEWS.CHAT, VIEWS.ORDERS]
    },
    GUEST: {
        name: "GUEST",
        permissions: [PERMISSIONS.READ],
        views: [VIEWS.HOME, VIEWS.CHAT]
    }
}