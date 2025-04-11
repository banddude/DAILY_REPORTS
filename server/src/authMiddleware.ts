import { Request, Response, NextFunction } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
// Removed Supabase imports and dotenv

// Define a type for the user object expected in users.json
export interface User {
    UUID: string;
    email: string;
    password?: string; // Password might not always be needed here
    // Add other user fields if they exist in users.json
}

// Extend Express Request type to include our user object
declare global {
  namespace Express {
    interface Request {
      user?: User; // Use our defined User interface
    }
  }
}

const DATA_DIR = path.join(__dirname, '..', 'data'); // Adjust path relative to dist/src
const USERS_JSON_PATH = path.join(DATA_DIR, 'users.json');

// Updated protect middleware - now a simple pass-through
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
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
    const usersData = await readFile(USERS_JSON_PATH, 'utf-8');
    const users: User[] = JSON.parse(usersData);

    // Find user by token (UUID)
    const currentUser = users.find(u => u.UUID === token);

    if (!currentUser) {
        console.warn(`Auth failed: Invalid token (UUID) received: ${token}`);
        res.status(401).json({ success: false, message: 'Not authorized, invalid token.' });
        return;
    }

    // Attach user to the request object (excluding password)
    const { password, ...userWithoutPassword } = currentUser;
    req.user = userWithoutPassword as User; // Assign the user object without the password
    console.log(`Authenticated user: ${req.user.email} (UUID: ${req.user.UUID}) for path: ${req.path}`);
    next(); // Proceed to the next middleware/route handler

  } catch (error: any) { // Catch any error during file read or JSON parse
    console.error("Error during token validation:", error);
    if (error.code === 'ENOENT') {
        console.error(`Authentication error: ${USERS_JSON_PATH} not found.`);
        res.status(500).json({ success: false, message: 'Authentication configuration error.' });
    } else {
        res.status(401).json({ success: false, message: 'Not authorized, token validation failed.' });
    }
  }
}; 