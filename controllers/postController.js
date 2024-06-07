import Joi from "joi";
import { PrismaClient } from "@prisma/client";
import path from 'path'
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

import { createNormalNotification, sendNotificationRelateToPost } from "../utils/notification.js";
dotenv.config();
const prisma = new PrismaClient();
const baseurl = process.env.BASE_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export async function createPost(req, res) {
    try {
        const { caption }  = req.body;
        console.log(req.body);
        const schema = Joi.object({
            caption: Joi.string().max(100).required()
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
          else{
            const post = await prisma.post.create({
                data:{
                    caption:caption,
                    userId:req.user.id,
                    image_url:req.file ? `${req.file.filename}`:null,
                }
            })
        
            return res.status(200).json({
                success:true,
                status:200,
                message:'Post Created Successfully',
                post:post
              })
          }
        
    } catch (error) {
        return res.json({
          success: false,
          message: "Internal server error",
          status: 500,
          error: error
        })
    }
}
export async function getAllPosts(req, res) {
  try {
      const { search , page =1 , limit = 10} = req.query;
      console.log(req.query);
      console.log(page,limit);
      const blockedUserIDs = (await prisma.userBlocked.findMany({
          where: {
              userId: req.user.id
          },
          select: {
              userBlockedId: true,
          }
      })).map((user) => user.userBlockedId);
      const posts = await prisma.post.findMany({
          where: {
              userId: {
                  notIn: [...blockedUserIDs, req.user.id]
              },
              caption: {
                  contains: search
              }
          },include:{
            user:true
          },skip:parseInt((page-1)*limit),take:parseInt(limit),
      })
      await Promise.all(posts.map((post)=>{

        if(post.image_url){
            post.image_url = `${baseurl}/post/${post.image_url}`
        }
        if(post.user.avatar_url){
            post.user.avatar_url = `${baseurl}/images/${post.user.avatar_url}`
        }
        if(post.user.cover_photo_url){
            post.user.cover_photo_url = `${baseurl}/images/${post.user.cover_photo_url}`
        }

      }))
      res.status(200).json({
          success: true,
          status: 200,
          message: 'Posts',
          posts: posts
      })
  } catch ({error}) {
      res.status(500).json({
          success: false,
          status: error,
          message: 'Internal Server Error',
          error:error
      })
  }

}
export async function commentOnPost(req, res) {
    try {
        let { postId } = req.params;
        const { content } = req.body;
        postId = parseInt(postId);
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

        const post = await prisma.post.findUnique({
            where: {
                id: postId
            },
            include:{
                user:true
            }
        })

        if (!post) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'Post Not Found',
            })
        }
        const createComment = await prisma.commentPost.create({
            data: {
                content: content,
                createByUserId: req.user.id,
                postId: postId
            }
        })
        await prisma.post.update({
            where: {
                id: post.id
            },
            data: {
                numberOfComments: (post.numberOfComments + 1)
            }
        })

        await createNormalNotification({
            toUserId: post.user.id,
            byUserId: req.user.id,
            data: {
                postId: postId
            },
            content: `${req.user.full_name} commented on your post`
        })

        await sendNotificationRelateToPost({
            token: post.user.fcm_token,
            toUserId:post.user.id,
            body:`${req.user.full_name} commented on your post`,
            postId:postId
        })
        return res.status(200).json({
            status: 200,
            message: 'Commented on the post',
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
export async function saveOrUnSavePost(req, res) {
    try {
        let { postId } = req.params;

        postId = parseInt(postId);

        const post = await prisma.post.findUnique({
            where: {
                id: postId
            }
        })

        if (!post) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'post Not Found',
            })
        }
        const savePost = await prisma.savePost.findFirst({
            where: {
                postId: postId,
                saveByUserId: req.user.id
            }
        })

        if (savePost) {

            await prisma.savePost.delete({
                where: {
                    id: savePost.id,
                    saveByUserId: req.user.id,
                    postId: postId
                }
            })
            if (post.numberOfSaves > 0) {
                await prisma.post.update({
                    where: {
                        id: postId
                    },
                    data: {
                        numberOfSaves: post.numberOfSaves - 1,
                    }
                })
            }

            return res.status(200).json({
                status: 200,
                message: 'UnSaved the post',
                success: true
            })
        }
        else {

            const savePost = await prisma.savePost.create({
                data: {
                    postId: postId,
                    saveByUserId: req.user.id
                }
            })
            await prisma.post.update({
                where: {
                    id: postId
                },
                data: {
                    numberOfSaves: post.numberOfSaves + 1,
                }
            })
            return res.status(200).json({
                status: 200,
                message: 'Saved the post',
                success: true,
                savePost: savePost
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
export async function getMySavedPosts(req, res) {
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
        const mySavedPosts = await prisma.savePost.findMany({
            where: {
                saveByUserId: req.user.id
            }, include: {
                post: {
                    include: {
                        user: true
                    }
                }
            }, skip: parseInt((page - 1) * limit), take: parseInt(limit)
        })
        await Promise.all(mySavedPosts.map(async ({ post }) => {
            // const likeCount = await prisma..count({
            //     where: {
            //         postId: post.id,
            //         createByUserId: {
            //             notIn: blockedUserIDs
            //         }
            //     }
            // })
            const commentCount = await prisma.commentPost.count({
                where: {
                    postId: post.id,
                    createByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const saveCount = await prisma.savePost.count({
                where: {
                    postId: post.id,
                    saveByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            post.numberOfComments = commentCount;
            post.numberOfSaves = saveCount;
            
        if(post.image_url){
            post.image_url = `${baseurl}/post/${post.image_url}`
        }
        if(post.user.avatar_url){
            post.user.avatar_url = `${baseurl}/images/${post.user.avatar_url}`
        }
        if(post.user.cover_photo_url){
            post.user.cover_photo_url = `${baseurl}/images/${post.user.cover_photo_url}`
        }

            
        }))
        return res.status(200).json({
            status: 200,
            message: 'My Saved Posts',
            success: true,
            mySavedPosts: mySavedPosts
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
export async function getCommentsOnPost(req, res) {
    try {
        let { postId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        console.log('skip', (parseInt(page) - 1) * limit);
        console.log('take', limit)
        postId = parseInt(postId);
        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);
        const comments = await prisma.commentPost.findMany({
            where: {
                postId: postId,
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
            message: 'Comments on the post',
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
export async function deleteComment(req, res) {
    try {
        let { postId, id } = req.params;
        postId = parseInt(postId);
        id = parseInt(id);
        const post = await prisma.post.findUnique({
            where: {
                id: postId
            }
        })

        if (!post) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'post Not Found',
            })
        }
        const comment = await prisma.commentPost.findUnique({
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

        const deleteComment = await prisma.commentPost.delete({
            where: {
                id: id,
                createByUserId: req.user.id
            }
        })
        if (post.numberOfComments > 0) {
            await prisma.post.update({
                where: {
                    id: post.id
                },
                data: {
                    numberOfComments: (post.numberOfComments - 1)
                }
            })
        }

        return res.status(200).json({
            status: 200,
            message: 'Comment on the post Deleted',
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
export async function getPostById(req, res) {
    try {
        let { postId } = req.params;

        postId = parseInt(postId);

        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);

        const post = await prisma.post.findUnique({
            where: {
                id: postId
            },
            include: {
                user: true
            }
        })
        
        const checkSaved = await prisma.savePost.findFirst({
            where: {
                postId: postId,
                saveByUserId: req.user.id
            }
        })
        // let alreadyLiked = false;

        let alreadySaved = false;
        // if (checkReact) {
        //     alreadyLiked = true
        // }
        if (checkSaved) {
            alreadySaved = true
        }

        const commentCount = await prisma.commentPost.count({
            where: {
                postId: post.id,
                createByUserId: {
                    notIn: blockedUserIDs
                }
            }
        })
        const saveCount = await prisma.savePost.count({
            where: {
                postId: post.id,
                saveByUserId: {
                    notIn: blockedUserIDs
                }
            }
        })
       
        post.numberOfComments = commentCount;
        post.numberOfSaves = saveCount;
        if(post.image_url){
            post.image_url = `${baseurl}/post/${post.image_url}`
        }
        if(post.user.avatar_url){
            post.user.avatar_url = `${baseurl}/images/${post.user.avatar_url}`
        }
        if(post.user.cover_photo_url){
            post.user.cover_photo_url = `${baseurl}/images/${post.user.cover_photo_url}`
        }
       
        return res.status(200).json({
            status: 200,
            message: 'Blog ',
            success: true,
            post: { ...post, alreadySaved }
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