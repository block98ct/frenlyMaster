import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import FCM from 'fcm-node';

// const serverKey = 'YOURSERVERKEYHERE'; // Put your server key here
const fcm = new FCM("AAAAtQERNHM:APA91bGCk3MM1c_558Xw7rkNNH9u_oICUO-PYronpBz51gi2uEUcjt5bw-wRxHYeDAN7Bdkb_uhWYw-LHKQF-iDtqvTXzwSIKUXpsrkwaf6DYUXIuwewFI5lFoZfrnYTLhRXS2BOsv0E");
export async function sendNotificationRelateToVlog(params) {
    console.log("here ")
    const userSetting = await prisma.userSetting.findFirst({
        where: {
            userId: params.toUserId
        }
    });
    if(userSetting===null)
    {
        await prisma.userSetting.create({
            data:{
                userId:params.toUserId,
            }
        })
    }
    const updateUserSetting = await prisma.userSetting.findFirst({
        where:{
            userId:params.toUserId
        }
    })
    console.log(updateUserSetting.feedNotification)
    if (!updateUserSetting.feedNotification) {
        console.log("User has not allowed  feed notifications")
        return;
    }
    if (params.token === null) {
        console.log("User does not have fcm token")
        return;
    }
    console.log("till here ")
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: params.token,
        collapse_key: 'your_collapse_key',

        notification: {
            title: 'Feed notification',
            body: `${params.body}`,
        },

        data: {  //you can send only notification or only data(or include both)
            vlog_id: params.vlogId,
            // my_another_key: 'my another value',
            // url:url
        },
        click_action: "https://docs.stripe.com/elements/express-checkout-element/migration"

    };

    fcm.send(message, function (err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
}
export async function sendNotificationRelateToBlog(params) {
    console.log("here ")
    const userSetting = await prisma.userSetting.findFirst({
        where: {
            userId: params.toUserId
        }
    });
    if(userSetting===null)
    {
        await prisma.userSetting.create({
            data:{
                userId:params.toUserId,
            }
        })
    }
    const updateUserSetting = await prisma.userSetting.findFirst({
        where:{
            userId:params.toUserId
        }
    })
    console.log(updateUserSetting.feedNotification)
    if (!updateUserSetting.feedNotification) {
        console.log("User has not allowed  feed notifications")
        return;
    }
    if (params.token === null) {
        console.log("User does not have fcm token")
        return;
    }
    console.log("till here ")
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: params.token,
        collapse_key: 'your_collapse_key',

        notification: {
            title: 'Feed notification',
            body: `${params.body}`,
        },

        data: {  //you can send only notification or only data(or include both)
            blog_id: params.blogId,
            // my_another_key: 'my another value',
            // url:url
        },
        click_action: "https://docs.stripe.com/elements/express-checkout-element/migration"

    };

    fcm.send(message, function (err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
}
export async function sendNotificationRelateToPost(params) {
    console.log("here ")
    const userSetting = await prisma.userSetting.findFirst({
        where: {
            userId: params.toUserId
        }
    });
    if(userSetting===null)
    {
        await prisma.userSetting.create({
            data:{
                userId:params.toUserId,
            }
        })
    }
    const updateUserSetting = await prisma.userSetting.findFirst({
        where:{
            userId:params.toUserId
        }
    })
    console.log(updateUserSetting.feedNotification)
    if (!updateUserSetting.feedNotification) {
        console.log("User has not allowed  feed notifications")
        return;
    }
    if (params.token === null) {
        console.log("User does not have fcm token")
        return;
    }
    console.log("till here ")
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: params.token,
        collapse_key: 'your_collapse_key',

        notification: {
            title: 'Feed notification',
            body: `${params.body}`,
        },

        data: {  //you can send only notification or only data(or include both)
            post_id: params.postId,
            // my_another_key: 'my another value',
            // url:url
        },
        click_action: "https://docs.stripe.com/elements/express-checkout-element/migration"

    };

    fcm.send(message, function (err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
}
export async function sendNotificationRelateToMessage(params) {

    const userSetting = await prisma.userSetting.findFirst({
        where: {
            userId: params.toUserId
        }
    });
    if(userSetting===null)
    {
        await prisma.userSetting.create({
            data:{
                userId:params.toUserId,
            }
        })
    }
    const updateUserSetting = await prisma.userSetting.findFirst({
        where:{
            userId:params.toUserId
        }
    })
    console.log(updateUserSetting.feedNotification)
    if (!updateUserSetting.feedNotification) {
        console.log("User has not allowed  feed notifications")
        return;
    }
    if (params.token === null) {
        console.log("User does not have fcm token")
        return;
    }
    console.log("till here ")
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: params.token,
        collapse_key: 'your_collapse_key',

        notification: {
            title: 'Chat notification',
            body: `${params.body}`,
        },

        data: {  //you can send only notification or only data(or include both)
            chat_id: params.chatId,
            // my_another_key: 'my another value',
            // url:url
        },
        click_action: "https://docs.stripe.com/elements/express-checkout-element/migration"

    };

    fcm.send(message, function (err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
}
export async function createNormalNotification(params) {
    try {
        const data = {
            toUserId: params.toUserId,
            byUserId: params.byUserId,
            data: params.data,
            content: params.content
        }
        const notification = await prisma.notification.create({
            data: data
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
