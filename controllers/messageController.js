import { PrismaClient } from '@prisma/client';
import { emitSocketEvent } from '../utils/socket.js'; // Assuming you have this utility function
import { ChatEventEnum } from '../utils/constants.js';
import Joi from "joi";
import dotenv from "dotenv";
dotenv.config();
import { createNormalNotification, sendNotificationRelateToMessage } from '../utils/notification.js';
const baseurl = process.env.BASE_URL;
const prisma = new PrismaClient();

export async function sendMessage(req, res) {
    try {
        const { chatId } = req.params;
        const { content } = req.body;
        const schema = Joi.object({
            content: Joi.string().required(),
        });

        const result = schema.validate(req.body);
        if (result.error) {
            const message = result.error.details.map((i) => i.message).join(",");
            return res.json({
                message: result.error.details[0].message,
                error: message,
                missingParams: result.error.details[0].message,
                status: 400,
                success: false,
            });
        }
        const chat = await prisma.chat.findUnique({
            where: {
                id: parseInt(chatId)
            },
            include: {
                participants: true
            }
        })
        if (!chat) {
            return res.status(404).json({
                status: 404,
                message: 'Chat does not exists',
                success: false,
            })
        }
        const message = await prisma.chatMessage.create({
            data: {
                content: content || '',
                senderId: req.user.id,
                chatId: parseInt(chatId),
            }
        });
        const updateChat = await prisma.chat.update({
            where: {
                id: parseInt(chatId)
            },
            data: {
                lastMessageId: message.id
            }, include: {
                participants: true
            }
        })
        const socketMessage = await prisma.chatMessage.findUnique({
            where: {
                id: message.id
            },
            include: {
                sender: true,
                chat: true,
            }
        })
        if(socketMessage.sender.avatar_url){
            socketMessage.sender.avatar_url = `${baseurl}/images/${socketMessage.sender.avatar_url}`
        }
        if(socketMessage.sender.cover_photo_url){
            socketMessage.sender.cover_photo_url= `${baseurl}/images/${socketMessage.sender.cover_photo_url}`
        }
        updateChat.participants.forEach(async(participant) => {
            if (participant.id === req.user.id) return;
            emitSocketEvent(
                req,
                participant.id.toString(),
                ChatEventEnum.MESSAGE_RECEIVED_EVENT,
                socketMessage
            );
            await createNormalNotification({
                toUserId: participant.id,
                byUserId: req.user.id,
                data: {
                    chatId: chatId
                },
                content: `${req.user.full_name} sent you a message`
            })
            await sendNotificationRelateToMessage({
                token: participant.fcm_token,
                toUserId:participant.id,
                body:`${req.user.full_name} sent you a message`,
                chatId:chatId
            })
        })
        return res.status(200).json({
            status: 200,
            message: 'Message send Successfully',
            success: true,
            message: socketMessage
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: 200,
            message: 'Internal Server Error',
            success: false,
            error: error
        })
    }
}

export async function getAllMessages(req, res) {
    try {
        const { chatId } = req.params;
        const chat = await prisma.chat.findUnique({
            where: {
                id: parseInt(chatId)
            },
            include: {
                participants: true
            }
        })
        if (!chat) {
            return res.status(404).json({
                status: 404,
                message: 'Chat does not exists',
                success: false,
            })
        }
        const messages = await prisma.chatMessage.findMany({
            where: {
                chatId: parseInt(chatId),
            },
            include: {
                sender: true,
                chat: true
            }
        })
        await Promise.all(messages.map((message)=>{
            if(message.sender.avatar_url){
                message.sender.avatar_url = `${baseurl}/images/${message.sender.avatar_url}`
            }
            if(message.sender.cover_photo_url){
                message.sender.cover_photo_url= `${baseurl}/images/${message.sender.cover_photo_url}`
            }
        }))
        return res.status(200).json({
            status: 200,
            message: 'Messages',
            success: true,
            messages: messages
        })


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: 500,
            message: 'Internal Server Error',
            success: false,
            error: error
        })

    }
}

export async function clearChat(req, res) {
    try {
        const { chatId } = req.params;
        const chat = await prisma.chat.findUnique({
            where: {
                id: parseInt(chatId)
            },
            include: {
                participants: true
            }
        })
        if (!chat) {
            return res.status(404).json({
                status: 404,
                message: 'Chat does not exists',
                success: false,
            })
        }
        await prisma.chatMessage.deleteMany({
            where: {
                chatId: parseInt(chatId)
            }
        })
        return res.status(200).json({
            status: 200,
            message: 'Chat Cleared Successfully',
            success: true,
        })

    } catch (error) {
        console.log(error);
        return  res.status(500).json({
            status:200,
            message:'Internal Server Error',
            success:false,
            error:error
        })
    }
}
