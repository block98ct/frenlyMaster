import Joi from "joi";
import { PrismaClient } from "@prisma/client";
import path from 'path'
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { getVlogLikeStatus, getVlogSaveStatus } from "../utils/helper.js";
import { createNormalNotification, sendNotificationRelateToVlog } from "../utils/notification.js";
dotenv.config();
const prisma = new PrismaClient();
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
const baseurl = process.env.BASE_URL;
 const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// export async function createVlog(req, res) {
//     try {
//         const { title, description } = req.body;
//         console.log(req.body);
//         const schema = Joi.object({
//             title: Joi.string().max(100).required(),
//             description: Joi.string().max(500).required(),

//         });

//         const result = schema.validate(req.body);
//         if (result.error) {
//             const message = result.error.details.map((i) => i.message).join(",");
//             return res.json({
//                 message: result.error.details[0].message,
//                 error: message,
//                 missingParams: result.error.details[0].message,
//                 status: 400,
//                 success: false,
//             });
//         }
//         else {
//             const vlog = await prisma.vlog.create({
//                 data: {
//                     title: title,
//                     description: description,
//                     userId: req.user.id,
//                     video_url: req.file ? `${req.file.filename}`:null,
//                 }
//             })
//             return res.status(200).json({
//                 success: true,
//                 status: 200,
//                 message: 'Vlog Created Successfully',
//                 vlog: vlog
//             })
//         }

//     } catch (error) {
//         console.log(error)
//         return res.json({
//             success: false,
//             message: "Internal server error",
//             status: 500,
//             error: error
//         })
//     }
// }


export async function createVlog(req, res) {
    try {
        const { title, description } = req.body;

        // Check if video file is uploaded
        if (!req.file || !req.file.path) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Video file is missing',
            });
        }
        console.log("req.file",req.file)
        // Generate thumbnail
        const videoPath = req.file.path;
        const thumbnailFilename = `${Date.now()}-${req.file.filename.split('.')[0]}.jpg`; // Unique filename for the thumbnail
        const publicFolderPath = path.join(__dirname, '..', 'public'); // Path to the 'public' folder
        const thumbnailsFolderPath = path.join(publicFolderPath, 'thumbnails'); // Path to the 'thumbnails' folder
        //const thumbnailPath = path.join(thumbnailsFolderPath, thumbnailFilename); // Path for saving the thumbnail
        console.log("thumbnailsFolderPath",thumbnailsFolderPath);
        console.log("thumbnailFilename",thumbnailFilename)
        ffmpeg(videoPath)
            .screenshots({
                timestamps: ['50%'], // Take a screenshot at 50% of the video duration
                folder: thumbnailsFolderPath, // Save thumbnails in the 'thumbnails' folder
                filename: thumbnailFilename,
                size: '640x360', // Thumbnail size
            })
            .on('end', async () => {
                // Thumbnail generated successfully, store it in database
                const videoUrl = `${req.file.filename}`;
                const thumbnailUrl = `${thumbnailFilename}`;

                const vlog = await prisma.vlog.create({
                    data: {
                        title: title,
                        description: description,
                        userId: req.user.id,
                        video_url: videoUrl,
                        thumbnail_url: thumbnailUrl,
                    }
                });

                return res.status(200).json({
                    success: true,
                    status: 200,
                    message: 'Vlog Created Successfully',
                    vlog: vlog
                });
            })
            .on('error', (error) => {
                console.error('FFmpeg thumbnail generation error:', error);
                return res.status(500).json({
                    success: false,
                    status: 500,
                    message: 'Failed to generate thumbnail',
                    error: error.message,
                });
            });

    } catch (error) {
        console.error('Error in createVlog:', error);
        return res.status(500).json({
            success: false,
            status: 500,
            message: 'Internal server error',
            error: error.message,
        });
    }
}


export async function getAllVlogs(req, res) {
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
        const vlogs = await prisma.vlog.findMany({
            where: {
                userId: {
                    notIn: [...blockedUserIDs]
                },
                title: {
                    contains: search
                },
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
        console.log('vlogs', vlogs);
        const vlogIds = vlogs.map(({ id }) => id);
        console.log("vlogIds", vlogIds)
        const likeStatus = await getVlogLikeStatus(req.user.id, vlogIds);
        const saveStatus = await getVlogSaveStatus(req.user.id, vlogIds)
        const likeStatusMap = likeStatus.reduce(
            (map, { vlogId, status }) => ({ ...map, [vlogId]: status }),
            {}
        );
        const saveStatusMap = saveStatus.reduce(
            (map, { vlogId, status }) => ({ ...map, [vlogId]: status }),
            {}
        );
        const ans = await Promise.all(vlogs.map(async (vlog) => {

            const likeCount = await prisma.reactVlog.count({
                where: {
                    vlogId: vlog.id,
                    createByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const commentCount = await prisma.commentVlog.count({
                where: {
                    vlogId: vlog.id,
                    createByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const saveCount = await prisma.saveVlog.count({
                where: {
                    vlogId: vlog.id,
                    saveByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const viewCount = await prisma.viewVlog.count({
                where:{
                    vlogId:vlog.id,
                    viewByUserId:{
                        notIn:blockedUserIDs
                    }
                }
            })
            if(vlog.video_url){
                vlog.video_url = `${baseurl}/vlog/${vlog.video_url}`
            }
            if(vlog.thumbnail_url){
                vlog.thumbnail_url = `${baseurl}/thumbnails/${vlog.thumbnail_url}`
            }
            if(vlog.user.avatar_url){
                vlog.user.avatar_url = `${baseurl}/images/${vlog.user.avatar_url}`
            }
            if(vlog.user.cover_photo_url){
                vlog.user.cover_photo_url = `${baseurl}/images/${vlog.user.cover_photo_url}`
            }
            return {...vlog, alreadyLiked: likeStatusMap[vlog.id.toString()], alreadySaved: saveStatusMap[vlog.id.toString()], numberOfComment: commentCount, numberOfLikes: likeCount, numberOfSaves: saveCount,numberOfViews:viewCount }
        }))
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Vlogs',
            vlogs: ans
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            status: error,
            message: 'Internal Server Error',
            error: error
        })
    }

}
export async function likeOrUnlikeVlog(req, res) {
    try {
        let { vlogId } = req.params;

        vlogId = parseInt(vlogId);

        const vlog = await prisma.vlog.findUnique({
            where: {
                id: vlogId
            },
            include: {
                user: true
            }
        })

        if (!vlog) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'Vlog Not Found',
            })
        }

        const reactVlog = await prisma.reactVlog.findFirst({
            where: {
                vlogId: vlogId,
                createByUserId: req.user.id
            }
        })

        if (reactVlog) {
            await prisma.reactVlog.delete({
                where: {
                    id: reactVlog.id,
                    vlogId: vlogId,
                    createByUserId: req.user.id,
                }
            })
            if (vlog.numberOfLikes > 0) {
                await prisma.vlog.update({
                    where: {
                        id: vlogId
                    },
                    data: {
                        numberOfLikes: vlog.numberOfLikes - 1,
                    }
                })
            }
            return res.status(200).json({
                status: 200,
                message: 'Unliked the Vlog',
                success: true
            })
        }
        else {
            const likeVlog = await prisma.reactVlog.create({
                data: {
                    vlogId: vlogId,
                    createByUserId: req.user.id
                }
            })
            await prisma.vlog.update({
                where: {
                    id: vlogId
                },
                data: {
                    numberOfLikes: vlog.numberOfLikes + 1
                }
            })
            // const vlogCreator = await prisma.vlog.findUnique()
            await createNormalNotification({
                toUserId: vlog.user.id,
                byUserId: req.user.id,
                data: {
                    vlogId: vlogId
                },
                content: `${req.user.full_name} liked your vlog`
            })

            await sendNotificationRelateToVlog({
                token: vlog.user.fcm_token,
                toUserId:vlog.user.id,
                body:`${req.user.full_name} liked your vlog`,
                vlogId:vlogId
            })

            return res.status(200).json({
                status: 200,
                message: 'Liked the vlog',
                success: true,
                likeVlog: likeVlog
            })
        }
    } catch (error) {

    }
}
export async function commentOnVlog(req, res) {
    try {
        let { vlogId } = req.params;
        const { content } = req.body;
        vlogId = parseInt(vlogId);
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

        const vlog = await prisma.vlog.findUnique({
            where: {
                id: vlogId
            },
            include:{
                user:true
            }
        })

        if (!vlog) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'vlog Not Found',
            })
        }
        const createComment = await prisma.commentVlog.create({
            data: {
                content: content,
                createByUserId: req.user.id,
                vlogId: vlogId
            }
        })
        await createNormalNotification({
            toUserId: vlog.user.id,
            byUserId: req.user.id,
            data: {
                vlogId: vlogId
            },
            content: `${req.user.full_name} commented on your vlog`
        })

        await sendNotificationRelateToVlog({
            token: vlog.user.fcm_token,
            toUserId:vlog.user.id,
            body:`${req.user.full_name} commented on your vlog`,
            vlogId:vlogId
        })
        await prisma.vlog.update({
            where: {
                id: vlog.id
            },
            data: {
                numberOfComments: (vlog.numberOfComments + 1)
            }
        })
        return res.status(200).json({
            status: 200,
            message: 'Commented on the vlog',
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
        let { vlogId, id } = req.params;
        vlogId = parseInt(vlogId);
        id = parseInt(id);
        const vlog = await prisma.vlog.findUnique({
            where: {
                id: vlogId
            }
        })

        if (!vlog) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'vlog Not Found',
            })
        }
        const comment = await prisma.commentVlog.findUnique({
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

        const deleteComment = await prisma.commentVlog.delete({
            where: {
                id: id,
                createByUserId: req.user.id
            }
        })
        if (vlog.numberOfComments > 0) {
            await prisma.vlog.update({
                where: {
                    id: vlog.id
                },
                data: {
                    numberOfComments: (vlog.numberOfComments - 1)
                }
            })
        }

        return res.status(200).json({
            status: 200,
            message: 'Comment on the vlog Deleted',
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
export async function getCommentsOnVlog(req, res) {
    try {
        let { vlogId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        console.log('skip', (parseInt(page) - 1) * limit);
        console.log('take', limit)
        vlogId = parseInt(vlogId);
        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);
        const comments = await prisma.commentVlog.findMany({
            where: {
                vlogId: vlogId,
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
            message: 'Comments on the vlog',
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
export async function saveOrUnSaveVlog(req, res) {
    try {
        let { vlogId } = req.params;

        vlogId = parseInt(vlogId);

        const vlog = await prisma.vlog.findUnique({
            where: {
                id: vlogId
            }
        })

        if (!vlog) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'vlog Not Found',
            })
        }
        const saveVlog = await prisma.saveVlog.findFirst({
            where: {
                vlogId: vlogId,
                saveByUserId: req.user.id
            }
        })

        if (saveVlog) {

            await prisma.saveVlog.delete({
                where: {
                    id: saveVlog.id,
                    saveByUserId: req.user.id,
                    vlogId: vlogId
                }
            })
            if (vlog.numberOfSaves > 0) {
                await prisma.vlog.update({
                    where: {
                        id: vlogId
                    },
                    data: {
                        numberOfSaves: vlog.numberOfSaves - 1,
                    }
                })
            }

            return res.status(200).json({
                status: 200,
                message: 'UnSaved the vlog',
                success: true
            })
        }
        else {

            const saveVlog = await prisma.saveVlog.create({
                data: {
                    vlogId: vlogId,
                    saveByUserId: req.user.id
                }
            })
            await prisma.vlog.update({
                where: {
                    id: vlogId
                },
                data: {
                    numberOfSaves: vlog.numberOfSaves + 1,
                }
            })
            return res.status(200).json({
                status: 200,
                message: 'Saved the vlog',
                success: true,
                saveVlog: saveVlog
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
export async function getMySavedVlogs(req, res) {
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
        const mySavedVlogs = await prisma.saveVlog.findMany({
            where: {
                saveByUserId: req.user.id
            }, include: {
                vlog: {
                    include: {
                        user: true
                    }
                }
            }, skip: parseInt((page - 1) * limit), take: parseInt(limit)
        })
        await Promise.all(mySavedVlogs.map(async ({ vlog }) => {
            const likeCount = await prisma.reactVlog.count({
                where: {
                    vlogId: vlog.id,
                    createByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const commentCount = await prisma.commentVlog.count({
                where: {
                    vlogId: vlog.id,
                    createByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            const saveCount = await prisma.saveVlog.count({
                where: {
                    vlogId: vlog.id,
                    saveByUserId: {
                        notIn: blockedUserIDs
                    }
                }
            })
            vlog.numberOfComments = commentCount;
            vlog.numberOfLikes = likeCount;
            vlog.numberOfSaves = saveCount;
            
        if(vlog.video_url){
            vlog.video_url = `${baseurl}/vlog/${vlog.video_url}`
        }
        if(vlog.thumbnail_url){
            vlog.thumbnail_url = `${baseurl}/vlog/${vlog.thumbnail_url}`
        }
        if(vlog.user.avatar_url){
            vlog.user.avatar_url = `${baseurl}/images/${vlog.user.avatar_url}`
        }
        if(vlog.user.cover_photo_url){
            vlog.user.cover_photo_url = `${baseurl}/images/${vlog.user.cover_photo_url}`
        }

            
        }))
        return res.status(200).json({
            status: 200,
            message: 'My Saved Vlogs',
            success: true,
            mySavedVlogs: mySavedVlogs
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
export async function viewVlog(req, res) {
    try {
        let { vlogId } = req.params;

        vlogId = parseInt(vlogId);
        const vlog = await prisma.vlog.findUnique({
            where: {
                id: vlogId
            }
        })

        if (!vlog) {
            res.status(400).json({
                success: false,
                status: 400,
                message: 'vlog Not Found',
            })
        }
        const alreadyViewed = await prisma.viewVlog.findFirst({
            where: {
                vlogId: vlogId,
                viewByUserId: req.user.id
            }
        })
        if (alreadyViewed) {
            return res.status(200).json({
                status: 200,
                message: 'Already Viewed the vlog',
                success: true,
            })
        }
        else {
            const viewVlog = await prisma.viewVlog.create({
                data: {
                    vlogId: vlogId,
                    viewByUserId: req.user.id
                }
            })
            await prisma.vlog.update({
                where: {
                    id: vlogId
                },
                data: {
                    numberOfViews: vlog.numberOfViews + 1,
                }
            })

            return res.status(200).json({
                status: 200,
                message: 'Viewed the vlog',
                success: true,

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
export async function getVlogById(req, res) {
    try {
        let { vlogId } = req.params;

        vlogId = parseInt(vlogId);

        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);

        const vlog = await prisma.vlog.findUnique({
            where: {
                id: vlogId
            },
            include: {
                user: true
            }
        })
        const checkReact = await prisma.reactVlog.findFirst({
            where: {
                vlogId: vlogId,
                createByUserId: req.user.id
            }
        })
        const checkSaved = await prisma.saveVlog.findFirst({
            where: {
                vlogId: vlogId,
                saveByUserId: req.user.id
            }
        })
        let alreadyLiked = false;

        let alreadySaved = false;
        if (checkReact) {
            alreadyLiked = true
        }
        if (checkSaved) {
            alreadySaved = true
        }

        const likeCount = await prisma.reactVlog.count({
            where: {
                vlogId: vlog.id,
                createByUserId: {
                    notIn: blockedUserIDs
                }
            }
        })
        const commentCount = await prisma.commentVlog.count({
            where: {
                vlogId: vlog.id,
                createByUserId: {
                    notIn: blockedUserIDs
                }
            }
        })
        const saveCount = await prisma.saveVlog.count({
            where: {
                vlogId: vlog.id,
                saveByUserId: {
                    notIn: blockedUserIDs
                }
            }
        })
        const viewCount = await prisma.viewVlog.count({
            where:{
                vlogId:vlog.id,
                viewByUserId:{
                    notIn:blockedUserIDs
                }
            }
        })
        vlog.numberOfComments = commentCount;
        vlog.numberOfLikes = likeCount;
        vlog.numberOfSaves = saveCount;
        vlog.numberOfViews = viewCount;

        if(vlog.video_url){
            vlog.video_url = `${baseurl}/vlog/${vlog.video_url}`
        }
        if(vlog.thumbnail_url){
            vlog.thumbnail_url = `${baseurl}/vlog/${vlog.thumbnail_url}`
        }
        if(vlog.user.avatar_url){
            vlog.user.avatar_url = `${baseurl}/images/${vlog.user.avatar_url}`
        }
        if(vlog.user.cover_photo_url){
            vlog.user.cover_photo_url = `${baseurl}/images/${vlog.user.cover_photo_url}`
        }

        return res.status(200).json({
            status: 200,
            message: 'Blog ',
            success: true,
            vlog: { ...vlog, alreadyLiked, alreadySaved }
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