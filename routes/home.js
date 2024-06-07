import express from "express";
import { auth } from "../middlewares/auth.js";
import { activeFriends, allFriends, discoverUsers, homePage } from "../controllers/homeController.js";


export const homeRouter = express.Router();


homeRouter.get('/',auth,homePage);

homeRouter.get('/active',auth,activeFriends);

homeRouter.get('/discover',auth,discoverUsers);

homeRouter.get('/friends',auth,allFriends);


