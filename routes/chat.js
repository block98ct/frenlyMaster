import express from "express";
import { auth } from "../middlewares/auth.js";
import { createOrGetAOneOnOneChat, deleteChat, getAllChats } from "../controllers/chatController.js";

export const chatRouter = express.Router();


chatRouter.post('/:receiverId',auth,createOrGetAOneOnOneChat);

chatRouter.get('/',auth,getAllChats);

chatRouter.delete('/:chatId',auth,deleteChat)




