import { PrismaClient } from '@prisma/client';
import { emitSocketEvent } from '../utils/socket.js'; // Assuming you have this utility function
import { ChatEventEnum } from '../utils/constants.js';

import dotenv from "dotenv";
dotenv.config();
const baseurl = process.env.BASE_URL;
const prisma = new PrismaClient();

export async function createOrGetAOneOnOneChat(req, res) {
    const { receiverId } = req.params;

    try {
        // Check if receiver exists
        const receiver = await prisma.user.findUnique({
            where: { id: parseInt(receiverId) }
        });
       
        if (!receiver) {
            //throw new ApiError(404, "Receiver does not exist");
            return res.status(404).json({
                status: 404,
                message: 'Receiver does not exist',
                success: false,
            })

        }
        if(receiver.avatar_url)
        {
            receiver.avatar_url = `${baseurl}/images/${receiver.avatar_url}`
        }
        if(receiver.cover_photo_url)
        {
            receiver.cover_photo_url = `${baseurl}/images/${receiver.cover_photo_url}`
        }
        // Check if receiver is not the user who is requesting a chat
        if (receiver.id === req.user.id) {
            //throw new ApiError(400, "You cannot chat with yourself");
            return res.status(400).json({
                status: 404,
                message: 'You cannot chat with yourself',
                success: false,
            })
        }

        // Check if a chat already exists between the users
        const existingChat = await prisma.chat.findFirst({
            where: {
                participants: {
                    every: {
                        OR: [
                            { id: req.user.id },
                            { id: parseInt(receiverId) }
                        ]
                    }
                }
            }
        });

        if(req.user.avatar_url)
        {
            req.user.avatar_url = `${baseurl}/images/${ req.user.avatar_url}`
        }
        if( req.user.cover_photo_url)
        {
             req.user.cover_photo_url = `${baseurl}/images/${ req.user.cover_photo_url}`
        }

        if (existingChat) {
            // If a chat already exists, return it
            //return res.status(200).json(new ApiResponse(200, existingChat, "Chat retrieved successfully"));
            return res.status(200).json({
                status: 200,
                message: 'Chat retrieved successfully',
                success: true,
                existingChat: { ...existingChat, participants: [req.user, receiver] }
            })
        }

        // Create a new chat
        const newChat = await prisma.chat.create({
            data: {
                name: "One on one chat",
                participants: {
                    connect: [
                        { id: req.user.id },
                        { id: parseInt(receiverId) }
                    ]
                }
            }
        });

        // Emit socket event to inform participants about the new chat
        const payload = {
            ...newChat,
            participants: [req.user, receiver]
        };

        // Emit event to all participants except the current user
        payload.participants.forEach(participant => {
            if (participant.id !== req.user.id) {
                emitSocketEvent(req, participant.id.toString(), ChatEventEnum.NEW_CHAT_EVENT, payload);
            }
        });

        //return res.status(201).json(new ApiResponse(201, payload, "Chat created successfully"));
        return res.status(201).json({
            status: 201,
            message: 'Chat created successfully',
            success: true,
            payload: payload
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
};
export async function getAllChats(req, res) {
    try {
        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);
        const chats = await prisma.chat.findMany({
            where: {
                participants: {
                    some:
                        { id: req.user.id },
                    none: {
                        id: {
                            in: blockedUserIDs
                        }
                    }
                }
            },
            include: {
                participants: true,
                lastMessage:true,
            }
        })
        await Promise.all(chats.map((chat)=>{
            chat.participants.map((participant)=>{
                if(participant.avatar_url){
                    participant.avatar_url = `${baseurl}/images/${participant.avatar_url}`
                }
                if(participant.cover_photo_url){
                    participant.cover_photo_url = `${baseurl}/images/${participant.cover_photo_url}`
                }
            })
        }))
        return res.status(200).json({
            status: 200,
            message: 'Chats Retrieved Successfully',
            success: true,
            chats: chats
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
export async function deleteChat(req, res) {
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
        const otherParticipant = chat.participants.find((participant) => participant.id !== req.user.id)
        emitSocketEvent(
            req,
            otherParticipant.id.toString(),
            ChatEventEnum.LEAVE_CHAT_EVENT,
            chat
        );
        await prisma.chat.delete({
            where: {
                id: parseInt(chatId)
            }
        });
        return res.status(200).json({
            status: 200,
            message: 'Chat Deleted Successfully',
            success: true,
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

