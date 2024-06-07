import { PrismaClient } from "@prisma/client";
import path from 'path'
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();
const prisma = new PrismaClient();
const baseurl = process.env.BASE_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getMyNotifications(req, res) {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (6 - today.getDay()));

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const total = await prisma.notification.count({
            where: {
                toUserId: req.user.id,
                createdAt: {
                    gte: yesterday, // Notifications from yesterday
                },
            },
        })
        const notifications = await prisma.notification.findMany({
            where: {
                toUserId: req.user.id,
                createdAt: {
                    gte: yesterday, // Notifications from yesterday
                },
            },
            skip: parseInt((page - 1) * limit), take: parseInt(limit),
        });
        const unRead  = await prisma.notification.count({
            where: {
                toUserId: req.user.id,
                createdAt: {
                    gte: yesterday, // Notifications from yesterday
                },
                isRead:false
            },
        })
        return res.status(200).json({
            success: true,
            status: 200,
            message: "Notifications",
            notifications: notifications,
            total:total,
            unRead:unRead
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            status: 500,
            message: "Internal Server Error",
            error: error,
        })
    }

}
export async function markAsRead(req,res){
    try {
        const {id} = req.params;

        await prisma.notification.update({
            where:{
                id:parseInt(id),
                toUserId:req.user.id
            },
            data:{
                isRead:true
            }
        })
        return res.status(200).json({
            success: true,
            status: 200,
            message: "Notification Read",
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            status: 500,
            message: "Internal Server Error",
            error: error,
        })
    }
}
export async function markAllRead(req,res){
    try {
        await prisma.notification.updateMany({
            where:{
                toUserId:req.user.id
            },
            data:{
                isRead:true
            }
        })
        return res.status(200).json({
            success: true,
            status: 200,
            message: "Notification Read",
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            status: 500,
            message: "Internal Server Error",
            error: error,
        })
    }
}
