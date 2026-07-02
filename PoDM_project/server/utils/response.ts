import { Response } from 'express';

export const ok = (res: Response, data: any, message?: string) => {
    const body: Record<string, any> = { success: true, data };
    if (message) body.message = message;
    return res.status(200).json(body);
};

export const created = (res: Response, data: any, message?: string) => {
    const body: Record<string, any> = { success: true, data };
    if (message) body.message = message;
    return res.status(201).json(body);
};

export const okMsg = (res: Response, message: string, data?: any) => {
    const body: Record<string, any> = { success: true, message };
    if (data !== undefined) body.data = data;
    return res.status(200).json(body);
};

export const createdMsg = (res: Response, message: string, data?: any) => {
    const body: Record<string, any> = { success: true, message };
    if (data !== undefined) body.data = data;
    return res.status(201).json(body);
};
