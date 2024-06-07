import express from "express";
import { auth } from "../middlewares/auth.js";
import { vlogUpload } from "../middlewares/vlogUpload.js";
import { commentOnVlog, createVlog, deleteComment, getAllVlogs, getCommentsOnVlog, getMySavedVlogs, getVlogById, likeOrUnlikeVlog, saveOrUnSaveVlog, viewVlog } from "../controllers/vlogController.js";

export const vlogRouter = express.Router();


vlogRouter.post('/',auth,vlogUpload.single("video"),createVlog);

vlogRouter.get('/',auth,getAllVlogs);

vlogRouter.post('/react/:vlogId',auth,likeOrUnlikeVlog);

vlogRouter.post('/comment/:vlogId',auth,commentOnVlog);

vlogRouter.delete('/:vlogId/comment/:id',auth,deleteComment);

vlogRouter.get('/comment/:vlogId',auth,getCommentsOnVlog);

vlogRouter.post('/save/:vlogId',auth,saveOrUnSaveVlog);

vlogRouter.post('/view/:vlogId',auth,viewVlog);

vlogRouter.get('/saved',auth,getMySavedVlogs);

vlogRouter.get('/:vlogId',auth,getVlogById);


