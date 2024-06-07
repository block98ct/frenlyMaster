import Joi from "joi";
import { PrismaClient } from "@prisma/client";
import path from 'path'
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { getBlogLikeStatus, getBlogSaveStatus } from "../utils/helper.js";
import { createNormalNotification, sendNotificationRelateToBlog } from "../utils/notification.js";
dotenv.config();
const prisma = new PrismaClient();
const baseurl = process.env.BASE_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createBlog(req, res) {
    try {
        const { title, body, tags } = req.body;
        console.log(req.body);
        console.log(typeof tags);
        const schema = Joi.object({
            title: Joi.string().required(),
            body: Joi.string().max(500).required(),
            tags: Joi.string().required()  // Assuming tags is an array of strings
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
        else {
            const blog = await prisma.blog.create({
                data: {
                    title: title,
                    body: body,
                    image_url: req.file ? `${req.file.filename}` : null,
                    userId: req.user.id,
                    tags: tags
                }
            })
            return res.status(200).json({
                success: true,
                status: 200,
                message: 'Blog Created Successfully',
                blog: blog
            })
        }

    } catch (error) {
        console.log(error)
        return res.json({
            success: false,
            message: "Internal server error",
            status: 500,
            error: error
        })
    }
}
export async function editBlog(req, res) {
    try {
        const { title, body, tags, id } = req.body;
        console.log(req.body);
        console.log(typeof tags);
        const schema = Joi.object({
            title: Joi.string().optional(),
            body: Joi.string().max(500).optional(),
            tags: Joi.string().optional(),
            id: Joi.string().required(), // Assuming tags is an array of strings
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
        else {
            const blog = await prisma.blog.findUnique({
                where: {
                    id: parseInt(id)
                }
            });
            if (!blog) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Blog Not Found',
                })
            }
            let blogData = {
                title: title ? title : blog.title,
                body: body ? body : blog.body,
                tags: tags ? tags : blog.tags,
                image_url: req.file ? `${req.file.filename}` : blog.image_url,
            };
            const updateblog = await prisma.blog.update({
                where: {
                    id: parseInt(id)
                },
                data: blogData,
            })
            const blogs = 'as';
            return res.status(200).json({
                success: true,
                status: 200,
                message: 'Blog Updated Successfully',
                blog: updateblog
            })
        }

    } catch (error) {
        console.log(error)
        return res.json({

            success: false,
            message: "Internal server error",
            status: 500,
            error: error
        })
    }
}
export async function getAllBlogs(req, res) {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        console.log(req.query);
        console.log(page, limit);
        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);
        const blogs = await prisma.blog.findMany({
            where: {
                userId: {
                    notIn: [...blockedUserIDs, req.user.id]
                },
                title: {
                    contains: search
                }
            }, include: {
                user: {
                    select: {
                        id: true,
                        full_name: true,
                        city: true,
                        country: true,
                        avatar_url: true,
                        cover_photo_url: true
                    }
                }
            }, skip: parseInt((page - 1) * limit), take: parseInt(limit),
        })
        const blogIds = blogs.map(({ id }) => id);
        const likeStatus = await getBlogLikeStatus(req.user.id, blogIds);
        const saveStatus = await getBlogSaveStatus(req.user.id, blogIds);
        const likeStatusMap = likeStatus.reduce(
            (map, { blogId, status }) => ({ ...map, [blogId]: status }),
            {}
        );
        const saveStatusMap = saveStatus.reduce(
            (map, { blogId, status }) => ({ ...map, [blogId]: status }),
            {}
        );
        const ans = await Promise.all(blogs.map(async (blog) => {

            const likeCount = await prisma.reactBlog.count({
                where: {
                    blogId: blog.id,
                    createByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const commentCount = await prisma.blogComment.count({
                where: {
                    blogId: blog.id,
                    createByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const saveCount = await prisma.saveBlog.count({
                where: {
                    blogId: blog.id,
                    saveByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            if(blog.image_url)
            {
                blog.image_url = `${baseurl}/blog/${blog.image_url}`
            }
            if(blog.user.avatar_url)
            {
                blog.user.avatar_url = `${baseurl}/images/${blog.user.avatar_url}`
            }
            if(blog.user.cover_photo_url)
            {
                blog.user.cover_photo_url = `${baseurl}/images/${blog.user.cover_photo_url}`
            }
            return { ...blog, alreadyLiked: likeStatusMap[blog.id.toString()], alreadySaved: saveStatusMap[blog.id.toString()], numberOfLikes: likeCount, numberOfSaves: saveCount, numberOfComments: commentCount }
        }))
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Blogs',
            blogs: ans
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            status: error,
            message: 'Internal Server Error',
            error: error
        })
    }

}

export async function likeOrUnlikeBlog(req, res) {
    try {
        let { blogId } = req.params;

        blogId = parseInt(blogId);

        const blog = await prisma.blog.findUnique({
            where: {
                id: blogId
            },
            include:{
                user:true
            }
        })

        if (!blog) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'Blog Not Found',
            })
        }
        const reactBlog = await prisma.reactBlog.findFirst({
            where: {
                blogId: blogId,
                createByUserId: req.user.id
            }
        })

        if (reactBlog) {
            await prisma.reactBlog.delete({
                where: {
                    id: reactBlog.id,
                    blogId: blogId,
                    createByUserId: req.user.id
                }
            })
            let numberOfLikes = (await prisma.blog.findUnique({
                where: {
                    id: blogId
                },
                select: {
                    numberOfLikes: true
                }
            })).numberOfLikes

            if (numberOfLikes > 0) {
                numberOfLikes = numberOfLikes - 1;
            }
            await prisma.blog.update({
                where: {
                    id: blogId
                },
                data: {
                    numberOfLikes: numberOfLikes
                }
            })

            return res.status(200).json({
                status: 200,
                message: 'Unliked the blog',
                success: true
            })
        }
        else {
            const likeBlog = await prisma.reactBlog.create({
                data: {
                    blogId: blogId,
                    createByUserId: req.user.id
                }
            })
            let numberOfLikes = (await prisma.blog.findUnique({
                where: {
                    id: blogId
                },
                select: {
                    numberOfLikes: true
                }
            })).numberOfLikes

            numberOfLikes = numberOfLikes + 1;
            await prisma.blog.update({
                where: {
                    id: blogId
                },
                data: {
                    numberOfLikes: numberOfLikes
                }
            })
            await createNormalNotification({
                toUserId: blog.user.id,
                byUserId: req.user.id,
                data: {
                    blogId: blogId
                },
                content: `${req.user.full_name} liked  your blog`
            })
    
            await sendNotificationRelateToBlog({
                token: blog.user.fcm_token,
                toUserId:blog.user.id,
                body:`${req.user.full_name} liked on your blog`,
                blogId:blogId
            })
            // const likedBlog = await prisma.reactBlog.findUnique({
            //     where:{
            //         id:likeBlog.id
            //     },
            //     include:{
            //         user:true
            //     }
            // });
            // console.log(likedBlog)
            return res.status(200).json({
                status: 200,
                message: 'Liked the blog',
                success: true,
                likeBlog: likeBlog
            })

        }
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
export async function commentOnBlog(req, res) {
    try {
        let { blogId } = req.params;
        const { content } = req.body;
        blogId = parseInt(blogId);
        const schema = Joi.object({
            content: Joi.string().max(255).required(),
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

        const blog = await prisma.blog.findUnique({
            where: {
                id: blogId
            },
            include:{
                user:true
            }
        })

        if (!blog) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'Blog Not Found',
            })
        }
        const createComment = await prisma.blogComment.create({
            data: {
                content: content,
                createByUserId: req.user.id,
                blogId: blogId
            }
        })
        await prisma.blog.update({
            where: {
                id: blog.id
            },
            data: {
                numberOfComments: (blog.numberOfComments + 1)
            }
        })

        await createNormalNotification({
            toUserId: blog.user.id,
            byUserId: req.user.id,
            data: {
                blogId: blogId
            },
            content: `${req.user.full_name} commented on your blog`
        })

        await sendNotificationRelateToBlog({
            token: blog.user.fcm_token,
            toUserId:blog.user.id,
            body:`${req.user.full_name} commented on your blog`,
            blogId:blogId
        })
        return res.status(200).json({
            status: 200,
            message: 'Commented on the blog',
            success: true,
            comment: createComment
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
export async function deleteComment(req, res) {
    try {
        let { blogId, id } = req.params;
        blogId = parseInt(blogId);
        id = parseInt(id);
        const blog = await prisma.blog.findUnique({
            where: {
                id: blogId
            }
        })

        if (!blog) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'Blog Not Found',
            })
        }
        const comment = await prisma.blogComment.findUnique({
            where: {
                id: id
            }
        })

        if (!comment) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'Comment Not Found',
            })
        }

        const deleteComment = await prisma.blogComment.delete({
            where: {
                id: id,
                createByUserId: req.user.id
            }
        })
        if (blog.numberOfComments > 0) {
            await prisma.blog.update({
                where: {
                    id: blog.id
                },
                data: {
                    numberOfComments: (blog.numberOfComments - 1)
                }
            })
        }

        return res.status(200).json({
            status: 200,
            message: 'Comment on the blog Deleted',
            success: true,
            comment: deleteComment
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
export async function getCommentsOnBlog(req, res) {
    try {
        let { blogId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        console.log('skip', (parseInt(page) - 1) * limit);
        console.log('take', limit)
        blogId = parseInt(blogId);
        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);
        const comments = await prisma.blogComment.findMany({
            where: {
                blogId: blogId,
                createByUserId: {
                    notIn: blockedUserIDs
                }
            },
            include: {
                user: true
            },
            skip: (parseInt(page) - 1) * limit, // Specify the number of items to skip
            take: parseInt(limit), // Specify the number of items to take
        });
        await Promise.all(comments.map((comment)=>{
            if(comment.user.avatar_url)
            {
                comment.user.avatar_url = `${baseurl}/images/${comment.user.avatar_url}`
            }
            if(comment.user.cover_photo_url)
            {
                comment.user.cover_photo_url = `${baseurl}/images/${comment.user.cover_photo_url}`
            }
        }))
        return res.status(200).json({
            status: 200,
            message: 'Comments on the blog',
            success: true,
            comments: comments
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
export async function saveOrUnSaveBlog(req, res) {
    try {
        let { blogId } = req.params;

        blogId = parseInt(blogId);

        const blog = await prisma.blog.findUnique({
            where: {
                id: blogId
            }
        })

        if (!blog) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'Blog Not Found',
            })
        }
        const saveBlog = await prisma.saveBlog.findFirst({
            where: {
                blogId: blogId,
                saveByUserId: req.user.id
            }
        })

        if (saveBlog) {

            await prisma.saveBlog.delete({
                where: {
                    id: saveBlog.id,
                    saveByUserId: req.user.id,
                    blogId: blogId
                }
            })
            if (blog.numberOfSaves > 0) {
                await prisma.blog.update({
                    where: {
                        id: blogId
                    },
                    data: {
                        numberOfSaves: blog.numberOfSaves - 1,
                    }
                })
            }

            return res.status(200).json({
                status: 200,
                message: 'UnSaved the blog',
                success: true
            })
        }
        else {

            const saveBlog = await prisma.saveBlog.create({
                data: {
                    blogId: blogId,
                    saveByUserId: req.user.id
                }
            })
            await prisma.blog.update({
                where: {
                    id: blogId
                },
                data: {
                    numberOfSaves: blog.numberOfSaves + 1,
                }
            })
            return res.status(200).json({
                status: 200,
                message: 'Saved the blog',
                success: true,
                saveBlog: saveBlog
            })

        }
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
export async function getMySavedBlogs(req, res) {
    try {
        const { page = 1, limit = 10 } = req.query;
        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);
        const mySavedBlogs = await prisma.saveBlog.findMany({
            where: {
                saveByUserId: req.user.id,

            }, include: {
                blog: {
                    include: {
                        user: true
                    }
                }
            }, skip: parseInt((page - 1) * limit), take: parseInt(limit)
        })
        await Promise.all(mySavedBlogs.map(async ({ blog }) => {
            const likeCount = await prisma.reactBlog.count({
                where: {
                    blogId: blog.id,
                    createByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const commentCount = await prisma.blogComment.count({
                where: {
                    blogId: blog.id,
                    createByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const saveCount = await prisma.saveBlog.count({
                where: {
                    blogId: blog.id,
                    saveByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            blog.numberOfLikes = likeCount;
            blog.numberOfComments = commentCount;
            blog.numberOfSaves = saveCount;
            if(blog.image_url)
            {
                blog.image_url = `${baseurl}/blog/${blog.image_url}`
            }
            if(blog.user.avatar_url)
            {
                blog.user.avatar_url = `${baseurl}/images/${blog.user.avatar_url}`
            }
            if(blog.user.cover_photo_url)
            {
                blog.user.cover_photo_url = `${baseurl}/images/${blog.user.cover_photo_url}`
            }
        }))
        return res.status(200).json({
            status: 200,
            message: 'My Saved Blogs',
            success: true,
            mySavedBlogs: mySavedBlogs
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
export async function getBlogById(req, res) {
    try {
        let { blogId } = req.params;

        blogId = parseInt(blogId);

        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);

        const blog = await prisma.blog.findUnique({
            where:{
                id:blogId
            },
            include:{
                user:true
            }
        })
        const checkReact = await prisma.reactBlog.findFirst({
            where:{
                blogId:blogId,
                createByUserId:req.user.id
            }
        })
        const checkSaved = await prisma.saveBlog.findFirst({
            where:{
                blogId:blogId,
                saveByUserId:req.user.id
            }
        })
       let alreadyLiked = false;
       
       let alreadySaved = false;
       if(checkReact)
       {
        alreadyLiked = true
       }
       if(checkSaved)
       {
        alreadySaved = true
       }
        
        const likeCount = await prisma.reactBlog.count({
            where: {
                blogId: blog.id,
                createByUserId: {
                    notIn: blockedUserIDs
                }
            }
        })
        const commentCount = await prisma.blogComment.count({
            where: {
                blogId: blog.id,
                createByUserId: {
                    notIn: blockedUserIDs
                }
            }
        })
        const saveCount = await prisma.saveBlog.count({
            where: {
                blogId: blog.id,
                saveByUserId: {
                    notIn: blockedUserIDs
                }
            }
        })
        blog.numberOfComments = commentCount;
        blog.numberOfLikes = likeCount;
        blog.numberOfSaves = saveCount;
        if(blog.image_url)
        {
            blog.image_url = `${baseurl}/blog/${blog.image_url}`
        }
        if(blog.user.avatar_url)
        {
            blog.user.avatar_url = `${baseurl}/images/${blog.user.avatar_url}`
        }
        if(blog.user.cover_photo_url)
        {
            blog.user.cover_photo_url = `${baseurl}/images/${blog.user.cover_photo_url}`
        }
        
        return  res.status(200).json({
            status:200,
            message:'Blog ',
            success:true,
            blog:{...blog,alreadyLiked,alreadySaved}
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


