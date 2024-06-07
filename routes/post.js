import express from "express";
import { auth } from "../middlewares/auth.js";
import { postUpload } from "../middlewares/postUpload.js";
import { commentOnPost, createPost, deleteComment, getAllPosts, getCommentsOnPost, getMySavedPosts, getPostById, saveOrUnSavePost } from "../controllers/postController.js";

export const postRouter = express.Router();


postRouter.post('/',auth,postUpload.single("image"),createPost);

postRouter.get('/',auth,getAllPosts);

postRouter.post('/comment/:postId',auth,commentOnPost);

postRouter.delete('/:postId/comment/:id',auth,deleteComment);

postRouter.get('/comment/:postId',auth,getCommentsOnPost);

postRouter.post('/save/:postId',auth,saveOrUnSavePost);

postRouter.get('/saved',auth,getMySavedPosts);

postRouter.get('/:postId',auth,getPostById);
