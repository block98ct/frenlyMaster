import express from "express";
import { auth } from "../middlewares/auth.js";
import { commentOnBlog, createBlog, deleteComment, editBlog, getAllBlogs, getBlogById, getCommentsOnBlog, getMySavedBlogs, likeOrUnlikeBlog, saveOrUnSaveBlog } from "../controllers/blogController.js";
import { blogUpload } from "../middlewares/blogUpload.js";

export const blogRouter = express.Router();


blogRouter.post('/',auth,blogUpload.single('image'),createBlog);

blogRouter.patch('/',auth,blogUpload.single('image'),editBlog);

blogRouter.get('/',auth,getAllBlogs);

blogRouter.post('/react/:blogId',auth,likeOrUnlikeBlog);

blogRouter.post('/comment/:blogId',auth,commentOnBlog);

blogRouter.delete('/:blogId/comment/:id',auth,deleteComment);

blogRouter.get('/comment/:blogId',auth,getCommentsOnBlog);

blogRouter.post('/save/:blogId',auth,saveOrUnSaveBlog);

blogRouter.get('/saved',auth,getMySavedBlogs);

blogRouter.get('/:blogId',auth,getBlogById);

