export interface JWTPayload {
    userId: string;
    role: string;
    email: string;
}
export declare const generateToken: (payload: JWTPayload) => string;
export declare const verifyToken: (token: string) => JWTPayload;
export declare const generateRefreshToken: (payload: JWTPayload) => string;
//# sourceMappingURL=jwt.d.ts.map