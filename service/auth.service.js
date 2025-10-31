import User from "../modal/user.modal.js";
import bcrypt from "bcryptjs";
import { createAccessToken } from "../middleware/auth.middleware.js";
import { ROLES } from "../config/roles.js";

export const authenticate = async (loginDto) => {
    const user = await User.findOne({ email: loginDto.email });
    if (user && bcrypt.compareSync(loginDto.password, user.password)) {
        const token = createAccessToken(user);
        const views = ROLES[user.role.toUpperCase()].views;
        return {email: user.email, role: user.role, views: views, token: token};
    }
    return null;
}