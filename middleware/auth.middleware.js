import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ROLES } from "../config/roles.js";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access token is missing.' });
        return;
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.status(403).json({ error: 'Invalid access token.' });
            return;
        }
        req.user = user;
        next();
    })
}

// export const authorizeRoles = (...allowedRoles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({ error: "User not authenticated" });
//     }

//     const userRole = req.user.role;
//     if (!userRole || !allowedRoles.includes(userRole)) {
//       return res.status(403).json({ error: "Forbidden" });
//     }

//     next();
//   };
// };

export const createAccessToken = (user) => {
    return jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '10d' });
}

export const authorize = (...allowedPermissions) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const role = ROLES[user.role.toUpperCase()];
    
    if (!role) {
      return res.status(403).json({ message: 'Role not found' });
    }

    if (!role.permissions.some(perm => allowedPermissions.includes(perm))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    next();
  };
}