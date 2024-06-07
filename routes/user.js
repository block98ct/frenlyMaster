import express from "express";
import { blockUser, changePassword, deleteAccount, editProfile, follow, forgotPassword, getAllUsers, getMyBlockedUser, getMyFollowers, getMyProfile, getMySavedUsers, getMySettings, getUser, getUserWhomIFollow, login, saveOrUnSaveProfile, signup, unFollow, updateMySettings, verifyPassword, verifyUserEmail } from "../controllers/userController.js";
import { upload } from "../middlewares/upload.js";
import { auth } from "../middlewares/auth.js";

export const userRouter = express.Router();

userRouter.post('/signup',signup);

userRouter.get('/verifyUser/:id',verifyUserEmail)

userRouter.post('/login',login);

userRouter.post('/forgotPassword', forgotPassword );

userRouter.get('/verifyPassword/:token', verifyPassword);

userRouter.post('/changePassword',changePassword );

userRouter.post('/editProfile',auth, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),editProfile)

// userRouter.post('/test', auth, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), (req, res) => {
//     res.json({
//         user: req.user,
//         body:req.body,
//         avatar: req.files['avatar'][0], // Access uploaded avatar file
//         cover: req.files['cover'][0]    // Access uploaded cover file
//     });
// });

userRouter.get('/',auth,getAllUsers);

userRouter.post('/block/:id',auth,blockUser);

userRouter.post('/follow/:id',auth,follow);

userRouter.post('/unfollow/:id',auth,unFollow);

userRouter.get('/followers',auth,getMyFollowers);

userRouter.get('/followings',auth,getUserWhomIFollow);

userRouter.post('/save/:userId',auth,saveOrUnSaveProfile);

userRouter.get('/saved',auth,getMySavedUsers);

userRouter.get('/blocked',auth,getMyBlockedUser);

userRouter.delete('/',auth,deleteAccount);

userRouter.get('/myProfile',auth,getMyProfile);

userRouter.get('/settings',auth,getMySettings);

userRouter.patch('/settings',auth,updateMySettings)

userRouter.get('/:userId',auth,getUser);
//userRouter.delete('/unblock',auth,unBlockUser);