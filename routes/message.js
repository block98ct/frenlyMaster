import express from "express";
import { auth } from "../middlewares/auth.js";
import { clearChat, getAllMessages, sendMessage } from "../controllers/messageController.js";

export const messageRouter = express.Router();


messageRouter.post('/:chatId',auth,sendMessage);

messageRouter.get('/:chatId',auth,getAllMessages);

messageRouter.delete('/:chatId',auth,clearChat);


