"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(__dirname, '..', 'data'); // Adjust path relative to dist/src
const USERS_JSON_PATH = path_1.default.join(DATA_DIR, 'users.json');
// Updated protect middleware - now a simple pass-through
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // else if (req.cookies.token) { // Optional: Check for token in cookies if needed
    //   token = req.cookies.token;
    // }
    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token provided.' });
        return;
    }
    try {
        // Read users from file
        const usersData = yield (0, promises_1.readFile)(USERS_JSON_PATH, 'utf-8');
        const users = JSON.parse(usersData);
        // Find user by token (UUID)
        const currentUser = users.find(u => u.UUID === token);
        if (!currentUser) {
            console.warn(`Auth failed: Invalid token (UUID) received: ${token}`);
            res.status(401).json({ success: false, message: 'Not authorized, invalid token.' });
            return;
        }
        // Attach user to the request object (excluding password)
        const { password } = currentUser, userWithoutPassword = __rest(currentUser, ["password"]);
        req.user = userWithoutPassword; // Assign the user object without the password
        console.log(`Authenticated user: ${req.user.email} (UUID: ${req.user.UUID}) for path: ${req.path}`);
        next(); // Proceed to the next middleware/route handler
    }
    catch (error) { // Catch any error during file read or JSON parse
        console.error("Error during token validation:", error);
        if (error.code === 'ENOENT') {
            console.error(`Authentication error: ${USERS_JSON_PATH} not found.`);
            res.status(500).json({ success: false, message: 'Authentication configuration error.' });
        }
        else {
            res.status(401).json({ success: false, message: 'Not authorized, token validation failed.' });
        }
    }
});
exports.protect = protect;
