import { PrismaClient } from "@prisma/client";
import path from 'path'
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();
const prisma = new PrismaClient();
const baseurl = process.env.BASE_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export async function homePage(req, res) {
    try {
        const userIFollowIds = (await prisma.follow.findMany({
            where: {
                followerId: req.user.id
            }
        })).map(({ followingId }) => followingId);

        const myFollowersIDs = (await prisma.follow.findMany({
            where: {
                followingId: req.user.id
            }
        })).map(({ followerId }) => followerId);

        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);
        const userWithCities = await prisma.user.groupBy({
            by: ['city'],
            where: {
                id: {
                    notIn: [...blockedUserIDs, req.user.id],
                    in: [...userIFollowIds, ...myFollowersIDs]
                }
            },
            _count: {
                id: true
            }, orderBy: {
                _count: {
                    id: 'desc'
                }
            }, take: 3
        });

        console.log(userWithCities)

        const usersInCities = await Promise.all(userWithCities.map(async cityData => {
            const usersInCity = await prisma.user.findMany({
                where: {
                    city: cityData.city,
                    id: {
                        notIn: [...blockedUserIDs, req.user.id],
                        in: [...userIFollowIds, ...myFollowersIDs]
                    }
                },
                select: {
                    id: true,
                    // email: true,
                    // full_name: true,
                    avatar_url: true,
                    country: true
                    // cover_photo_url: true,
                    // createdAt: true,
                    // updatedAt: true
                }
            });
            const usersWithModifiedAvatar = usersInCity.map(user => ({
                ...user,
                avatar_url: user.avatar_url ? `${baseurl}/images/${user.avatar_url}` : null
            }));
            const country = usersInCity.map(({ country }) => country);

            return { city: cityData.city, userCount: usersInCity.length, users: usersWithModifiedAvatar, country: country[0] };
        }));

        const vlogs = await prisma.vlog.findMany({
            where: {
                userId: {
                    notIn: [...blockedUserIDs,req.user.id]
                }
            },
            take: 3
        })

        await Promise.all(vlogs.map((vlog)=>{
            if(vlog.video_url){
                vlog.video_url = `${baseurl}/vlog/${vlog.video_url}`
            }
            if(vlog.thumbnail_url){
                vlog.thumbnail_url = `${baseurl}/vlog/${vlog.thumbnail_url}`
            }
        }))

        const blogs = await prisma.blog.findMany({
            where: {
                userId: {
                    notIn: [...blockedUserIDs,req.user.id]
                }
            },
            take: 3
        })

        await Promise.all(blogs.map((blog)=>{
            if(blog.image_url){
                blog.image_url = `${baseurl}/blog/${blog.image_url}`
            }
        }))

        const discoverNewUser = await prisma.user.findMany({
            where: {
                id: {
                    notIn: [...userIFollowIds, req.user.id, ...blockedUserIDs]
                }
            },
            take:3
        })

        await Promise.all(discoverNewUser.map((user)=>{
            if(user.avatar_url)
            {
              user.avatar_url = `${baseurl}/images/${user.avatar_url}`
            }
            if(user.cover_photo_url)
            {
              user.cover_photo_url = `${baseurl}/images/${user.cover_photo_url}`
            }
        }))
        const posts = await prisma.post.findMany({
            where:{
                userId:{
                    notIn:[...blockedUserIDs,req.user.id]
                },
            },
            include:{
                user:{
                    select:{
                        avatar_url:true,
                        cover_photo_url:true,
                        full_name:true,
                        id:true
                    }
                }
            },
            take:3
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
        // const friends = await prisma.user.findMany({
        //     where: {
        //         id: {
        //             notIn:[...blockedUserIDs,req.user.id],
        //             in: [...userIFollowIds, ...myFollowersIDs]
        //         }
        //     }
        // })

        return res.status(200).json({
            success: true,
            message: "Data Fetched",
            status: 200,
            usersInCities: usersInCities,
            vlogs: vlogs,
            blogs: blogs,
            discoverUsers: discoverNewUser,
            // friends: friends,
            posts:posts
        })
    } catch ({ error }) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            status: 500,
            error: error
        })
    }
}
export async function activeFriends(req, res) {
    try {
        const { page = 1, limit = 10 } = req.query;
        const userIFollowIds = (await prisma.follow.findMany({
            where: {
                followerId: req.user.id
            }
        })).map(({ followingId }) => followingId);

        const myFollowersIDs = (await prisma.follow.findMany({
            where: {
                followingId: req.user.id
            }
        })).map(({ followerId }) => followerId);

        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);
        const userWithCities = await prisma.user.groupBy({
            by: ['city'],
            where: {
                id: {
                    notIn: [...blockedUserIDs, req.user.id],
                    in: [...userIFollowIds, ...myFollowersIDs]
                }
            },
            _count: {
                id: true
            }, orderBy: {
                _count: {
                    id: 'desc'
                }
            }, skip: parseInt((page - 1) * limit), take: parseInt(limit),
        });

        const usersInCities = await Promise.all(userWithCities.map(async cityData => {
            const usersInCity = await prisma.user.findMany({
                where: {
                    city: cityData.city,
                    id: {
                        notIn: [...blockedUserIDs, req.user.id],
                        in: [...userIFollowIds, ...myFollowersIDs]
                    }
                },
                select: {
                    id: true,
                    // email: true,
                    // full_name: true,
                    avatar_url: true,
                    country: true
                    // cover_photo_url: true,
                    // createdAt: true,
                    // updatedAt: true
                }
            });

            const usersWithModifiedAvatar = usersInCity.map(user => ({
                ...user,
                avatar_url: user.avatar_url ? `${baseurl}/images/${user.avatar_url}` : null
            }));
            const country = usersInCity.map(({ country }) => country);

            return { city: cityData.city, userCount: usersInCity.length, users: usersWithModifiedAvatar, country: country[0] };
        }));

        return res.status(200).json({
            success: true,
            status: 200,
            message: "Active Friends",
            activeFriends: usersInCities,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            status: 500,
            message: "Internal Server Error",
            error: error,
        })
    }

}

export async function discoverUsers(req, res) {
    try {
        const { page = 1, limit = 10 } = req.query;
        const userIFollowIds = (await prisma.follow.findMany({
            where: {
                followerId: req.user.id
            }
        })).map(({ followingId }) => followingId);

        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);

        const discoverNewUser = await prisma.user.findMany({
            where: {
                id: {
                    notIn: [...userIFollowIds, req.user.id, ...blockedUserIDs]
                }
            }, skip: parseInt((page - 1) * limit), take: parseInt(limit),
        })
        await Promise.all(discoverNewUser.map((newUser)=>{
            if(newUser.avatar_url)
            {
                newUser.avatar_url = `${baseurl}/images/${newUser.avatar_url}`
            }
            if(newUser.cover_photo_url){
                newUser.cover_photo_url= `${baseurl}/images/${newUser.cover_photo_url}`
            }

        }))
        return res.status(200).json({
            success: true,
            status: 200,
            message: "Discover Users",
            discoverUsers: discoverNewUser,
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            status: 500,
            message: "Internal Server Error",
            error: error,
        })
    }
}

export async function allFriends(req,res) {
    try {
        const { search, page = 1, limit = 10,city } = req.query;
        const userIFollowIds = (await prisma.follow.findMany({
            where: {
                followerId: req.user.id
            }
        })).map(({ followingId }) => followingId);
    
        const myFollowersIDs = (await prisma.follow.findMany({
            where: {
                followingId: req.user.id
            }
        })).map(({ followerId }) => followerId);
    
        const blockedUserIDs = (await prisma.userBlocked.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                userBlockedId: true,
            }
        })).map((user) => user.userBlockedId);
    
        const friends = await prisma.user.findMany({
            where: {
                id: {
                    notIn:[...blockedUserIDs,req.user.id],
                    in: [...userIFollowIds, ...myFollowersIDs]
                },
                full_name:{
                    contains:search
                },
                city:{
                    contains:city ? city : ''
                },
            },select:{
                id:true,
                full_name:true,
                avatar_url:true,
                handle:true,
                numberOfFollower:true
            },skip: parseInt((page - 1) * limit), take: parseInt(limit)
        })
        await Promise.all(friends.map(async(friend)=>{
            console.log(friend)
            const numberOfFollower = await prisma.follow.count({
                where:{
                    followingId:friend.id,
                    followerId:{
                        notIn:blockedUserIDs
                    }
                }
            })
            console.log(friend.id,numberOfFollower)
            friend.numberOfFollower = numberOfFollower;
            if(friend.avatar_url){
                friend.avatar_url = `${baseurl}/images/${friend.avatar_url}`
            }
            return friend;
        }))
    
        return res.status(200).json({
            success: true,
            status: 200,
            message: "My Friends",
            friends: friends,
        })  
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            status: 500,
            message: "Internal Server Error",
            error: error,
        })
    }
    
}
