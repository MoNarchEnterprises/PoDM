import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import ms, { StringValue } from 'ms';


// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET must be provided in the environment variables.");
}

/**
 * Generates a JSON Web Token (JWT) for a given user ID.
 * @param userId - The unique identifier of the user.
 * @returns A signed JWT string.
 */
export const generateToken = (userId: string): string => {
    // Explicitly define the type for the options object to resolve the overload ambiguity.
    const expiresInSeconds = Math.floor(ms(JWT_EXPIRES_IN as StringValue) / 1000);

    const options: SignOptions = {
        expiresIn: expiresInSeconds,
    };
    
    return jwt.sign({ id: userId }, JWT_SECRET, options);
};
/**
 * Verifies a JWT and returns its decoded payload.
 * In your app, this logic will likely live inside your auth.middleware.ts file.
 * @param token - The JWT string to verify.
 * @returns The decoded payload of the token if valid.
 */
export const verifyToken = (token: string): string | jwt.JwtPayload => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        throw new Error("Invalid or expired token.");
    }
};
